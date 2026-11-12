import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

import { processPropertyQuery } from './src/lib/chatEngine';
import {
  evaluateResponse,
  extractRecommendedUnitsFromText,
  PilotCase,
  Unit,
  FinancialGroundTruthCase,
  EvalScore,
} from './benchmark/evaluator';
import { KERUEN_CATALOG_SNAPSHOT } from './src/lib/catalogSnapshot';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

if (!GROQ_API_KEY) {
  console.error('FATAL: GROQ_API_KEY is not defined in .env.local or environment.');
  process.exit(1);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

import crypto from 'crypto';

interface GroqResponse {
  text: string;
  rawJson?: any;
  recommendedUnits: string[];
  calculation?: any;
  latencyMs: number;
  statusCode: number;
  modelUsed: string;
  isFallback: boolean;
  timestamp: string;
}

async function callGroqAPI(
  model: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  jsonMode: boolean = false
): Promise<{ text: string; statusCode: number; latencyMs: number; modelUsed: string; isFallback: boolean }> {
  const maxRetries = 6;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const bodyPayload: any = {
        model,
        messages,
        temperature: 0.1,
        max_tokens: 800,
      };
      if (jsonMode) {
        bodyPayload.response_format = { type: 'json_object' };
      }

      const reqStart = Date.now();
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });
      const reqLatency = Date.now() - reqStart;

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        if (res.status === 429) {
          let waitMs = 5000;
          const matchSec = errorText.match(/try again in ([0-9.]+)s/i);
          if (matchSec) {
            waitMs = Math.ceil(parseFloat(matchSec[1]) * 1000) + 1500;
          }
          console.warn(`[Groq 429 Rate Limit] (${model}) Waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}...`);
          await sleep(waitMs);
          continue;
        }

        if (res.status >= 500) {
          const waitMs = (attempt + 1) * 3000;
          console.warn(`[Groq ${res.status}] Waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}...`);
          await sleep(waitMs);
          continue;
        }

        return { text: `Error ${res.status}: ${errorText}`, statusCode: res.status, latencyMs: reqLatency, modelUsed: model, isFallback: false };
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      return { text: content, statusCode: 200, latencyMs: reqLatency, modelUsed: model, isFallback: false };
    } catch (err: any) {
      console.warn(`[Groq Network Error] ${model} attempt ${attempt + 1}: ${err?.message}`);
      if (attempt < maxRetries - 1) {
        await sleep(3000);
      } else {
        return { text: `Network error: ${err?.message}`, statusCode: 0, latencyMs: 0, modelUsed: 'error', isFallback: true };
      }
    }
  }

  return { text: 'All retries exhausted', statusCode: 0, latencyMs: 0, modelUsed: 'error', isFallback: true };
}

// 1. Zero-Shot
async function runZeroShot(model: string, query: string): Promise<GroqResponse> {
  const timestamp = new Date().toISOString();
  const messages = [
    {
      role: 'system' as const,
      content:
        'You are an AI sales assistant for real estate in Almaty, Kazakhstan. Answer user questions directly.',
    },
    { role: 'user' as const, content: query },
  ];

  const res = await callGroqAPI(model, messages, false);
  return {
    text: res.text,
    recommendedUnits: [],
    latencyMs: res.latencyMs,
    statusCode: res.statusCode,
    modelUsed: res.modelUsed,
    isFallback: res.isFallback,
    timestamp,
  };
}

// 2. Naive RAG (Prompt Context Dump)
async function runNaiveRAG(model: string, allUnits: Unit[], query: string): Promise<GroqResponse> {
  const timestamp = new Date().toISOString();
  const rawContext = allUnits
    .map(
      (u) =>
        `Unit ${u.code}: Type ${u.type || ''}, Area ${u.areaSqm} sqm, Price ${u.priceMin} KZT, Status: ${u.status}, View: ${u.view || 'N/A'}`
    )
    .join('\n');

  const messages = [
    {
      role: 'system' as const,
      content: `You are a real-estate sales chatbot for Atamura KERUEN in Almaty. Here is the list of ALL apartments in our catalog:\n\n${rawContext}\n\nAnswer the user query based on this list directly. If recommending units, name the unit codes and prices.`,
    },
    { role: 'user' as const, content: query },
  ];

  const res = await callGroqAPI(model, messages, false);
  const activeCodes = extractRecommendedUnitsFromText(res.text, allUnits);

  return {
    text: res.text,
    recommendedUnits: activeCodes,
    latencyMs: res.latencyMs,
    statusCode: res.statusCode,
    modelUsed: res.modelUsed,
    isFallback: res.isFallback,
    timestamp,
  };
}

// 3. Proposed 6-Pipeline Hybrid RAG (Powered by src/lib/chatEngine.ts)
async function runProposed6RAG(model: string, allUnits: Unit[], query: string): Promise<GroqResponse> {
  const timestamp = new Date().toISOString();
  const result = await processPropertyQuery({
    query,
    allUnits: allUnits as any,
    model,
  });

  return {
    text: result.message,
    recommendedUnits: result.recommendedUnits,
    calculation: result.calculation,
    latencyMs: result.latencyMs,
    statusCode: result.modelUsed === 'fallback' ? 503 : 200,
    modelUsed: result.modelUsed,
    isFallback: result.modelUsed === 'fallback',
    timestamp,
  };
}

async function runBenchmarkForModel(
  modelName: string,
  modelLabel: string,
  pilotCases: PilotCase[],
  allUnits: Unit[],
  finGroundTruthList: FinancialGroundTruthCase[]
) {
  console.log(`\n========================================================================`);
  console.log(`  EVALUATING MODEL: ${modelLabel} (${modelName})`);
  console.log(`========================================================================\n`);

  const results: any[] = [];

  for (let i = 0; i < pilotCases.length; i++) {
    const tc = pilotCases[i];
    console.log(`------------------------------------------------------------------------`);
    console.log(`[${i + 1}/${pilotCases.length}] Case: ${tc.id} (${tc.semanticScenarioId}) | Category: ${tc.category.toUpperCase()} | Lang: ${tc.language.toUpperCase()}`);
    console.log(`Query: "${tc.query}"`);
    console.log(`------------------------------------------------------------------------`);

    // 1. Zero-Shot
    process.stdout.write(`  [1/3] Zero-Shot (${modelLabel})... `);
    const zeroShot = await runZeroShot(modelName, tc.query);
    const zeroEval = evaluateResponse(tc, zeroShot, allUnits, finGroundTruthList);
    console.log(`Done (${zeroShot.latencyMs}ms) | CSR: ${zeroEval.csr}% | Faith: ${zeroEval.faithfulness}% | Refusal: ${zeroEval.refusal}% | FinAcc: ${zeroEval.financialAccuracy ?? 'N/A'}`);
    await sleep(1500);

    // 2. Naive RAG
    process.stdout.write(`  [2/3] Naive RAG (Prompt Dump)...  `);
    const naiveRAG = await runNaiveRAG(modelName, allUnits, tc.query);
    const naiveEval = evaluateResponse(tc, naiveRAG, allUnits, finGroundTruthList);
    console.log(`Done (${naiveRAG.latencyMs}ms) | CSR: ${naiveEval.csr}% | Faith: ${naiveEval.faithfulness}% | Refusal: ${naiveEval.refusal}% | FinAcc: ${naiveEval.financialAccuracy ?? 'N/A'}`);
    await sleep(1500);

    // 3. Proposed 6-Pipeline Hybrid RAG
    process.stdout.write(`  [3/3] Proposed 6-Pipeline RAG...  `);
    const proposed = await runProposed6RAG(modelName, allUnits, tc.query);
    const proposedEval = evaluateResponse(tc, proposed, allUnits, finGroundTruthList);
    console.log(`Done (${proposed.latencyMs}ms) | CSR: ${proposedEval.csr}% | Faith: ${proposedEval.faithfulness}% | Refusal: ${proposedEval.refusal}% | FinAcc: ${proposedEval.financialAccuracy ?? 'N/A'}`);
    await sleep(1500);

    results.push({
      caseId: tc.id,
      semanticScenarioId: tc.semanticScenarioId,
      category: tc.category,
      language: tc.language,
      query: tc.query,
      zeroShot: {
        text: zeroShot.text,
        recommendedUnits: zeroShot.recommendedUnits,
        latencyMs: zeroShot.latencyMs,
        statusCode: zeroShot.statusCode,
        modelUsed: zeroShot.modelUsed,
        isFallback: zeroShot.isFallback,
        timestamp: zeroShot.timestamp,
        eval: zeroEval,
      },
      naiveRAG: {
        text: naiveRAG.text,
        recommendedUnits: naiveRAG.recommendedUnits,
        latencyMs: naiveRAG.latencyMs,
        statusCode: naiveRAG.statusCode,
        modelUsed: naiveRAG.modelUsed,
        isFallback: naiveRAG.isFallback,
        timestamp: naiveRAG.timestamp,
        eval: naiveEval,
      },
      proposed6RAG: {
        text: proposed.text,
        recommendedUnits: proposed.recommendedUnits,
        calculation: proposed.calculation,
        latencyMs: proposed.latencyMs,
        statusCode: proposed.statusCode,
        modelUsed: proposed.modelUsed,
        isFallback: proposed.isFallback,
        timestamp: proposed.timestamp,
        eval: proposedEval,
      },
    });

    console.log('');
  }

  const calcStats = (runs: { eval: EvalScore; latencyMs: number }[]) => {
    const csrPass = runs.filter((r) => r.eval.csr === 100).length;
    const csrTotal = runs.length;
    const csrPct = +( (csrPass / csrTotal) * 100 ).toFixed(1);

    const faithPass = runs.filter((r) => r.eval.faithfulness === 100).length;
    const faithTotal = runs.length;
    const faithPct = +( (faithPass / faithTotal) * 100 ).toFixed(1);

    const refusalRuns = runs.filter((r) => r.eval.refusal !== null);
    const refusalPass = refusalRuns.filter((r) => r.eval.refusal === 100).length;
    const refusalTotal = refusalRuns.length;
    const refusalPct = refusalTotal > 0 ? +( (refusalPass / refusalTotal) * 100 ).toFixed(1) : 'N/A';

    const finRuns = runs.filter((r) => r.eval.financialAccuracy !== null);
    const finPass = finRuns.filter((r) => r.eval.financialAccuracy === 100).length;
    const finTotal = finRuns.length;
    const finPct = finTotal > 0 ? +( (finPass / finTotal) * 100 ).toFixed(1) : 'N/A';

    const avgLatency = +(runs.reduce((a, b) => a + b.latencyMs, 0) / runs.length).toFixed(1);

    return {
      csr: csrPct,
      csrCount: `${csrPass}/${csrTotal}`,
      faithfulness: faithPct,
      faithfulnessCount: `${faithPass}/${faithTotal}`,
      refusal: refusalPct,
      refusalCount: `${refusalPass}/${refusalTotal}`,
      financialAccuracy: finPct,
      financialCount: `${finPass}/${finTotal}`,
      latencyMs: avgLatency,
    };
  };

  const summary = {
    model: modelName,
    modelLabel,
    totalCases: pilotCases.length,
    applicableRefusalCases: results.filter((r) => r.proposed6RAG.eval.refusal !== null).length,
    applicableFinancialCases: results.filter((r) => r.proposed6RAG.eval.financialAccuracy !== null).length,
    zeroShot: calcStats(results.map((r) => ({ eval: r.zeroShot.eval, latencyMs: r.zeroShot.latencyMs }))),
    naiveRAG: calcStats(results.map((r) => ({ eval: r.naiveRAG.eval, latencyMs: r.naiveRAG.latencyMs }))),
    proposed6RAG: calcStats(results.map((r) => ({ eval: r.proposed6RAG.eval, latencyMs: r.proposed6RAG.latencyMs }))),
  };

  console.log(`\n>>> SUMMARY RESULTS FOR ${modelLabel} (${modelName}) <<<`);
  console.table({
    [`Zero-Shot (${modelLabel})`]: {
      'CSR': `${summary.zeroShot.csr}% (${summary.zeroShot.csrCount})`,
      'Faithfulness': `${summary.zeroShot.faithfulness}% (${summary.zeroShot.faithfulnessCount})`,
      'Refusal Acc.': `${summary.zeroShot.refusal}% (${summary.zeroShot.refusalCount})`,
      'Financial Acc.': `${summary.zeroShot.financialAccuracy}% (${summary.zeroShot.financialCount})`,
      'Avg Latency': `${summary.zeroShot.latencyMs} ms`,
    },
    [`Naive RAG (${modelLabel})`]: {
      'CSR': `${summary.naiveRAG.csr}% (${summary.naiveRAG.csrCount})`,
      'Faithfulness': `${summary.naiveRAG.faithfulness}% (${summary.naiveRAG.faithfulnessCount})`,
      'Refusal Acc.': `${summary.naiveRAG.refusal}% (${summary.naiveRAG.refusalCount})`,
      'Financial Acc.': `${summary.naiveRAG.financialAccuracy}% (${summary.naiveRAG.financialCount})`,
      'Avg Latency': `${summary.naiveRAG.latencyMs} ms`,
    },
    [`Proposed 6-Pipeline RAG (${modelLabel})`]: {
      'CSR': `${summary.proposed6RAG.csr}% (${summary.proposed6RAG.csrCount})`,
      'Faithfulness': `${summary.proposed6RAG.faithfulness}% (${summary.proposed6RAG.faithfulnessCount})`,
      'Refusal Acc.': `${summary.proposed6RAG.refusal}% (${summary.proposed6RAG.refusalCount})`,
      'Financial Acc.': `${summary.proposed6RAG.financialAccuracy}% (${summary.proposed6RAG.financialCount})`,
      'Avg Latency': `${summary.proposed6RAG.latencyMs} ms`,
    },
  });

  return { summary, results };
}

async function main() {
  console.log('========================================================================');
  console.log('  ATAMURA GROUP: EMPIRICAL BENCHMARK EVALUATION ON GROQ LPU ENGINE       ');
  console.log('  Comparing: Zero-Shot vs Naive RAG vs Proposed 6-Pipeline Hybrid RAG   ');
  console.log('========================================================================\n');

  // Load Database Units
  console.log('Connecting to Neon PostgreSQL Database...');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  let allUnits: Unit[] = [];
  try {
    allUnits = (await prisma.unit.findMany({ orderBy: { code: 'asc' } })) as any;
    if (allUnits.length === 0) {
      allUnits = KERUEN_CATALOG_SNAPSHOT;
    }
    console.log(`Database connected: Loaded ${allUnits.length} active units from KERUEN complex.\n`);
  } catch (err) {
    console.warn('Failed to query Neon DB, falling back to KERUEN_CATALOG_SNAPSHOT:', err);
    allUnits = KERUEN_CATALOG_SNAPSHOT;
    console.log(`Loaded ${allUnits.length} units from snapshot catalog.`);
  }

  // Load Pilot Cases
  const pilotCasesPath = path.join(__dirname, 'benchmark', 'pilot_12_cases.jsonl');
  const pilotCasesLines = fs.readFileSync(pilotCasesPath, 'utf8').trim().split('\n');
  const pilotCases: PilotCase[] = pilotCasesLines.map((line) => JSON.parse(line));
  console.log(`Loaded ${pilotCases.length} stratified pilot test cases from: ${pilotCasesPath}`);

  // Load Financial Ground Truth
  const finGtPath = path.join(__dirname, 'benchmark', 'financial_ground_truth.json');
  const finGtData = JSON.parse(fs.readFileSync(finGtPath, 'utf8'));
  const finGroundTruthList: FinancialGroundTruthCase[] = finGtData.cases;
  console.log(`Loaded ${finGroundTruthList.length} financial calculation ground truth cases.\n`);

  // Run benchmark for Primary Model: OpenAI GPT-OSS-120B on Groq LPU
  const primaryResult = await runBenchmarkForModel(
    'openai/gpt-oss-120b',
    'OpenAI GPT-OSS-120B',
    pilotCases,
    allUnits,
    finGroundTruthList
  );

  // Run benchmark for Secondary Model: Qwen 3.8 27B on Groq LPU
  const secondaryResult = await runBenchmarkForModel(
    'qwen/qwen3.8-27b',
    'Qwen 3.8 27B',
    pilotCases,
    allUnits,
    finGroundTruthList
  );

  // Comprehensive Export
  const outputData = {
    timestamp: new Date().toISOString(),
    benchmarkPack: 'pilot_12_cases',
    environment: {
      lpuEngine: 'Groq LPUs (Language Processing Units)',
      modelsTested: ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'],
      database: 'Neon PostgreSQL (Cloud Serverless)',
    },
    summaryTable: {
      primary_gpt_oss_120b: primaryResult.summary,
      secondary_qwen_27b: secondaryResult.summary,
    },
    detailedRuns: {
      primary_gpt_oss_120b: primaryResult.results,
      secondary_qwen_27b: secondaryResult.results,
    },
  };

  const outFilePath = path.join(__dirname, 'benchmark', 'benchmark_results_groq.json');
  const liveRunPath = path.join(__dirname, 'benchmark', 'live_benchmark_run_2026-11-13.json');
  const jsonContent = JSON.stringify(outputData, null, 2);
  fs.writeFileSync(outFilePath, jsonContent, 'utf8');
  fs.writeFileSync(liveRunPath, jsonContent, 'utf8');

  const sha256 = crypto.createHash('sha256').update(jsonContent).digest('hex');
  console.log(`\n========================================================================`);
  console.log(`Empirical benchmark results successfully saved to:`);
  console.log(`  1. ${outFilePath}`);
  console.log(`  2. ${liveRunPath}`);
  console.log(`SHA-256 Provenance Hash: ${sha256}`);
  console.log(`========================================================================\n`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error('Benchmark execution failed:', err);
  process.exit(1);
});

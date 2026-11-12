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

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

if (!GROQ_API_KEY) {
  console.error('FATAL: GROQ_API_KEY is not defined in .env.local or environment.');
  process.exit(1);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface GroqResponse {
  text: string;
  rawJson?: any;
  recommendedUnits: string[];
  calculation?: any;
  latencyMs: number;
  statusCode: number;
}

async function callGroqAPI(
  model: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  jsonMode: boolean = false
): Promise<{ text: string; statusCode: number; latencyMs: number }> {
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

        return { text: `Error ${res.status}: ${errorText}`, statusCode: res.status, latencyMs: reqLatency };
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      return { text: content, statusCode: 200, latencyMs: reqLatency };
    } catch (err: any) {
      console.warn(`[Groq Network Error] ${model} attempt ${attempt + 1}: ${err?.message}`);
      if (attempt < maxRetries - 1) {
        await sleep(3000);
      } else {
        return { text: `Network error: ${err?.message}`, statusCode: 0, latencyMs: 0 };
      }
    }
  }

  return { text: 'All retries exhausted', statusCode: 0, latencyMs: 0 };
}

// 1. Zero-Shot
async function runZeroShot(model: string, query: string): Promise<GroqResponse> {
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
  };
}

// 2. Naive RAG (Prompt Context Dump)
async function runNaiveRAG(model: string, allUnits: Unit[], query: string): Promise<GroqResponse> {
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
  };
}

// 3. Proposed 6-Pipeline Hybrid RAG (Powered by src/lib/chatEngine.ts)
async function runProposed6RAG(model: string, allUnits: Unit[], query: string): Promise<GroqResponse> {
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
    statusCode: 200,
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
        eval: zeroEval,
      },
      naiveRAG: {
        text: naiveRAG.text,
        recommendedUnits: naiveRAG.recommendedUnits,
        latencyMs: naiveRAG.latencyMs,
        eval: naiveEval,
      },
      proposed6RAG: {
        text: proposed.text,
        recommendedUnits: proposed.recommendedUnits,
        calculation: proposed.calculation,
        latencyMs: proposed.latencyMs,
        eval: proposedEval,
      },
    });

    console.log('');
  }

  const avg = (nums: number[]) => +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
  const avgNullable = (nums: (number | null)[]): number | string => {
    const valid = nums.filter((n): n is number => n !== null);
    if (valid.length === 0) return 'N/A';
    return +(valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
  };

  const summary = {
    model: modelName,
    modelLabel,
    totalCases: pilotCases.length,
    zeroShot: {
      csr: avg(results.map((r) => r.zeroShot.eval.csr)),
      faithfulness: avg(results.map((r) => r.zeroShot.eval.faithfulness)),
      refusal: avg(results.map((r) => r.zeroShot.eval.refusal)),
      financialAccuracy: avgNullable(results.map((r) => r.zeroShot.eval.financialAccuracy)),
      latencyMs: avg(results.map((r) => r.zeroShot.latencyMs)),
    },
    naiveRAG: {
      csr: avg(results.map((r) => r.naiveRAG.eval.csr)),
      faithfulness: avg(results.map((r) => r.naiveRAG.eval.faithfulness)),
      refusal: avg(results.map((r) => r.naiveRAG.eval.refusal)),
      financialAccuracy: avgNullable(results.map((r) => r.naiveRAG.eval.financialAccuracy)),
      latencyMs: avg(results.map((r) => r.naiveRAG.latencyMs)),
    },
    proposed6RAG: {
      csr: avg(results.map((r) => r.proposed6RAG.eval.csr)),
      faithfulness: avg(results.map((r) => r.proposed6RAG.eval.faithfulness)),
      refusal: avg(results.map((r) => r.proposed6RAG.eval.refusal)),
      financialAccuracy: avgNullable(results.map((r) => r.proposed6RAG.eval.financialAccuracy)),
      latencyMs: avg(results.map((r) => r.proposed6RAG.latencyMs)),
    },
  };

  console.log(`\n>>> SUMMARY RESULTS FOR ${modelLabel} (${modelName}) <<<`);
  console.table({
    [`Zero-Shot (${modelLabel})`]: {
      'Constraint Sat. (CSR)': `${summary.zeroShot.csr}%`,
      'Faithfulness (Grounding)': `${summary.zeroShot.faithfulness}%`,
      'Refusal Acc. (Anti-Halusinasi)': `${summary.zeroShot.refusal}%`,
      'Financial Calc Accuracy': `${summary.zeroShot.financialAccuracy}%`,
      'Avg Latency': `${summary.zeroShot.latencyMs} ms`,
    },
    [`Naive RAG (${modelLabel})`]: {
      'Constraint Sat. (CSR)': `${summary.naiveRAG.csr}%`,
      'Faithfulness (Grounding)': `${summary.naiveRAG.faithfulness}%`,
      'Refusal Acc. (Anti-Halusinasi)': `${summary.naiveRAG.refusal}%`,
      'Financial Calc Accuracy': `${summary.naiveRAG.financialAccuracy}%`,
      'Avg Latency': `${summary.naiveRAG.latencyMs} ms`,
    },
    [`Proposed 6-Pipeline RAG (${modelLabel})`]: {
      'Constraint Sat. (CSR)': `${summary.proposed6RAG.csr}%`,
      'Faithfulness (Grounding)': `${summary.proposed6RAG.faithfulness}%`,
      'Refusal Acc. (Anti-Halusinasi)': `${summary.proposed6RAG.refusal}%`,
      'Financial Calc Accuracy': `${summary.proposed6RAG.financialAccuracy}%`,
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
    console.log(`Database connected: Loaded ${allUnits.length} active units from KERUEN complex.\n`);
  } catch (err) {
    console.error('Failed to query Neon DB, falling back to catalog seed:', err);
    const seedPath = path.join(__dirname, 'benchmark', 'catalog_snapshot_seed.json');
    if (fs.existsSync(seedPath)) {
      allUnits = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      console.log(`Loaded ${allUnits.length} units from snapshot seed.`);
    }
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
  fs.writeFileSync(outFilePath, JSON.stringify(outputData, null, 2), 'utf8');
  console.log(`\n========================================================================`);
  console.log(`Empirical benchmark results successfully saved to:\n${outFilePath}`);
  console.log(`========================================================================\n`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error('Benchmark execution failed:', err);
  process.exit(1);
});

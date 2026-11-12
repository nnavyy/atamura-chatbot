import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { filterUnits, extractCriteria } from './src/lib/rules';
import { buildSystemPrompt, buildUnitContext } from './src/lib/knowledgeBase';
import { classifyIntent, extractEntities } from './src/lib/intentClassifier';
import { scoreLead } from './src/lib/leadScoring';
import { detectLanguage } from './src/lib/i18n';
import { geminiProvider } from './src/lib/gemini';
import fs from 'fs';
import path from 'path';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface TestCase {
  id: string;
  category: 'budget_constraint' | 'sold_unit_refusal' | 'financial_calc' | 'premium_unit' | 'out_of_scope';
  query: string;
  budgetLimit?: number;
  expectedExcludedUnits?: string[];
  expectedAllowedUnits?: string[];
  mustRefuseSoldUnit?: boolean;
  expectedPricingFactual?: { unit: string; price: number }[];
}

const testCases: TestCase[] = [
  {
    id: 'TC-01',
    category: 'budget_constraint',
    query: 'Saya mencari apartemen dengan budget maksimal 15 juta Tenge. Tolong rekomendasikan unit yang cocok dan sebutkan harganya.',
    budgetLimit: 15_000_000,
    expectedAllowedUnits: ['1A', '1B', '1V'],
    expectedExcludedUnits: ['2A', '2B', '2V', '3A', '3B'],
    expectedPricingFactual: [{ unit: '1B', price: 12_000_000 }, { unit: '1A', price: 13_749_400 }],
  },
  {
    id: 'TC-02',
    category: 'sold_unit_refusal',
    query: 'Saya sangat tertarik dengan Unit 3B yang 3 kamar tidur. Apakah unit 3B ini masih tersedia untuk saya pesan sekarang?',
    mustRefuseSoldUnit: true,
    expectedExcludedUnits: ['3B'],
  },
  {
    id: 'TC-03',
    category: 'financial_calc',
    query: 'Berapa simulasi cicilan untuk Unit 1A seharga 13.749.400 Tenge jika saya ambil program cicilan pengembang 36 bulan dengan DP 30%?',
    expectedPricingFactual: [{ unit: '1A', price: 13_749_400 }],
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runZeroShot(genAI: GoogleGenerativeAI, query: string): Promise<{ text: string; latencyMs: number }> {
  const start = Date.now();
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(
      `You are an AI assistant. Answer the user's real-estate question directly:\n\nUser: ${query}`
    );
    return { text: result.response.text(), latencyMs: Date.now() - start };
  } catch (err) {
    return { text: `Error: ${err}`, latencyMs: Date.now() - start };
  }
}

async function runNaiveRAG(genAI: GoogleGenerativeAI, allUnits: any[], query: string): Promise<{ text: string; latencyMs: number }> {
  const start = Date.now();
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const rawContext = allUnits.map(u => 
      `Unit ${u.code}: Type ${u.type}, Area ${u.areaSqm} sqm, Price ${u.priceMin} KZT, Status: ${u.status}, View: ${u.view}`
    ).join('\n');

    const prompt = `You are a real-estate sales chatbot for Atamura KERUEN in Almaty. Here is the list of ALL apartments:\n\n${rawContext}\n\nAnswer the user query based on this list:\nUser: ${query}`;
    const result = await model.generateContent(prompt);
    return { text: result.response.text(), latencyMs: Date.now() - start };
  } catch (err) {
    return { text: `Error: ${err}`, latencyMs: Date.now() - start };
  }
}

async function runProposed6RAG(allUnits: any[], query: string): Promise<{ text: string; recommendedUnits: string[]; calculation?: any; latencyMs: number }> {
  const start = Date.now();
  try {
    // 1. Language & Intent
    const language = detectLanguage(query);
    const preClassification = classifyIntent(query);
    const entities = extractEntities(query);

    // 2. Relational DB (allUnits passed)
    // 3. Rule-based deterministic filter
    const criteria = extractCriteria(entities);
    const relevantUnits = filterUnits(allUnits, criteria);

    // 4. Prompt Builder with financial & domain grounding
    const systemPrompt = buildSystemPrompt();
    const unitContext = buildUnitContext(relevantUnits.length > 0 ? relevantUnits : allUnits);

    // 5. Guardrailed Gemini LLM
    const llmResponse = await geminiProvider.generateResponse(
      [{ role: 'user', content: query }],
      systemPrompt,
      unitContext
    );

    // 6. Lead scoring calculation
    const scoreResult = scoreLead([{ role: 'user', content: query, sessionId: 'test', id: '1', createdAt: new Date() } as any]);

    return {
      text: llmResponse.message,
      recommendedUnits: llmResponse.recommendedUnits || [],
      calculation: llmResponse.calculation,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return { text: `Error: ${err}`, recommendedUnits: [], latencyMs: Date.now() - start };
  }
}

function evaluateRun(tc: TestCase, text: string, recommendedUnits: string[], allUnits: any[]) {
  const lowerText = text.toLowerCase();
  
  // 1. Constraint Satisfaction Rate (CSR)
  let csrPass = true;
  if (tc.budgetLimit) {
    const tolerance = tc.budgetLimit * 1.2;
    for (const u of allUnits) {
      if (u.priceMin > tolerance) {
        // If explicitly recommended as an option within budget
        const mentionedAsRec = recommendedUnits.includes(u.code) || 
          (lowerText.includes(`unit ${u.code.toLowerCase()}`) && !lowerText.includes('melebihi') && !lowerText.includes('exceed'));
        if (mentionedAsRec) {
          csrPass = false;
        }
      }
    }
  }
  // Check sold unit constraint
  if (tc.expectedExcludedUnits?.includes('3B')) {
    if (recommendedUnits.includes('3B') || (lowerText.includes('3b') && !lowerText.includes('terjual') && !lowerText.includes('sold') && !lowerText.includes('habis') && !lowerText.includes('tidak tersedia') && !lowerText.includes('продан'))) {
      csrPass = false;
    }
  }

  // 2. Refusal Accuracy (Anti-Halusinasi)
  let refusalPass = true;
  if (tc.mustRefuseSoldUnit) {
    const correctlyRefused = lowerText.includes('terjual') || lowerText.includes('sold') || 
      lowerText.includes('habis') || lowerText.includes('tidak tersedia') || lowerText.includes('продан');
    const offeredAsAvailable = recommendedUnits.includes('3B') || (lowerText.includes('tersedia') && !lowerText.includes('tidak tersedia'));
    refusalPass = correctlyRefused && !offeredAsAvailable;
  }
  if (tc.category === 'out_of_scope') {
    refusalPass = lowerText.includes('atamura') || lowerText.includes('keruen') || lowerText.includes('almaty') || lowerText.includes('tidak') || lowerText.includes('hanya');
  }

  // 3. Faithfulness (Factual Grounding)
  let faithfulnessPass = true;
  if (tc.expectedPricingFactual) {
    for (const ep of tc.expectedPricingFactual) {
      const priceStr1 = ep.price.toLocaleString('id-ID');
      const priceStr2 = ep.price.toLocaleString('ru-RU');
      const priceStr3 = ep.price.toString();
      const priceK = (ep.price / 1_000_000).toFixed(1);
      const priceInt = Math.floor(ep.price / 1_000_000).toString();

      const mentionedPrice = lowerText.includes(priceStr1) || lowerText.includes(priceStr2) || 
        lowerText.includes(priceStr3) || lowerText.includes(priceK) || lowerText.includes(`${priceInt} juta`) || lowerText.includes(`${priceInt} млн`);
      
      if (!mentionedPrice && lowerText.includes(ep.unit.toLowerCase())) {
        faithfulnessPass = false;
      }
    }
  }

  return {
    csr: csrPass ? 100 : 0,
    refusal: refusalPass ? 100 : 0,
    faithfulness: faithfulnessPass ? 100 : 0,
  };
}

async function main() {
  console.log('========================================================================');
  console.log('  ATAMURA GROUP AI BENCHMARK EVALUATION: ZERO-SHOT vs NAIVE vs 6-PIPELINE');
  console.log('========================================================================\n');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  
  console.log('Connecting to Neon PostgreSQL Database...');
  const allUnits = await prisma.unit.findMany({ orderBy: { code: 'asc' } });
  console.log(`Database connected successfully: Loaded ${allUnits.length} active units from KERUEN complex.\n`);

  const results: any[] = [];

  for (const tc of testCases) {
    console.log(`------------------------------------------------------------------------`);
    console.log(`Running Test ${tc.id} [${tc.category.toUpperCase()}]`);
    console.log(`Query: "${tc.query}"`);
    console.log(`------------------------------------------------------------------------`);

    // 1. Zero Shot
    process.stdout.write('  [1/3] Executing Zero-Shot LLM (Gemini 2.5 Flash)... ');
    const zeroShot = await runZeroShot(genAI, tc.query);
    const zeroEval = evaluateRun(tc, zeroShot.text, [], allUnits);
    console.log(`Done (${zeroShot.latencyMs} ms) | CSR: ${zeroEval.csr}% | Faithfulness: ${zeroEval.faithfulness}% | Refusal: ${zeroEval.refusal}%`);
    await sleep(13000);

    // 2. Naive RAG
    process.stdout.write('  [2/3] Executing Naive RAG (3-Pipeline Standard)... ');
    const naiveRAG = await runNaiveRAG(genAI, allUnits, tc.query);
    const naiveRecs = allUnits.filter(u => naiveRAG.text.toLowerCase().includes(`unit ${u.code.toLowerCase()}`)).map(u => u.code);
    const naiveEval = evaluateRun(tc, naiveRAG.text, naiveRecs, allUnits);
    console.log(`Done (${naiveRAG.latencyMs} ms) | CSR: ${naiveEval.csr}% | Faithfulness: ${naiveEval.faithfulness}% | Refusal: ${naiveEval.refusal}%`);
    await sleep(13000);

    // 3. Proposed 6-Pipeline Hybrid RAG
    process.stdout.write('  [3/3] Executing Proposed 6-Pipeline Hybrid RAG...   ');
    const proposed = await runProposed6RAG(allUnits, tc.query);
    const proposedEval = evaluateRun(tc, proposed.text, proposed.recommendedUnits, allUnits);
    console.log(`Done (${proposed.latencyMs} ms) | CSR: ${proposedEval.csr}% | Faithfulness: ${proposedEval.faithfulness}% | Refusal: ${proposedEval.refusal}%`);
    await sleep(13000);

    results.push({
      testCase: tc,
      zeroShot: { ...zeroShot, eval: zeroEval },
      naiveRAG: { ...naiveRAG, eval: naiveEval },
      proposed6RAG: { ...proposed, eval: proposedEval },
    });
    console.log('');
  }

  // Summary Metrics
  const avg = (arr: number[]) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);

  const summary = {
    zeroShot: {
      csr: avg(results.map(r => r.zeroShot.eval.csr)),
      faithfulness: avg(results.map(r => r.zeroShot.eval.faithfulness)),
      refusal: avg(results.map(r => r.zeroShot.eval.refusal)),
      latency: avg(results.map(r => r.zeroShot.latencyMs)),
    },
    naiveRAG: {
      csr: avg(results.map(r => r.naiveRAG.eval.csr)),
      faithfulness: avg(results.map(r => r.naiveRAG.eval.faithfulness)),
      refusal: avg(results.map(r => r.naiveRAG.eval.refusal)),
      latency: avg(results.map(r => r.naiveRAG.latencyMs)),
    },
    proposed6RAG: {
      csr: avg(results.map(r => r.proposed6RAG.eval.csr)),
      faithfulness: avg(results.map(r => r.proposed6RAG.eval.faithfulness)),
      refusal: avg(results.map(r => r.proposed6RAG.eval.refusal)),
      latency: avg(results.map(r => r.proposed6RAG.latencyMs)),
    },
  };

  console.log('========================================================================');
  console.log('                       FINAL EMPIRICAL COMPARISON RESULTS               ');
  console.log('========================================================================');
  console.table({
    'Zero-Shot LLM (Gemini 2.5 Flash)': {
      'Constraint Sat. (CSR)': `${summary.zeroShot.csr}%`,
      'Faithfulness (Grounding)': `${summary.zeroShot.faithfulness}%`,
      'Refusal Acc. (Anti-Halusinasi)': `${summary.zeroShot.refusal}%`,
      'Avg Latency': `${summary.zeroShot.latency} ms`,
    },
    'Naive RAG (3-Pipeline)': {
      'Constraint Sat. (CSR)': `${summary.naiveRAG.csr}%`,
      'Faithfulness (Grounding)': `${summary.naiveRAG.faithfulness}%`,
      'Refusal Acc. (Anti-Halusinasi)': `${summary.naiveRAG.refusal}%`,
      'Avg Latency': `${summary.naiveRAG.latency} ms`,
    },
    'Proposed 6-Pipeline Hybrid RAG': {
      'Constraint Sat. (CSR)': `${summary.proposed6RAG.csr}%`,
      'Faithfulness (Grounding)': `${summary.proposed6RAG.faithfulness}%`,
      'Refusal Acc. (Anti-Halusinasi)': `${summary.proposed6RAG.refusal}%`,
      'Avg Latency': `${summary.proposed6RAG.latency} ms`,
    },
  });

  const outJsonPath = path.join(__dirname, 'benchmark_results.json');
  fs.writeFileSync(outJsonPath, JSON.stringify({ summary, details: results }, null, 2));
  console.log(`\nDetailed empirical report saved to: ${outJsonPath}`);
  console.log('Benchmark execution successfully completed!');
}

main().catch(err => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});

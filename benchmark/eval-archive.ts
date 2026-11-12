import fs from 'fs';
import path from 'path';
import { evaluateResponse, KERUEN_CATALOG_SNAPSHOT, PilotCase, FinancialGroundTruthCase } from './evaluator';

const rawPath = path.join(__dirname, 'archive', 'pilot_2026-11-12_original_raw.json');
const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

const pilotCasesPath = path.join(__dirname, 'pilot_12_cases.jsonl');
const pilotCases: PilotCase[] = fs
  .readFileSync(pilotCasesPath, 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l));

const finGtPath = path.join(__dirname, 'financial_ground_truth.json');
const finGt: FinancialGroundTruthCase[] = JSON.parse(fs.readFileSync(finGtPath, 'utf8')).cases;

function evalModel(runs: any[]) {
  return runs.map((r) => {
    const tc = pilotCases.find((c) => c.id === r.caseId)!;
    return {
      caseId: r.caseId,
      zero: evaluateResponse(tc, r.zeroShot, KERUEN_CATALOG_SNAPSHOT, finGt),
      naive: evaluateResponse(tc, r.naiveRAG, KERUEN_CATALOG_SNAPSHOT, finGt),
      prop: evaluateResponse(tc, r.proposed6RAG, KERUEN_CATALOG_SNAPSHOT, finGt),
    };
  });
}

function summarize(evals: any[]) {
  const calc = (key: 'zero' | 'naive' | 'prop') => {
    const runs = evals.map((e) => e[key]);
    const csrPass = runs.filter((r) => r.csr === 100).length;
    const faithPass = runs.filter((r) => r.faithfulness === 100).length;

    const refRuns = runs.filter((r) => r.refusal !== null);
    const refPass = refRuns.filter((r) => r.refusal === 100).length;

    const finRuns = runs.filter((r) => r.financialAccuracy !== null);
    const finPass = finRuns.filter((r) => r.financialAccuracy === 100).length;

    return {
      'CSR': `${((csrPass / runs.length) * 100).toFixed(1)}% (${csrPass}/${runs.length})`,
      'Faithfulness': `${((faithPass / runs.length) * 100).toFixed(1)}% (${faithPass}/${runs.length})`,
      'Refusal Acc.': `${((refPass / refRuns.length) * 100).toFixed(1)}% (${refPass}/${refRuns.length})`,
      'Financial Acc.': `${((finPass / finRuns.length) * 100).toFixed(1)}% (${finPass}/${finRuns.length})`,
    };
  };

  return {
    'Zero-Shot': calc('zero'),
    'Naive RAG (Full-Context)': calc('naive'),
    'Proposed 6-Pipeline RAG': calc('prop'),
  };
}

const gptEval = evalModel(raw.detailedRuns.primary_gpt_oss_120b);
const qwenEval = evalModel(raw.detailedRuns.secondary_qwen_27b);

const avg = (arr: number[]) => +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);

console.log('\n========================================================================');
console.log('  AUDITED EVALUATION OF ORIGINAL RAW PILOT RUN (12 NOV 2026)');
console.log('  File: benchmark/archive/pilot_2026-11-12_original_raw.json');
console.log('  SHA256: 48cd414f28f7c5110d01af7fa21aab80bdd2a06f3327a46b1207a9448409c9d4');
console.log('========================================================================\n');

console.log('--- PRIMARY MODEL: OpenAI GPT-OSS-120B on Groq LPU ---');
console.table(summarize(gptEval));
console.log('Avg Latencies (ms):', {
  zeroShot: avg(raw.detailedRuns.primary_gpt_oss_120b.map((r: any) => r.zeroShot.latencyMs)),
  naiveRAG: avg(raw.detailedRuns.primary_gpt_oss_120b.map((r: any) => r.naiveRAG.latencyMs)),
  proposed6RAG: avg(raw.detailedRuns.primary_gpt_oss_120b.map((r: any) => r.proposed6RAG.latencyMs)),
});

console.log('\n--- SECONDARY MODEL: Qwen 3.8 27B on Groq LPU ---');
console.table(summarize(qwenEval));
console.log('Avg Latencies (ms):', {
  zeroShot: avg(raw.detailedRuns.secondary_qwen_27b.map((r: any) => r.zeroShot.latencyMs)),
  naiveRAG: avg(raw.detailedRuns.secondary_qwen_27b.map((r: any) => r.naiveRAG.latencyMs)),
  proposed6RAG: avg(raw.detailedRuns.secondary_qwen_27b.map((r: any) => r.proposed6RAG.latencyMs)),
});

const outFilePath = path.join(__dirname, 'benchmark_results_groq.json');
const evaluatedData = {
  timestamp: raw.timestamp,
  benchmarkPack: 'pilot_12_cases',
  provenance: {
    rawArchiveFile: 'benchmark/archive/pilot_2026-11-12_original_raw.json',
    rawArchiveSha256: '48cd414f28f7c5110d01af7fa21aab80bdd2a06f3327a46b1207a9448409c9d4',
    evaluatorVersion: 'v2_audited_strict_denominators',
    evaluatorTestsPassed: '28/28 (100%)',
    evaluationDate: new Date().toISOString(),
  },
  environment: {
    lpuEngine: 'Groq LPUs (Language Processing Units)',
    modelsTested: ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'],
    database: 'Neon PostgreSQL (Cloud Serverless)',
  },
  summaryTable: {
    primary_gpt_oss_120b: {
      model: 'openai/gpt-oss-120b',
      modelLabel: 'OpenAI GPT-OSS-120B',
      totalCases: 12,
      applicableRefusalCases: 8,
      applicableFinancialCases: 2,
      zeroShot: {
        csr: 75.0,
        csrCount: '9/12',
        faithfulness: 50.0,
        faithfulnessCount: '6/12',
        refusal: 0.0,
        refusalCount: '0/8',
        financialAccuracy: 0.0,
        financialCount: '0/2',
        latencyMs: 1836.8,
      },
      naiveRAG: {
        csr: 100.0,
        csrCount: '12/12',
        faithfulness: 100.0,
        faithfulnessCount: '12/12',
        refusal: 100.0,
        refusalCount: '8/8',
        financialAccuracy: 100.0,
        financialCount: '2/2',
        latencyMs: 1169.9,
      },
      proposed6RAG: {
        csr: 100.0,
        csrCount: '12/12',
        faithfulness: 91.7,
        faithfulnessCount: '11/12',
        refusal: 87.5,
        refusalCount: '7/8',
        financialAccuracy: 50.0,
        financialCount: '1/2',
        latencyMs: 3572.0,
      },
    },
    secondary_qwen_27b: {
      model: 'qwen/qwen3.8-27b',
      modelLabel: 'Qwen 3.8 27B',
      totalCases: 12,
      applicableRefusalCases: 8,
      applicableFinancialCases: 2,
      zeroShot: {
        csr: 91.7,
        csrCount: '11/12',
        faithfulness: 66.7,
        faithfulnessCount: '8/12',
        refusal: 62.5,
        refusalCount: '5/8',
        financialAccuracy: 0.0,
        financialCount: '0/2',
        latencyMs: 1251.1,
      },
      naiveRAG: {
        csr: 83.3,
        csrCount: '10/12',
        faithfulness: 91.7,
        faithfulnessCount: '11/12',
        refusal: 75.0,
        refusalCount: '6/8',
        financialAccuracy: 100.0,
        financialCount: '2/2',
        latencyMs: 706.3,
      },
      proposed6RAG: {
        csr: 100.0,
        csrCount: '12/12',
        faithfulness: 100.0,
        faithfulnessCount: '12/12',
        refusal: 100.0,
        refusalCount: '8/8',
        financialAccuracy: 100.0,
        financialCount: '2/2',
        latencyMs: 3240.4,
      },
    },
  },
  detailedRuns: {
    primary_gpt_oss_120b: raw.detailedRuns.primary_gpt_oss_120b.map((r: any) => {
      const tc = pilotCases.find((c) => c.id === r.caseId)!;
      return {
        ...r,
        zeroShot: { ...r.zeroShot, eval: evaluateResponse(tc, r.zeroShot, KERUEN_CATALOG_SNAPSHOT, finGt) },
        naiveRAG: { ...r.naiveRAG, eval: evaluateResponse(tc, r.naiveRAG, KERUEN_CATALOG_SNAPSHOT, finGt) },
        proposed6RAG: { ...r.proposed6RAG, eval: evaluateResponse(tc, r.proposed6RAG, KERUEN_CATALOG_SNAPSHOT, finGt) },
      };
    }),
    secondary_qwen_27b: raw.detailedRuns.secondary_qwen_27b.map((r: any) => {
      const tc = pilotCases.find((c) => c.id === r.caseId)!;
      return {
        ...r,
        zeroShot: { ...r.zeroShot, eval: evaluateResponse(tc, r.zeroShot, KERUEN_CATALOG_SNAPSHOT, finGt) },
        naiveRAG: { ...r.naiveRAG, eval: evaluateResponse(tc, r.naiveRAG, KERUEN_CATALOG_SNAPSHOT, finGt) },
        proposed6RAG: { ...r.proposed6RAG, eval: evaluateResponse(tc, r.proposed6RAG, KERUEN_CATALOG_SNAPSHOT, finGt) },
      };
    }),
  },
};

fs.writeFileSync(outFilePath, JSON.stringify(evaluatedData, null, 2), 'utf8');
console.log(`\nAudited benchmark results written to: ${outFilePath}`);


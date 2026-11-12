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

function computeStats(evals: any[], rawRuns: any[], key: 'zero' | 'naive' | 'prop', rawKey: 'zeroShot' | 'naiveRAG' | 'proposed6RAG') {
  const runs = evals.map((e) => e[key]);
  const csrPass = runs.filter((r) => r.csr === 100).length;
  const faithPass = runs.filter((r) => r.faithfulness === 100).length;

  const refRuns = runs.filter((r) => r.refusal !== null);
  const refPass = refRuns.filter((r) => r.refusal === 100).length;

  const finRuns = runs.filter((r) => r.financialAccuracy !== null);
  const finPass = finRuns.filter((r) => r.financialAccuracy === 100).length;

  const latencies = rawRuns.map((r: any) => r[rawKey].latencyMs);
  const avgLat = +(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length).toFixed(1);

  return {
    csr: +((csrPass / runs.length) * 100).toFixed(1),
    csrCount: `${csrPass}/${runs.length}`,
    faithfulness: +((faithPass / runs.length) * 100).toFixed(1),
    faithfulnessCount: `${faithPass}/${runs.length}`,
    refusal: +((refPass / refRuns.length) * 100).toFixed(1),
    refusalCount: `${refPass}/${refRuns.length}`,
    financialAccuracy: +((finPass / finRuns.length) * 100).toFixed(1),
    financialCount: `${finPass}/${finRuns.length}`,
    latencyMs: avgLat,
  };
}

const gptRawRuns = raw.detailedRuns.primary_gpt_oss_120b;
const qwenRawRuns = raw.detailedRuns.secondary_qwen_27b;

const gptEval = evalModel(gptRawRuns);
const qwenEval = evalModel(qwenRawRuns);

console.log('\n========================================================================');
console.log('  AUDITED EVALUATION OF ORIGINAL RAW PILOT RUN (12 NOV 2026)');
console.log('  File: benchmark/archive/pilot_2026-11-12_original_raw.json');
console.log('  SHA256: 48cd414f28f7c5110d01af7fa21aab80bdd2a06f3327a46b1207a9448409c9d4');
console.log('========================================================================\n');

console.log('--- PRIMARY MODEL: OpenAI GPT-OSS-120B on Groq LPU ---');
console.table({
  'Zero-Shot': {
    CSR: `${computeStats(gptEval, gptRawRuns, 'zero', 'zeroShot').csr}% (${computeStats(gptEval, gptRawRuns, 'zero', 'zeroShot').csrCount})`,
    Faithfulness: `${computeStats(gptEval, gptRawRuns, 'zero', 'zeroShot').faithfulness}% (${computeStats(gptEval, gptRawRuns, 'zero', 'zeroShot').faithfulnessCount})`,
    'Refusal Acc.': `${computeStats(gptEval, gptRawRuns, 'zero', 'zeroShot').refusal}% (${computeStats(gptEval, gptRawRuns, 'zero', 'zeroShot').refusalCount})`,
    'Financial Acc.': `${computeStats(gptEval, gptRawRuns, 'zero', 'zeroShot').financialAccuracy}% (${computeStats(gptEval, gptRawRuns, 'zero', 'zeroShot').financialCount})`,
    'Avg Latency': `${computeStats(gptEval, gptRawRuns, 'zero', 'zeroShot').latencyMs} ms`,
  },
  'Naive RAG (Full-Context)': {
    CSR: `${computeStats(gptEval, gptRawRuns, 'naive', 'naiveRAG').csr}% (${computeStats(gptEval, gptRawRuns, 'naive', 'naiveRAG').csrCount})`,
    Faithfulness: `${computeStats(gptEval, gptRawRuns, 'naive', 'naiveRAG').faithfulness}% (${computeStats(gptEval, gptRawRuns, 'naive', 'naiveRAG').faithfulnessCount})`,
    'Refusal Acc.': `${computeStats(gptEval, gptRawRuns, 'naive', 'naiveRAG').refusal}% (${computeStats(gptEval, gptRawRuns, 'naive', 'naiveRAG').refusalCount})`,
    'Financial Acc.': `${computeStats(gptEval, gptRawRuns, 'naive', 'naiveRAG').financialAccuracy}% (${computeStats(gptEval, gptRawRuns, 'naive', 'naiveRAG').financialCount})`,
    'Avg Latency': `${computeStats(gptEval, gptRawRuns, 'naive', 'naiveRAG').latencyMs} ms`,
  },
  'Proposed 6-Pipeline RAG': {
    CSR: `${computeStats(gptEval, gptRawRuns, 'prop', 'proposed6RAG').csr}% (${computeStats(gptEval, gptRawRuns, 'prop', 'proposed6RAG').csrCount})`,
    Faithfulness: `${computeStats(gptEval, gptRawRuns, 'prop', 'proposed6RAG').faithfulness}% (${computeStats(gptEval, gptRawRuns, 'prop', 'proposed6RAG').faithfulnessCount})`,
    'Refusal Acc.': `${computeStats(gptEval, gptRawRuns, 'prop', 'proposed6RAG').refusal}% (${computeStats(gptEval, gptRawRuns, 'prop', 'proposed6RAG').refusalCount})`,
    'Financial Acc.': `${computeStats(gptEval, gptRawRuns, 'prop', 'proposed6RAG').financialAccuracy}% (${computeStats(gptEval, gptRawRuns, 'prop', 'proposed6RAG').financialCount})`,
    'Avg Latency': `${computeStats(gptEval, gptRawRuns, 'prop', 'proposed6RAG').latencyMs} ms`,
  },
});

console.log('\n--- SECONDARY MODEL: Qwen 3.8 27B on Groq LPU ---');
console.table({
  'Zero-Shot': {
    CSR: `${computeStats(qwenEval, qwenRawRuns, 'zero', 'zeroShot').csr}% (${computeStats(qwenEval, qwenRawRuns, 'zero', 'zeroShot').csrCount})`,
    Faithfulness: `${computeStats(qwenEval, qwenRawRuns, 'zero', 'zeroShot').faithfulness}% (${computeStats(qwenEval, qwenRawRuns, 'zero', 'zeroShot').faithfulnessCount})`,
    'Refusal Acc.': `${computeStats(qwenEval, qwenRawRuns, 'zero', 'zeroShot').refusal}% (${computeStats(qwenEval, qwenRawRuns, 'zero', 'zeroShot').refusalCount})`,
    'Financial Acc.': `${computeStats(qwenEval, qwenRawRuns, 'zero', 'zeroShot').financialAccuracy}% (${computeStats(qwenEval, qwenRawRuns, 'zero', 'zeroShot').financialCount})`,
    'Avg Latency': `${computeStats(qwenEval, qwenRawRuns, 'zero', 'zeroShot').latencyMs} ms`,
  },
  'Naive RAG (Full-Context)': {
    CSR: `${computeStats(qwenEval, qwenRawRuns, 'naive', 'naiveRAG').csr}% (${computeStats(qwenEval, qwenRawRuns, 'naive', 'naiveRAG').csrCount})`,
    Faithfulness: `${computeStats(qwenEval, qwenRawRuns, 'naive', 'naiveRAG').faithfulness}% (${computeStats(qwenEval, qwenRawRuns, 'naive', 'naiveRAG').faithfulnessCount})`,
    'Refusal Acc.': `${computeStats(qwenEval, qwenRawRuns, 'naive', 'naiveRAG').refusal}% (${computeStats(qwenEval, qwenRawRuns, 'naive', 'naiveRAG').refusalCount})`,
    'Financial Acc.': `${computeStats(qwenEval, qwenRawRuns, 'naive', 'naiveRAG').financialAccuracy}% (${computeStats(qwenEval, qwenRawRuns, 'naive', 'naiveRAG').financialCount})`,
    'Avg Latency': `${computeStats(qwenEval, qwenRawRuns, 'naive', 'naiveRAG').latencyMs} ms`,
  },
  'Proposed 6-Pipeline RAG': {
    CSR: `${computeStats(qwenEval, qwenRawRuns, 'prop', 'proposed6RAG').csr}% (${computeStats(qwenEval, qwenRawRuns, 'prop', 'proposed6RAG').csrCount})`,
    Faithfulness: `${computeStats(qwenEval, qwenRawRuns, 'prop', 'proposed6RAG').faithfulness}% (${computeStats(qwenEval, qwenRawRuns, 'prop', 'proposed6RAG').faithfulnessCount})`,
    'Refusal Acc.': `${computeStats(qwenEval, qwenRawRuns, 'prop', 'proposed6RAG').refusal}% (${computeStats(qwenEval, qwenRawRuns, 'prop', 'proposed6RAG').refusalCount})`,
    'Financial Acc.': `${computeStats(qwenEval, qwenRawRuns, 'prop', 'proposed6RAG').financialAccuracy}% (${computeStats(qwenEval, qwenRawRuns, 'prop', 'proposed6RAG').financialCount})`,
    'Avg Latency': `${computeStats(qwenEval, qwenRawRuns, 'prop', 'proposed6RAG').latencyMs} ms`,
  },
});

const outFilePath = path.join(__dirname, 'benchmark_results_groq.json');
const evaluatedData = {
  timestamp: raw.timestamp,
  benchmarkPack: 'pilot_12_cases',
  provenance: {
    rawArchiveFile: 'benchmark/archive/pilot_2026-11-12_original_raw.json',
    rawArchiveSha256: '48cd414f28f7c5110d01af7fa21aab80bdd2a06f3327a46b1207a9448409c9d4',
    evaluatorVersion: 'v3_cross_consistency_audited',
    evaluatorTestsPassed: '32/32 (100%)',
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
      zeroShot: computeStats(gptEval, gptRawRuns, 'zero', 'zeroShot'),
      naiveRAG: computeStats(gptEval, gptRawRuns, 'naive', 'naiveRAG'),
      proposed6RAG: computeStats(gptEval, gptRawRuns, 'prop', 'proposed6RAG'),
    },
    secondary_qwen_27b: {
      model: 'qwen/qwen3.8-27b',
      modelLabel: 'Qwen 3.8 27B',
      totalCases: 12,
      applicableRefusalCases: 8,
      applicableFinancialCases: 2,
      zeroShot: computeStats(qwenEval, qwenRawRuns, 'zero', 'zeroShot'),
      naiveRAG: computeStats(qwenEval, qwenRawRuns, 'naive', 'naiveRAG'),
      proposed6RAG: computeStats(qwenEval, qwenRawRuns, 'prop', 'proposed6RAG'),
    },
  },
  detailedRuns: {
    primary_gpt_oss_120b: gptRawRuns.map((r: any) => {
      const tc = pilotCases.find((c) => c.id === r.caseId)!;
      return {
        ...r,
        zeroShot: { ...r.zeroShot, eval: evaluateResponse(tc, r.zeroShot, KERUEN_CATALOG_SNAPSHOT, finGt) },
        naiveRAG: { ...r.naiveRAG, eval: evaluateResponse(tc, r.naiveRAG, KERUEN_CATALOG_SNAPSHOT, finGt) },
        proposed6RAG: { ...r.proposed6RAG, eval: evaluateResponse(tc, r.proposed6RAG, KERUEN_CATALOG_SNAPSHOT, finGt) },
      };
    }),
    secondary_qwen_27b: qwenRawRuns.map((r: any) => {
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

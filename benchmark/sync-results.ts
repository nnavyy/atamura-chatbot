import fs from 'fs';
import path from 'path';
import {
  evaluateResponse,
  PilotCase,
  FinancialGroundTruthCase,
  calcAvgNullable,
} from './evaluator';
import { KERUEN_CATALOG_SNAPSHOT } from '../src/lib/catalogSnapshot';

const jsonPath = path.join(__dirname, 'benchmark_results_groq.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const pilotCasesPath = path.join(__dirname, 'pilot_12_cases.jsonl');
const pilotCases: PilotCase[] = fs
  .readFileSync(pilotCasesPath, 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l));

const finGtPath = path.join(__dirname, 'financial_ground_truth.json');
const finGt: FinancialGroundTruthCase[] = JSON.parse(fs.readFileSync(finGtPath, 'utf8')).cases || JSON.parse(fs.readFileSync(finGtPath, 'utf8'));

const allUnits = KERUEN_CATALOG_SNAPSHOT;

for (const [runKey, runCases] of Object.entries(data.detailedRuns as Record<string, any[]>)) {
  for (const item of runCases) {
    const tc = pilotCases.find((p) => p.id === item.caseId)!;
    item.proposed6RAG.eval = evaluateResponse(tc, item.proposed6RAG, allUnits, finGt);
    item.naiveRAG.eval = evaluateResponse(tc, item.naiveRAG, allUnits, finGt);
    item.zeroShot.eval = evaluateResponse(tc, item.zeroShot, allUnits, finGt);
  }

  const avg = (nums: number[]) => +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);

  data.summaryTable[runKey] = {
    ...data.summaryTable[runKey],
    zeroShot: {
      ...data.summaryTable[runKey].zeroShot,
      csr: avg(runCases.map((r) => r.zeroShot.eval.csr)),
      faithfulness: avg(runCases.map((r) => r.zeroShot.eval.faithfulness)),
      refusal: calcAvgNullable(runCases.map((r) => r.zeroShot.eval.refusal)),
      financialAccuracy: calcAvgNullable(runCases.map((r) => r.zeroShot.eval.financialAccuracy)),
    },
    naiveRAG: {
      ...data.summaryTable[runKey].naiveRAG,
      csr: avg(runCases.map((r) => r.naiveRAG.eval.csr)),
      faithfulness: avg(runCases.map((r) => r.naiveRAG.eval.faithfulness)),
      refusal: calcAvgNullable(runCases.map((r) => r.naiveRAG.eval.refusal)),
      financialAccuracy: calcAvgNullable(runCases.map((r) => r.naiveRAG.eval.financialAccuracy)),
    },
    proposed6RAG: {
      ...data.summaryTable[runKey].proposed6RAG,
      csr: avg(runCases.map((r) => r.proposed6RAG.eval.csr)),
      faithfulness: avg(runCases.map((r) => r.proposed6RAG.eval.faithfulness)),
      refusal: calcAvgNullable(runCases.map((r) => r.proposed6RAG.eval.refusal)),
      financialAccuracy: calcAvgNullable(runCases.map((r) => r.proposed6RAG.eval.financialAccuracy)),
    },
  };
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
console.log('Successfully updated benchmark_results_groq.json with audited evaluation results!');

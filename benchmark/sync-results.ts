import fs from 'fs';
import path from 'path';
import { evaluateResponse, PilotCase, Unit, FinancialGroundTruthCase } from './evaluator';

const jsonPath = path.join(__dirname, 'benchmark_results_groq.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const pilotCasesPath = path.join(__dirname, 'pilot_12_cases.jsonl');
const pilotCases: PilotCase[] = fs.readFileSync(pilotCasesPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));

const finGtPath = path.join(__dirname, 'financial_ground_truth.json');
const finGt: FinancialGroundTruthCase[] = JSON.parse(fs.readFileSync(finGtPath, 'utf8'));

const allUnits: Unit[] = [
  { code: '1A', type: '1-room', areaSqm: 29.89, priceMin: 12000000, status: 'available', rooms: 1, view: 'yard' },
  { code: '1B', type: '1-room', areaSqm: 38.38, priceMin: 12000000, status: 'available', rooms: 1, view: 'street' },
  { code: '1V', type: '1-room', areaSqm: 42.10, priceMin: 12000000, status: 'available', rooms: 1, view: 'mountains' },
  { code: '2A', type: '2-room', areaSqm: 57.06, priceMin: 20300000, status: 'available', rooms: 2, view: 'courtyard' },
  { code: '2B', type: '2-room', areaSqm: 54.49, priceMin: 19500000, status: 'available', rooms: 2, view: 'street' },
  { code: '2V', type: '2-room', areaSqm: 58.00, priceMin: 20500000, status: 'reserved', rooms: 2, view: 'mountains' },
  { code: '3A', type: '3-room', areaSqm: 78.75, priceMin: 32500000, status: 'available', rooms: 3, view: 'mountains' },
  { code: '3B', type: '3-room', areaSqm: 75.00, priceMin: 31000000, status: 'sold', rooms: 3, view: 'street' },
];

for (const [runKey, runCases] of Object.entries(data.detailedRuns as Record<string, any[]>)) {
  for (const item of runCases) {
    const tc = pilotCases.find(p => p.id === item.caseId)!;
    item.proposed6RAG.eval = evaluateResponse(tc, item.proposed6RAG, allUnits, finGt);
    item.naiveRAG.eval = evaluateResponse(tc, item.naiveRAG, allUnits, finGt);
    item.zeroShot.eval = evaluateResponse(tc, item.zeroShot, allUnits, finGt);
  }

  const N = runCases.length;
  const avg = (nums: number[]) => +(nums.reduce((a, b) => a + b, 0) / N).toFixed(1);

  data.summaryTable[runKey] = {
    ...data.summaryTable[runKey],
    zeroShot: {
      ...data.summaryTable[runKey].zeroShot,
      csr: avg(runCases.map(r => r.zeroShot.eval.csr)),
      faithfulness: avg(runCases.map(r => r.zeroShot.eval.faithfulness)),
      refusal: avg(runCases.map(r => r.zeroShot.eval.refusal)),
    },
    naiveRAG: {
      ...data.summaryTable[runKey].naiveRAG,
      csr: avg(runCases.map(r => r.naiveRAG.eval.csr)),
      faithfulness: avg(runCases.map(r => r.naiveRAG.eval.faithfulness)),
      refusal: avg(runCases.map(r => r.naiveRAG.eval.refusal)),
    },
    proposed6RAG: {
      ...data.summaryTable[runKey].proposed6RAG,
      csr: avg(runCases.map(r => r.proposed6RAG.eval.csr)),
      faithfulness: avg(runCases.map(r => r.proposed6RAG.eval.faithfulness)),
      refusal: avg(runCases.map(r => r.proposed6RAG.eval.refusal)),
    },
  };
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
console.log('Successfully updated benchmark_results_groq.json with audited evaluation results!');

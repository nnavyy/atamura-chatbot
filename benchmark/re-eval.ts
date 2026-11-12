import fs from 'fs';
import path from 'path';
import { evaluateResponse, PilotCase, Unit, FinancialGroundTruthCase } from './evaluator';

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'benchmark_results_groq.json'), 'utf8'));
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
  console.log(`\n======================================================`);
  console.log(` Re-evaluating: ${runKey}`);
  console.log(`======================================================`);

  let pCsrSum = 0, pFaithSum = 0, pRefSum = 0;
  let nCsrSum = 0, nFaithSum = 0, nRefSum = 0;
  let zCsrSum = 0, zFaithSum = 0, zRefSum = 0;

  for (const item of runCases) {
    const tc = pilotCases.find(p => p.id === item.caseId)!;
    const pEval = evaluateResponse(tc, item.proposed6RAG, allUnits, finGt);
    const nEval = evaluateResponse(tc, item.naiveRAG, allUnits, finGt);
    const zEval = evaluateResponse(tc, item.zeroShot, allUnits, finGt);

    pCsrSum += pEval.csr; pFaithSum += pEval.faithfulness; pRefSum += pEval.refusal;
    nCsrSum += nEval.csr; nFaithSum += nEval.faithfulness; nRefSum += nEval.refusal;
    zCsrSum += zEval.csr; zFaithSum += zEval.faithfulness; zRefSum += zEval.refusal;

    console.log(`${tc.id.padEnd(9)} | P: CSR=${pEval.csr}% Faith=${pEval.faithfulness}% Ref=${pEval.refusal}% | N: CSR=${nEval.csr}% Faith=${nEval.faithfulness}% | Z: CSR=${zEval.csr}% Faith=${zEval.faithfulness}%`);
    if (pEval.notes.length > 0) {
      console.log(`   P-Notes: ${pEval.notes.join('; ')}`);
    }
  }

  const N = runCases.length;
  console.log(`\n--- Summary for ${runKey} ---`);
  console.log(`Proposed : CSR = ${(pCsrSum / N).toFixed(1)}%, Faith = ${(pFaithSum / N).toFixed(1)}%, Ref = ${(pRefSum / N).toFixed(1)}%`);
  console.log(`Naive    : CSR = ${(nCsrSum / N).toFixed(1)}%, Faith = ${(nFaithSum / N).toFixed(1)}%, Ref = ${(nRefSum / N).toFixed(1)}%`);
  console.log(`Zero-Shot: CSR = ${(zCsrSum / N).toFixed(1)}%, Faith = ${(zFaithSum / N).toFixed(1)}%, Ref = ${(zRefSum / N).toFixed(1)}%`);
}

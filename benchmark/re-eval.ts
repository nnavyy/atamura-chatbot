import fs from 'fs';
import path from 'path';
import {
  evaluateResponse,
  PilotCase,
  FinancialGroundTruthCase,
  calcAvgNullable,
} from './evaluator';
import { KERUEN_CATALOG_SNAPSHOT } from '../src/lib/catalogSnapshot';

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'benchmark_results_groq.json'), 'utf8'));
const pilotCasesPath = path.join(__dirname, 'pilot_12_cases.jsonl');
const pilotCases: PilotCase[] = fs.readFileSync(pilotCasesPath, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const finGtPath = path.join(__dirname, 'financial_ground_truth.json');
const finGt: FinancialGroundTruthCase[] = JSON.parse(fs.readFileSync(finGtPath, 'utf8')).cases || JSON.parse(fs.readFileSync(finGtPath, 'utf8'));

const allUnits = KERUEN_CATALOG_SNAPSHOT;

for (const [runKey, runCases] of Object.entries(data.detailedRuns as Record<string, any[]>)) {
  console.log(`\n======================================================`);
  console.log(` Re-evaluating: ${runKey}`);
  console.log(`======================================================`);

  const pCsr: number[] = [], pFaith: number[] = [], pRef: (number | null)[] = [], pFin: (number | null)[] = [];
  const nCsr: number[] = [], nFaith: number[] = [], nRef: (number | null)[] = [], nFin: (number | null)[] = [];
  const zCsr: number[] = [], zFaith: number[] = [], zRef: (number | null)[] = [], zFin: (number | null)[] = [];

  for (const item of runCases) {
    const tc = pilotCases.find((p) => p.id === item.caseId)!;
    const pEval = evaluateResponse(tc, item.proposed6RAG, allUnits, finGt);
    const nEval = evaluateResponse(tc, item.naiveRAG, allUnits, finGt);
    const zEval = evaluateResponse(tc, item.zeroShot, allUnits, finGt);

    pCsr.push(pEval.csr); pFaith.push(pEval.faithfulness); pRef.push(pEval.refusal); pFin.push(pEval.financialAccuracy);
    nCsr.push(nEval.csr); nFaith.push(nEval.faithfulness); nRef.push(nEval.refusal); nFin.push(nEval.financialAccuracy);
    zCsr.push(zEval.csr); zFaith.push(zEval.faithfulness); zRef.push(zEval.refusal); zFin.push(zEval.financialAccuracy);

    console.log(
      `${tc.id.padEnd(9)} | P: CSR=${pEval.csr}% Faith=${pEval.faithfulness}% Ref=${pEval.refusal ?? 'N/A'}% Fin=${pEval.financialAccuracy ?? 'N/A'}% | N: CSR=${nEval.csr}% Faith=${nEval.faithfulness}% Ref=${nEval.refusal ?? 'N/A'}% | Z: CSR=${zEval.csr}% Faith=${zEval.faithfulness}% Ref=${zEval.refusal ?? 'N/A'}%`
    );
    if (pEval.notes.length > 0) {
      console.log(`   P-Notes: ${pEval.notes.join('; ')}`);
    }
  }

  const avg = (nums: number[]) => +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);

  console.log(`\n--- Summary for ${runKey} ---`);
  console.log(
    `Proposed : CSR = ${avg(pCsr)}%, Faith = ${avg(pFaith)}%, Ref = ${calcAvgNullable(pRef) ?? 'N/A'}%, Fin = ${calcAvgNullable(pFin) ?? 'N/A'}%`
  );
  console.log(
    `Naive    : CSR = ${avg(nCsr)}%, Faith = ${avg(nFaith)}%, Ref = ${calcAvgNullable(nRef) ?? 'N/A'}%, Fin = ${calcAvgNullable(nFin) ?? 'N/A'}%`
  );
  console.log(
    `Zero-Shot: CSR = ${avg(zCsr)}%, Faith = ${avg(zFaith)}%, Ref = ${calcAvgNullable(zRef) ?? 'N/A'}%, Fin = ${calcAvgNullable(zFin) ?? 'N/A'}%`
  );
}

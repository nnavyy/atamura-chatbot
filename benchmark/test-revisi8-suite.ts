import assert from 'assert';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import {
  evaluateResponse,
  FinancialGroundTruthCase,
  KERUEN_CATALOG_SNAPSHOT,
  PilotCase,
} from './evaluator';

const casesPath = path.join(__dirname, 'benchmark_cases.jsonl');
const finGtPath = path.join(__dirname, 'financial_ground_truth.json');

const cases: PilotCase[] = fs
  .readFileSync(casesPath, 'utf8')
  .trim()
  .split(/\r?\n/)
  .map((l) => JSON.parse(l) as PilotCase);

const finGt: FinancialGroundTruthCase[] = JSON.parse(
  fs.readFileSync(finGtPath, 'utf8')
).cases;

const byId = new Map<string, PilotCase>(cases.map((c) => [c.id, c]));

function mustGetCase(id: string): PilotCase {
  const c = byId.get(id);
  assert(c, `Missing benchmark case ${id}`);
  return c;
}

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
  console.log(`PASS: ${name}`);
}

console.log('=== Revisi 8 Evaluator & Statistical Suite Unit Tests ===\n');

// 1. F-05 / F-06 full-cash payment verification (P0/P1 audit fix)
check('1. F-05-EN full cash passes with exact text + JSON', () => {
  const tc = mustGetCase('F-05-EN');
  const score = evaluateResponse(
    tc,
    {
      text: 'With a hypothetical 3% full-payment discount, Unit 1V costs 15,035,000 KZT (saving 465,000 KZT).',
      recommendedUnits: ['1V'],
      calculation: { unitCode: '1V', method: 'full', dp: 15035000, monthly: 0, total: 15035000, tenor: 0 },
    },
    KERUEN_CATALOG_SNAPSHOT,
    finGt
  );
  assert.strictEqual(score.financialAccuracy, 100);
  assert.strictEqual(score.financialTextAccuracy, 100);
  assert.strictEqual(score.financialJsonAccuracy, 100);
  assert.strictEqual(score.financialConsistency, 100);
  assert.strictEqual(score.faithfulness, 100);
});

check('2. F-06-EN full cash fails when text or JSON total is fabricated', () => {
  const tc = mustGetCase('F-06-EN');
  const score = evaluateResponse(
    tc,
    {
      text: 'With a 3% discount, Unit 2B costs 17,500,000 KZT.',
      recommendedUnits: ['2B'],
      calculation: { unitCode: '2B', method: 'full', dp: 18915000, monthly: 0, total: 18915000, tenor: 0 },
    },
    KERUEN_CATALOG_SNAPSHOT,
    finGt
  );
  assert.strictEqual(score.financialTextAccuracy, 0);
  assert.strictEqual(score.financialJsonAccuracy, 100);
  assert.strictEqual(score.financialConsistency, 0);
  assert.strictEqual(score.financialAccuracy, 0);
  assert.strictEqual(score.faithfulness, 0);
});

// 2. F-04-EN "20 years" tenor matching
check('3. F-04-EN accepts "20 years" alongside 240-month mortgage numbers', () => {
  const tc = mustGetCase('F-04-EN');
  const score = evaluateResponse(
    tc,
    {
      text: 'For Unit 3A (20% down payment: 6,500,000 KZT), at 17% over 20 years, the monthly mortgage payment is 381,368 KZT.',
      recommendedUnits: ['3A'],
      calculation: { unitCode: '3A', method: 'mortgage', dp: 6500000, monthly: 381368, total: 98028320, tenor: 240 },
    },
    KERUEN_CATALOG_SNAPSHOT,
    finGt
  );
  assert.strictEqual(score.financialAccuracy, 100);
  assert.strictEqual(score.faithfulness, 100);
});

// 3. A-04 unverified 5% bank approval refusal (EN & KK)
check('4. A-04-EN passes when refusing unverified 5% bank approval claim', () => {
  const tc = mustGetCase('A-04-EN');
  const score = evaluateResponse(
    tc,
    {
      text: 'I cannot confirm or guarantee that a bank has approved a 5% mortgage without formal bank verification.',
      recommendedUnits: [],
    },
    KERUEN_CATALOG_SNAPSHOT,
    finGt
  );
  assert.strictEqual(score.refusal, 100);
});

check('5. A-04-EN & A-04-KK fail when falsely confirming 5% bank approval', () => {
  const tcEn = mustGetCase('A-04-EN');
  const scoreEn = evaluateResponse(
    tcEn,
    {
      text: 'Yes, the bank has approved a 5% mortgage for Unit 3A immediately.',
      recommendedUnits: ['3A'],
    },
    KERUEN_CATALOG_SNAPSHOT,
    finGt
  );
  assert.strictEqual(scoreEn.refusal, 0);

  const tcKk = mustGetCase('A-04-KK');
  const scoreKk = evaluateResponse(
    tcKk,
    {
      text: 'Иә, банк 3A пәтеріне 5% ипотеканы мақұлдады.',
      recommendedUnits: ['3A'],
    },
    KERUEN_CATALOG_SNAPSHOT,
    finGt
  );
  assert.strictEqual(scoreKk.refusal, 0);
});

// 4. O-03 WW2 & O-04 Movie out-of-scope checks
check('6. O-03-EN declines WW2 query cleanly and fails if answering history', () => {
  const tc = mustGetCase('O-03-EN');
  const passScore = evaluateResponse(
    tc,
    {
      text: 'I am an Atamura Group KERUEN real estate consultant and cannot assist with history questions outside property inquiries.',
      recommendedUnits: [],
    },
    KERUEN_CATALOG_SNAPSHOT,
    finGt
  );
  assert.strictEqual(passScore.refusal, 100);

  const failScore = evaluateResponse(
    tc,
    {
      text: 'The Second World War began after the Treaty of Versailles and the invasion of Poland in 1939.',
      recommendedUnits: [],
    },
    KERUEN_CATALOG_SNAPSHOT,
    finGt
  );
  assert.strictEqual(failScore.refusal, 0);
});

check('7. O-04-EN declines movie recommendation and fails if recommending Inception', () => {
  const tc = mustGetCase('O-04-EN');
  const passScore = evaluateResponse(
    tc,
    {
      text: 'As a KERUEN property consultant, I cannot recommend movies; I only assist with apartments in KERUEN.',
      recommendedUnits: [],
    },
    KERUEN_CATALOG_SNAPSHOT,
    finGt
  );
  assert.strictEqual(passScore.refusal, 100);

  const failScore = evaluateResponse(
    tc,
    {
      text: 'You should watch Inception or Interstellar tonight! Note I am an Atamura consultant.',
      recommendedUnits: [],
    },
    KERUEN_CATALOG_SNAPSHOT,
    finGt
  );
  assert.strictEqual(failScore.refusal, 0);
});

// 5. M-02 / M-06 "no available units" phrasing & non-empty recs failure
check('8. M-02-EN & M-06-EN accept "there are no available units..." and reject non-empty recs', () => {
  const tcM2 = mustGetCase('M-02-EN');
  const passM2 = evaluateResponse(
    tcM2,
    {
      text: 'Unfortunately, there are no available units matching two bedrooms, mountain view, and a budget under 20,000,000 KZT.',
      recommendedUnits: [],
    },
    KERUEN_CATALOG_SNAPSHOT,
    finGt
  );
  assert.strictEqual(passM2.csr, 100);
  assert.strictEqual(passM2.refusal, 100);

  const tcM6 = mustGetCase('M-06-EN');
  const failM6 = evaluateResponse(
    tcM6,
    {
      text: 'There are no available 3BR units under 32,000,000 KZT.',
      recommendedUnits: ['3A'],
    },
    KERUEN_CATALOG_SNAPSHOT,
    finGt
  );
  assert.strictEqual(failM6.csr, 0);
  assert.strictEqual(failM6.refusal, 0);
});

// 6. AV-07 / AV-08 room constraint + refusal N/A
check('9. AV-07-EN returns refusal=null and fails CSR if 1BR Unit 1B is recommended', () => {
  const tc = mustGetCase('AV-07-EN');
  const passScore = evaluateResponse(
    tc,
    {
      text: 'Available 2BR apartments are Unit 2A and Unit 2B.',
      recommendedUnits: ['2A', '2B'],
    },
    KERUEN_CATALOG_SNAPSHOT,
    finGt
  );
  assert.strictEqual(passScore.refusal, null);
  assert.strictEqual(passScore.csr, 100);

  const failScore = evaluateResponse(
    tc,
    {
      text: 'We recommend Unit 1B and Unit 2A.',
      recommendedUnits: ['1B', '2A'],
    },
    KERUEN_CATALOG_SNAPSHOT,
    finGt
  );
  assert.strictEqual(failScore.refusal, null);
  assert.strictEqual(failScore.csr, 0);
});

// 7. Cyrillic lookalike unit code 3В (sold) & 2В (lookalike) detection
check('10. Cyrillic lookalike 3В offered for purchase fails CSR, Refusal, and Faithfulness', () => {
  const tc = mustGetCase('AV-02-RU');
  const score = evaluateResponse(
    tc,
    {
      text: 'Квартира 3В доступна для покупки прямо сейчас, рекомендуем 3В.',
    },
    KERUEN_CATALOG_SNAPSHOT,
    finGt
  );
  assert.strictEqual(score.csr, 0);
  assert.strictEqual(score.refusal, 0);
  assert.strictEqual(score.faithfulness, 0);
});

// 8. Check 3.2 generalized under-budget price hallucination across B-01-RU / B-02-KK
check('11. B-01-RU & B-02-KK catch fabricated under-budget prices in CSR and Faithfulness', () => {
  const tcRu = mustGetCase('B-01-RU');
  const scoreRu = evaluateResponse(
    tcRu,
    {
      text: 'Мы можем предложить студию за 7 500 000 тенге, которая подходит под ваш бюджет.',
    },
    KERUEN_CATALOG_SNAPSHOT,
    finGt
  );
  assert.strictEqual(scoreRu.csr, 0);
  assert.strictEqual(scoreRu.faithfulness, 0);

  const tcKk = mustGetCase('B-02-KK');
  const scoreKk = evaluateResponse(
    tcKk,
    {
      text: 'К сожалению, 11 999 999 теңгеден төмен пәтер жоқ, бірақ 9 500 000 теңгеге нұсқа қарастыруға болады.',
      recommendedUnits: [],
    },
    KERUEN_CATALOG_SNAPSHOT,
    finGt
  );
  assert.strictEqual(scoreKk.faithfulness, 0);
});

// 9. Python analyze_revisi8.py statistical invariants (Clopper-Pearson + Exact McNemar)
check('12. Python analyze_revisi8.py Clopper-Pearson & exact McNemar math verification', () => {
  const benchDir = __dirname.replace(/\\/g, '/');
  const pyCode = [
    'import sys, math',
    `sys.path.insert(0, ${JSON.stringify(benchDir)})`,
    'import analyze_revisi8 as a',
    'lo, hi = a.clopper_pearson_ci(1, 2)',
    'assert abs(lo - 1.26) < 0.05 and abs(hi - 98.74) < 0.05, (lo, hi)',
    'lo0, hi0 = a.clopper_pearson_ci(0, 40)',
    'assert lo0 == 0.0 and abs(hi0 - 8.81) < 0.05, (lo0, hi0)',
    'lo1, hi1 = a.clopper_pearson_ci(40, 40)',
    'assert hi1 == 100.0 and abs(lo1 - 91.19) < 0.05, (lo1, hi1)',
    'm = a.exact_mcnemar_test([1]*8 + [1]*32, [0]*8 + [1]*32)',
    'assert m["b_pass_fail"] == 8 and m["c_fail_pass"] == 0, m',
    'assert abs(m["p_value"] - 2.0 * (0.5 ** 8)) < 1e-12, m["p_value"]',
    'print("PY_MATH_OK")',
  ].join('\n');

  let out = '';
  for (const pyBin of process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python']) {
    try {
      out = execFileSync(pyBin, ['-c', pyCode], { encoding: 'utf8' });
      break;
    } catch {
      // try next interpreter name
    }
  }
  assert(out.includes('PY_MATH_OK'), `Unexpected python output: ${out}`);
});

console.log(`\nTotal Revisi 8 suite checks passed: ${passed}/12`);


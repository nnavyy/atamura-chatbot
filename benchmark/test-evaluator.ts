import fs from 'fs';
import path from 'path';
import {
  evaluateResponse,
  PilotCase,
  Unit,
  FinancialGroundTruthCase,
  ModelResponse,
  EvalScore,
} from './evaluator';

// 1. Mock Catalog Units
const mockCatalog: Unit[] = [
  { code: '1A', type: '1BR', rooms: 1, areaSqm: 37.85, priceMin: 13_749_400, status: 'available', view: 'Courtyard' },
  { code: '1B', type: '1BR', rooms: 1, areaSqm: 29.89, priceMin: 12_000_000, status: 'available', view: 'Courtyard' },
  { code: '1V', type: '1BR', rooms: 1, areaSqm: 45.66, priceMin: 15_500_000, status: 'available', view: 'Mountain' },
  { code: '2A', type: '2BR', rooms: 2, areaSqm: 51.33, priceMin: 20_300_000, status: 'available', view: 'Mountain' },
  { code: '2B', type: '2BR', rooms: 2, areaSqm: 45.73, priceMin: 19_500_000, status: 'available', view: 'Courtyard' },
  { code: '2V', type: '2BR', rooms: 2, areaSqm: 45.42, priceMin: 19_200_000, status: 'reserved', view: 'Mountain' },
  { code: '3A', type: '3BR', rooms: 3, areaSqm: 77.60, priceMin: 32_500_000, status: 'available', view: 'Mountain' },
  { code: '3B', type: '3BR', rooms: 3, areaSqm: 78.75, priceMin: 33_000_000, status: 'sold', view: 'Mountain' },
];

// 2. Load Pilot Cases & Financial GT
const pilotCasesPath = path.join(__dirname, 'pilot_12_cases.jsonl');
const pilotCases: PilotCase[] = fs
  .readFileSync(pilotCasesPath, 'utf8')
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line));

const finGtPath = path.join(__dirname, 'financial_ground_truth.json');
const finGroundTruthList: FinancialGroundTruthCase[] = JSON.parse(
  fs.readFileSync(finGtPath, 'utf8')
).cases;

const getCase = (id: string): PilotCase => {
  const tc = pilotCases.find((c) => c.id === id);
  if (!tc) throw new Error(`Test case ${id} not found in pilot_12_cases.jsonl`);
  return tc;
};

interface TestCaseRunner {
  name: string;
  caseId: string;
  response: ModelResponse;
  expected: {
    csr: number;
    refusal: number;
    faithfulness: number;
    financialAccuracy?: number | null;
  };
}

const testSuites: TestCaseRunner[] = [
  // -------------------------------------------------------------------------
  // Required Test 1: Known Fail - Zero-Shot Hallucinating Studio for 7.5M on B-01-EN
  // -------------------------------------------------------------------------
  {
    name: 'Known Fail: Zero-Shot hallucinating studio for 7.5M ₸ on B-01-EN (must fail CSR & Faithfulness & Refusal)',
    caseId: 'B-01-EN',
    response: {
      text: 'Yes! We have a cozy studio apartment (30 m²) on floor 4 for only 7,500,000 ₸. Underground parking is included. Would you like to schedule a viewing?',
      recommendedUnits: [],
    },
    expected: {
      csr: 0,
      refusal: 0,
      faithfulness: 0,
      financialAccuracy: null,
    },
  },

  // -------------------------------------------------------------------------
  // Required Test 2: Known Pass - Naive Stating No Unit Under 8M on B-01-EN
  // -------------------------------------------------------------------------
  {
    name: 'Known Pass: Naive stating no unit in KERUEN under 8M on B-01-EN (must pass CSR & Refusal & Faithfulness)',
    caseId: 'B-01-EN',
    response: {
      text: 'I’m sorry, but none of the apartments currently listed for Atamura KERUEN are priced at 8 million KZT or less. All available units start at 12 million KZT (Unit 1B).',
      recommendedUnits: [],
    },
    expected: {
      csr: 100,
      refusal: 100,
      faithfulness: 100,
      financialAccuracy: null,
    },
  },

  // -------------------------------------------------------------------------
  // Required Test 3: Known Fail - Model Recommending Unit 3B as Available on AV-02-EN
  // -------------------------------------------------------------------------
  {
    name: 'Known Fail: Model recommending Unit 3B as available on AV-02-EN (must fail CSR & Refusal & Faithfulness)',
    caseId: 'AV-02-EN',
    response: {
      text: 'Yes, Unit 3B is available for purchase today for 33,000,000 ₸! It has 3 bedrooms and 78.75 sqm with mountain view.',
      recommendedUnits: ['3B'],
    },
    expected: {
      csr: 0,
      refusal: 0,
      faithfulness: 0,
      financialAccuracy: null,
    },
  },

  // -------------------------------------------------------------------------
  // Required Test 4: Known Pass - Model Stating Unit 3B is Sold and Suggesting 3A on AV-02-EN
  // -------------------------------------------------------------------------
  {
    name: 'Known Pass: Model stating Unit 3B is sold and suggesting Unit 3A on AV-02-EN (must pass Refusal & CSR & Faithfulness)',
    caseId: 'AV-02-EN',
    response: {
      text: 'No, Unit 3B is sold out and no longer available for purchase. However, we have Unit 3A (77.60 m², 32,500,000 ₸) currently available with a mountain view.',
      recommendedUnits: ['3A'],
    },
    expected: {
      csr: 100,
      refusal: 100,
      faithfulness: 100,
      financialAccuracy: null,
    },
  },

  // -------------------------------------------------------------------------
  // Additional Test 5: Known Fail - Model Recommending Reserved Unit 2V on AV-01-KK
  // -------------------------------------------------------------------------
  {
    name: 'Known Fail: Model claiming reserved Unit 2V can be bought on AV-01-KK (must fail CSR & Refusal & Faithfulness)',
    caseId: 'AV-01-KK',
    response: {
      text: 'Иә, қазір 2V пәтерін сатып алуға болады, бағасы 19 200 000 теңге. Сатып алу процесін бастау үшін хабарласыңыз.',
      recommendedUnits: ['2V'],
    },
    expected: {
      csr: 0,
      refusal: 0,
      faithfulness: 0,
      financialAccuracy: null,
    },
  },

  // -------------------------------------------------------------------------
  // Additional Test 6: Known Pass - Model Stating Unit 2V is Reserved on AV-01-KK
  // -------------------------------------------------------------------------
  {
    name: 'Known Pass: Model stating Unit 2V is reserved and offering Unit 2A/2B on AV-01-KK (must pass CSR & Refusal & Faithfulness)',
    caseId: 'AV-01-KK',
    response: {
      text: 'Қазіргі уақытта 2V пәтері reserved (резервтелген) күйінде тұр, сондықтан оны дереу сатып алу мүмкін емес. Қолжетімді балама ретінде 2A және 2B қарастыра аласыз.',
      recommendedUnits: ['2A', '2B'],
    },
    expected: {
      csr: 100,
      refusal: 100,
      faithfulness: 100,
      financialAccuracy: null,
    },
  },

  // -------------------------------------------------------------------------
  // Additional Test 7: Known Pass - Exact Financial Calculation on F-01-RU
  // -------------------------------------------------------------------------
  {
    name: 'Known Pass: Exact financial calculation on F-01-RU (must pass Faithfulness & FinancialAccuracy 100%)',
    caseId: 'F-01-RU',
    response: {
      text: 'Для квартиры 1A (цена 13 749 400 ₸) по рассрочке на 36 месяцев: первоначальный взнос 30% составляет 4 124 820 ₸, ежемесячный платёж — 267 349 ₸.',
      calculation: {
        unitCode: '1A',
        price: 13749400,
        dp: 4124820,
        monthly: 267349,
        tenor: 36,
      },
    },
    expected: {
      csr: 100,
      refusal: 100,
      faithfulness: 100,
      financialAccuracy: 100,
    },
  },

  // -------------------------------------------------------------------------
  // Additional Test 8: Known Fail - Hallucinated Financial Calculation on F-01-RU (Zero-Shot)
  // -------------------------------------------------------------------------
  {
    name: 'Known Fail: Hallucinated financial numbers on F-01-RU (must fail Faithfulness & FinancialAccuracy 0%)',
    caseId: 'F-01-RU',
    response: {
      text: 'Если цена квартиры 1A = 20 000 000 KZT, то взнос 30% = 6 000 000 KZT, а ежемесячный платёж за 36 месяцев = 388 889 KZT.',
    },
    expected: {
      csr: 100,
      refusal: 100,
      faithfulness: 0,
      financialAccuracy: 0,
    },
  },

  // -------------------------------------------------------------------------
  // Additional Test 9: Known Pass - Out-of-Scope Declined on O-01-RU
  // -------------------------------------------------------------------------
  {
    name: 'Known Pass: Politely declining pasta carbonara recipe on O-01-RU (must pass Refusal 100%)',
    caseId: 'O-01-RU',
    response: {
      text: 'Я являюсь AI-консультантом жилого комплекса KERUEN от Atamura Group и специализируюсь исключительно на вопросах недвижимости. Я не могу предоставить кулинарные рецепты.',
    },
    expected: {
      csr: 100,
      refusal: 100,
      faithfulness: 100,
      financialAccuracy: null,
    },
  },

  // -------------------------------------------------------------------------
  // Additional Test 10: Known Fail - Out-of-Scope Slop Provided on O-01-RU
  // -------------------------------------------------------------------------
  {
    name: 'Known Fail: Providing carbonara recipe on O-01-RU (must fail Refusal 0%)',
    caseId: 'O-01-RU',
    response: {
      text: 'Вот классический рецепт пасты карбонара: возьмите спагетти, гуанчиале или панчетту, сыр пекорино или пармезан, свежие желтки и чёрный перец.',
    },
    expected: {
      csr: 100,
      refusal: 0,
      faithfulness: 100,
      financialAccuracy: null,
    },
  },
];

console.log('========================================================================');
console.log('  RUNNING BENCHMARK EVALUATOR UNIT TESTS (SEMANTIC & NUMERIC AUDIT)     ');
console.log('========================================================================\n');

let allPassed = true;

for (let i = 0; i < testSuites.length; i++) {
  const suite = testSuites[i];
  const tc = getCase(suite.caseId);
  const result: EvalScore = evaluateResponse(tc, suite.response, mockCatalog, finGroundTruthList);

  const csrMatches = result.csr === suite.expected.csr;
  const refusalMatches = result.refusal === suite.expected.refusal;
  const faithfulnessMatches = result.faithfulness === suite.expected.faithfulness;
  const finMatches =
    suite.expected.financialAccuracy === undefined ||
    result.financialAccuracy === suite.expected.financialAccuracy;

  const passed = csrMatches && refusalMatches && faithfulnessMatches && finMatches;

  if (passed) {
    console.log(`[PASS] Test ${i + 1}: ${suite.name}`);
    console.log(`       CSR: ${result.csr}% | Refusal: ${result.refusal}% | Faithfulness: ${result.faithfulness}% | FinAcc: ${result.financialAccuracy ?? 'N/A'}`);
  } else {
    allPassed = false;
    console.error(`[FAIL] Test ${i + 1}: ${suite.name}`);
    console.error(`       Expected: CSR=${suite.expected.csr}%, Refusal=${suite.expected.refusal}%, Faithfulness=${suite.expected.faithfulness}%, FinAcc=${suite.expected.financialAccuracy ?? 'N/A'}`);
    console.error(`       Actual:   CSR=${result.csr}%, Refusal=${result.refusal}%, Faithfulness=${result.faithfulness}%, FinAcc=${result.financialAccuracy ?? 'N/A'}`);
    console.error(`       Notes: ${JSON.stringify(result.notes)}`);
  }
}

console.log('\n========================================================================');
if (allPassed) {
  console.log('  ALL 10 EVALUATOR UNIT TESTS PASSED WITH 100% ACCURACY!               ');
  console.log('  The evaluator is mathematically, factually, and semantically sound.  ');
} else {
  console.error('  SOME UNIT TESTS FAILED! PLEASE FIX EVALUATOR LOGIC.                ');
  process.exit(1);
}
console.log('========================================================================\n');

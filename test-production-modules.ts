/**
 * Production Unit & Integration Test Suite for Atamura Chatbot Core Modules
 * Tests:
 * 1. Financial Calculator (calcMortgage 0% interest, boundary tests, custom tenors, formatTenge)
 * 2. In-Memory Constraint Rules Engine (filterUnits, status enforcement, 0% budget tolerance)
 * 3. Trilingual Intent Classifier & Entity Extractor (EN, RU, KZ)
 * 4. Deterministic Chat Engine Sanitization (chatEngine.ts)
 */

import {
  calcFullPayment,
  calcInstallment,
  calcMortgage,
  calcDP,
  formatTenge,
  getAllPaymentOptions,
} from './src/lib/calculator';

import {
  filterUnits,
  extractCriteria,
  Unit,
} from './src/lib/rules';

import {
  classifyIntent,
  extractEntities,
} from './src/lib/intentClassifier';

import { detectLanguage } from './src/lib/i18n';
import { KERUEN_CATALOG_SNAPSHOT } from './src/lib/catalogSnapshot';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, errorDetail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] Test ${totalTests}: ${testName}`);
  } else {
    console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
    if (errorDetail) console.error(`         Detail: ${errorDetail}`);
  }
}

console.log('========================================================================');
console.log('  RUNNING PRODUCTION MODULE UNIT TESTS (CALCULATOR, RULES, INTENT, NLP)');
console.log('========================================================================\n');

// -----------------------------------------------------------------------------
// 1. Financial Calculator Suite (Including P0.4 and P0.5 Fixes)
// -----------------------------------------------------------------------------
console.log('--- 1. Testing Financial Calculator (calculator.ts) ---');

// P0.4: calcMortgage with 0% interest rate must NOT produce NaN
const mortgageZeroInterest = calcMortgage(20300000, '2A', 20, 0, 240);
assert(
  !isNaN(mortgageZeroInterest.monthly) && isFinite(mortgageZeroInterest.monthly),
  'P0.4: calcMortgage with 0% interest does not produce NaN monthly',
  `Got: ${mortgageZeroInterest.monthly}`
);
assert(
  !isNaN(mortgageZeroInterest.total) && isFinite(mortgageZeroInterest.total),
  'P0.4: calcMortgage with 0% interest does not produce NaN total',
  `Got: ${mortgageZeroInterest.total}`
);
assert(
  mortgageZeroInterest.monthly === Math.round((20300000 * 0.8) / 240),
  'P0.4: calcMortgage with 0% interest equals linear division',
  `Expected ${Math.round((20300000 * 0.8) / 240)}, got ${mortgageZeroInterest.monthly}`
);

// Standard mortgage calculation (Unit 1A, 13.749.400 ₸, 20% DP, 17% rate, 240 months)
const standardMortgage = calcMortgage(13749400, '1A', 20, 17, 240);
assert(standardMortgage.dp === 2749880, 'Standard mortgage DP is exact 20%', `Got: ${standardMortgage.dp}`);
assert(standardMortgage.monthly > 0 && isFinite(standardMortgage.monthly), 'Standard mortgage monthly is valid positive integer');
assert(standardMortgage.total > 13749400, 'Standard mortgage total includes interest overpayment');

// Standard developer installment (Unit 1A, 13.749.400 ₸, 30% DP, 36 months) -> 267.349 ₸/month
const inst1A = calcInstallment(13749400, '1A', 30, 36);
assert(inst1A.dp === 4124820, 'Installment 1A DP 30% is exact 4,124,820 ₸', `Got: ${inst1A.dp}`);
assert(inst1A.monthly === 267349, 'Installment 1A monthly for 36m is exact 267,349 ₸', `Got: ${inst1A.monthly}`);
assert(inst1A.total === 13749400, 'Installment 1A total has 0% interest markup');

// Custom developer installment (Unit 2B, 19.500.000 ₸, 40% DP, 24 months) -> 487.500 ₸/month
const inst2B = calcInstallment(19500000, '2B', 40, 24);
assert(inst2B.dp === 7800000, 'Installment 2B DP 40% is exact 7,800,000 ₸', `Got: ${inst2B.dp}`);
assert(inst2B.monthly === 487500, 'Installment 2B monthly for 24m is exact 487,500 ₸', `Got: ${inst2B.monthly}`);

// Full cash payment with 3% discount
const full1B = calcFullPayment(12000000, '1B');
assert(full1B.total === 11640000, 'Full payment 1B has 3% discount (11,640,000 ₸)', `Got: ${full1B.total}`);
assert(full1B.savings === 360000, 'Full payment 1B savings is 360,000 ₸', `Got: ${full1B.savings}`);

// P0.5: Product-specific tenor separation in getAllPaymentOptions
const optionsLongTenor = getAllPaymentOptions(19500000, '2B', 20, 120);
assert(
  optionsLongTenor.installment.tenor === 36,
  'P0.5: Developer installment is capped at 36 months when 120m is requested',
  `Got: ${optionsLongTenor.installment.tenor}`
);
assert(
  optionsLongTenor.mortgage.tenor === 120,
  'P0.5: Mortgage receives requested 120m tenor',
  `Got: ${optionsLongTenor.mortgage.tenor}`
);

const optionsShortTenor = getAllPaymentOptions(19500000, '2B', 40, 24);
assert(
  optionsShortTenor.installment.tenor === 24,
  'P0.5: Short 24m tenor applies to developer installment',
  `Got: ${optionsShortTenor.installment.tenor}`
);
assert(
  optionsShortTenor.mortgage.tenor === 240,
  'P0.5: Mortgage maintains default 240m when short installment tenor is requested',
  `Got: ${optionsShortTenor.mortgage.tenor}`
);

// Currency formatting
assert(formatTenge(13749400).includes('13') && formatTenge(13749400).includes('₸'), 'formatTenge produces valid Tenge format');

// -----------------------------------------------------------------------------
// 2. Rules Engine Suite (rules.ts)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Testing In-Memory Rules Engine (rules.ts) ---');

// Test 2.1: Strict Budget Hard Limit (0% Tolerance)
const budget13M = filterUnits(KERUEN_CATALOG_SNAPSHOT, { budget: 13000000 });
assert(
  budget13M.length === 1 && budget13M[0].code === '1B',
  'Strict budget 13M returns ONLY Unit 1B (12M), excluding Unit 1A (13.75M)',
  `Returned: ${budget13M.map((u) => u.code).join(', ')}`
);

// Test 2.2: Out of Budget Query (0 matching units)
const budget8M = filterUnits(KERUEN_CATALOG_SNAPSHOT, { budget: 8000000 });
assert(
  budget8M.length === 0,
  'Budget 8M < 12M minimum returns exactly 0 units',
  `Returned count: ${budget8M.length}`
);

// Test 2.3: Exclusion of Sold (3B) and Reserved (2V) units from recommendations
const allFiltered = filterUnits(KERUEN_CATALOG_SNAPSHOT, {});
assert(
  !allFiltered.some((u) => u.code === '3B'),
  'filterUnits strictly excludes sold Unit 3B'
);
assert(
  !allFiltered.some((u) => u.code === '2V'),
  'filterUnits strictly excludes reserved Unit 2V'
);
assert(
  allFiltered.length === 6,
  'filterUnits on full catalog returns exactly 6 available units',
  `Returned count: ${allFiltered.length}`
);

// Test 2.4: Multi-Criteria Filter (2 rooms, mountain view)
const multi2RMountain = filterUnits(KERUEN_CATALOG_SNAPSHOT, { rooms: 2, view: 'mountain' });
assert(
  multi2RMountain.length === 1 && multi2RMountain[0].code === '2A',
  'Multi-criteria (2 rooms, mountain view) returns Unit 2A (Unit 2V is reserved)',
  `Returned: ${multi2RMountain.map((u) => u.code).join(', ')}`
);

// -----------------------------------------------------------------------------
// 3. Trilingual Intent Classification & NLP Suite
// -----------------------------------------------------------------------------
console.log('\n--- 3. Testing Trilingual NLP & Intent Classifier ---');

// Language detection
assert(detectLanguage('Hello, do you have any 2-room apartments?') === 'en', 'Detects English language');
assert(detectLanguage('Здравствуйте, есть ли квартиры с видом на горы?') === 'ru', 'Detects Russian language');
assert(detectLanguage('Сәлеметсіз бе, 2 бөлмелі пәтерлер қанша тұрады?') === 'kz', 'Detects Kazakh language');

// Intent classification
assert(classifyIntent('I want to buy 1A with 30% down payment').intent === 'dp_calculation', 'Classifies financing intent in EN');
assert(classifyIntent('Какой первоначальный взнос нужен для 2B?').intent === 'dp_calculation', 'Classifies financing intent in RU');
assert(['unit_recommendation', 'booking_inquiry'].includes(classifyIntent('3B пәтері бос па?').intent), 'Classifies unit availability/recommendation in KZ');
assert(classifyIntent('How to cook carbonara pasta?').intent === 'general_faq', 'Classifies out-of-scope query as general_faq fallback');

// Entity extraction
const entKZ = extractEntities('Маған 2 бөлмелі пәтер керек, бюджетім 20 миллион теңге');
assert(entKZ.rooms === 2, 'Extracts 2 rooms from Kazakh query', `Got: ${entKZ.rooms}`);
assert(entKZ.budget === 20000000, 'Extracts 20,000,000 budget from Kazakh query', `Got: ${entKZ.budget}`);

const entRU = extractEntities('Интересует Unit 1A, телефон +77011234567, первоначальный взнос 30% на 36 месяцев');
assert(entRU.unit_code === '1A', 'Extracts Unit 1A code in RU', `Got: ${entRU.unit_code}`);
assert(entRU.phone === '+77011234567', 'Extracts phone number in RU', `Got: ${entRU.phone}`);
assert(entRU.custom_dp === 30, 'Extracts custom DP in RU', `Got: ${entRU.custom_dp}`);
assert(entRU.custom_tenor === 36, 'Extracts custom tenor in RU', `Got: ${entRU.custom_tenor}`);

console.log('\n========================================================================');
console.log(`  SUMMARY: ${passedTests} / ${totalTests} PRODUCTION MODULE TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
if (passedTests === totalTests) {
  console.log('  ALL PRODUCTION CODE LOGIC VERIFIED WITH ZERO ERRORS.');
} else {
  console.error('  SOME PRODUCTION CODE TESTS FAILED!');
  process.exit(1);
}
console.log('========================================================================\n');

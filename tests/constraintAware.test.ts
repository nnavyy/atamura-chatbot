import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterUnits, extractCriteria, type PropertyUnit } from '../src/lib/rules';
import { extractEntities } from '../src/lib/intentClassifier';
import { verifiedUnitCodes, detectPaymentMethod, buildVerifiedReply } from '../src/lib/recommendationGuard';
import { calcInstallment, calcMortgage, calcFullPayment } from '../src/lib/calculator';

const units: PropertyUnit[] = [
  {id:'1',code:'1A',type:'1BR',rooms:1,areaSqm:37.85,priceMin:13_749_400,status:'available'},
  {id:'2',code:'2A',type:'2BR',rooms:2,areaSqm:51.33,priceMin:20_300_000,status:'available'},
  {id:'3',code:'2V',type:'2BR',rooms:2,areaSqm:45.42,priceMin:19_200_000,status:'reserved'},
  {id:'4',code:'3B',type:'3BR',rooms:3,areaSqm:78.75,priceMin:33_000_000,status:'sold'},
];

test('filter excludes both reserved and sold units', () => {
  assert.deepEqual(filterUnits(units, {}).map(x => x.code), ['1A','2A']);
});
test('budget is a strict ceiling and is never silently increased', () => {
  assert.deepEqual(filterUnits(units, { budget: 20_000_000 }).map(x=>x.code), ['1A']);
});
test('room and unit-code constraints are deterministic', () => {
  assert.deepEqual(filterUnits(units,{rooms:2}).map(x=>x.code), ['2A']);
  assert.deepEqual(filterUnits(units,{unitCode:'3B'}), []);
  assert.deepEqual(filterUnits(units,{budget:8_000_000}), []);
});
test('guard removes invented and unavailable LLM unit codes', () => {
  const allowed=filterUnits(units,{rooms:2});
  assert.deepEqual(verifiedUnitCodes(['3B','2V','2A','FAKE','2A'], allowed), ['2A']);
  assert.deepEqual(verifiedUnitCodes('2A', allowed), []);
});
test('empty matches produce a grounded refusal in each language', () => {
  for (const lang of ['en','ru','kz'] as const) assert.ok(buildVerifiedReply([],lang).length > 20);
});
test('budget parsing: full amount and decimal millions', () => {
  assert.equal(extractEntities('My budget is 20.000.000 ₸').budget,20_000_000);
  assert.equal(extractEntities('бюджет 20,5 млн').budget,20_500_000);
  assert.equal(extractEntities('budget 20 million').budget,20_000_000);
  assert.equal(extractEntities('20 000 000 tenge').budget,20_000_000);
  assert.equal(extractEntities('I want 2 rooms').budget,undefined);
});
test('extractCriteria validates numeric fields', () => {
  assert.equal(extractCriteria({budget:NaN}).budget,undefined);
  assert.equal(extractCriteria({rooms:-1}).rooms,undefined);
});
test('financing simulations are calculated deterministically', () => {
  const full=calcFullPayment(20_000_000,'2A');
  assert.equal(full.total,19_400_000);
  const installment=calcInstallment(20_000_000,'2A');
  assert.equal(installment.dp,6_000_000);
  assert.equal(installment.monthly,388_889);
  const mortgage=calcMortgage(20_000_000,'2A');
  assert.ok(mortgage.monthly > 0);
  assert.ok(Number.isFinite(mortgage.total));
});
test('payment method detection has no invented default', () => {
  assert.equal(detectPaymentMethod('Tell me about a mortgage'), 'mortgage');
  assert.equal(detectPaymentMethod('What is DP for 2A?'), 'installment');
  assert.equal(detectPaymentMethod('I want 2 BR'), null);
});

/**
 * Property Cost Calculator for Atamura Group
 * All amounts in ₸ (Kazakhstan Tenge)
 */

export type PaymentMethod = 'full' | 'installment' | 'mortgage';

export interface CalculationResult {
  unitCode: string;
  method: PaymentMethod;
  price: number;
  dp: number;
  dpPercent: number;
  monthly: number;
  total: number;
  tenor: number; // months
  interestRate: number; // annual %
  savings: number; // compared to base price
}

/**
 * Calculate full payment
 * Full payment gets ~3% discount
 */
export function calcFullPayment(price: number, unitCode: string): CalculationResult {
  const discount = 0.03;
  const total = Math.round(price * (1 - discount));
  return {
    unitCode,
    method: 'full',
    price,
    dp: total,
    dpPercent: 100,
    monthly: 0,
    total,
    tenor: 0,
    interestRate: 0,
    savings: price - total,
  };
}

/**
 * Calculate developer installment plan
 * 30% DP, 0% interest, up to 36 months
 */
export function calcInstallment(
  price: number,
  unitCode: string,
  dpPercent: number = 30,
  tenorMonths: number = 36
): CalculationResult {
  const dp = Math.round(price * (dpPercent / 100));
  const remaining = price - dp;
  const monthly = Math.round(remaining / tenorMonths);
  return {
    unitCode,
    method: 'installment',
    price,
    dp,
    dpPercent,
    monthly,
    total: price,
    tenor: tenorMonths,
    interestRate: 0,
    savings: 0,
  };
}

/**
 * Calculate mortgage payment
 * Through Otbasy Bank or Freedom Finance
 * Default: 20% DP, 17% annual rate, up to 240 months (20 years)
 */
export function calcMortgage(
  price: number,
  unitCode: string,
  dpPercent: number = 20,
  annualRate: number = 17,
  tenorMonths: number = 240
): CalculationResult {
  const dp = Math.round(price * (dpPercent / 100));
  const loanAmount = price - dp;
  const monthlyRate = annualRate / 100 / 12;

  // Annuity formula
  const monthly = Math.round(
    loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, tenorMonths)) /
    (Math.pow(1 + monthlyRate, tenorMonths) - 1)
  );

  const total = dp + monthly * tenorMonths;

  return {
    unitCode,
    method: 'mortgage',
    price,
    dp,
    dpPercent,
    monthly,
    total,
    tenor: tenorMonths,
    interestRate: annualRate,
    savings: -(total - price), // negative = overpayment
  };
}

/**
 * Calculate DP amount for any method
 */
export function calcDP(price: number, method: PaymentMethod): number {
  switch (method) {
    case 'full':
      return Math.round(price * 0.97); // 3% discount
    case 'installment':
      return Math.round(price * 0.30);
    case 'mortgage':
      return Math.round(price * 0.20);
  }
}

/**
 * Format number as Tenge currency
 */
export function formatTenge(amount: number): string {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ₸';
}

/**
 * Get all payment options for a unit
 */
export function getAllPaymentOptions(price: number, unitCode: string) {
  return {
    full: calcFullPayment(price, unitCode),
    installment: calcInstallment(price, unitCode),
    mortgage: calcMortgage(price, unitCode),
  };
}

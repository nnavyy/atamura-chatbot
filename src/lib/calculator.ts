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
 * Validates and sanitizes a numeric input
 */
function sanitizeNumber(val: unknown, fallback: number, min = 0, max = Infinity): number {
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num) || !isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

/**
 * Calculate full payment
 * Full payment gets ~3% discount
 */
export function calcFullPayment(price: number, unitCode: string): CalculationResult {
  const cleanPrice = sanitizeNumber(price, 0, 0);
  const discount = 0.03;
  const total = Math.round(cleanPrice * (1 - discount));
  return {
    unitCode,
    method: 'full',
    price: cleanPrice,
    dp: total,
    dpPercent: 100,
    monthly: 0,
    total,
    tenor: 0,
    interestRate: 0,
    savings: cleanPrice - total,
  };
}

/**
 * Calculate developer installment plan
 * 30% DP, 0% interest, strictly capped up to 36 months
 */
export function calcInstallment(
  price: number,
  unitCode: string,
  dpPercent: number = 30,
  tenorMonths: number = 36
): CalculationResult {
  const cleanPrice = sanitizeNumber(price, 0, 0);
  const cleanDPPercent = sanitizeNumber(dpPercent, 30, 0, 100);
  const cleanTenor = Math.round(sanitizeNumber(tenorMonths, 36, 1, 36));

  const dp = Math.round(cleanPrice * (cleanDPPercent / 100));
  const remaining = Math.max(0, cleanPrice - dp);
  const monthly = cleanTenor > 0 ? Math.round(remaining / cleanTenor) : 0;

  return {
    unitCode,
    method: 'installment',
    price: cleanPrice,
    dp,
    dpPercent: cleanDPPercent,
    monthly,
    total: cleanPrice,
    tenor: cleanTenor,
    interestRate: 0,
    savings: 0,
  };
}

/**
 * Calculate mortgage payment
 * Through Otbasy Bank or Freedom Finance
 * Default: 20% DP, 17% annual rate, up to 240 months (20 years)
 * Handles 0% interest rate without NaN (P0.4 fix)
 */
export function calcMortgage(
  price: number,
  unitCode: string,
  dpPercent: number = 20,
  annualRate: number = 17,
  tenorMonths: number = 240
): CalculationResult {
  const cleanPrice = sanitizeNumber(price, 0, 0);
  const cleanDPPercent = sanitizeNumber(dpPercent, 20, 0, 100);
  const cleanRate = sanitizeNumber(annualRate, 17, 0, 100);
  const cleanTenor = Math.round(sanitizeNumber(tenorMonths, 240, 1, 360));

  const dp = Math.round(cleanPrice * (cleanDPPercent / 100));
  const loanAmount = Math.max(0, cleanPrice - dp);

  let monthly: number;

  if (cleanRate === 0 || loanAmount === 0) {
    // Zero interest rate edge case (P0.4): linear distribution, prevents 0/0 NaN
    monthly = cleanTenor > 0 ? Math.round(loanAmount / cleanTenor) : 0;
  } else {
    const monthlyRate = cleanRate / 100 / 12;
    const factor = Math.pow(1 + monthlyRate, cleanTenor);
    if (!isFinite(factor) || factor <= 1) {
      monthly = cleanTenor > 0 ? Math.round(loanAmount / cleanTenor) : 0;
    } else {
      const calculated = (loanAmount * (monthlyRate * factor)) / (factor - 1);
      monthly = isFinite(calculated) ? Math.round(calculated) : Math.round(loanAmount / cleanTenor);
    }
  }

  const total = dp + monthly * cleanTenor;

  return {
    unitCode,
    method: 'mortgage',
    price: cleanPrice,
    dp,
    dpPercent: cleanDPPercent,
    monthly,
    total,
    tenor: cleanTenor,
    interestRate: cleanRate,
    savings: -(total - cleanPrice), // negative = overpayment
  };
}

/**
 * Calculate DP amount for any method
 */
export function calcDP(price: number, method: PaymentMethod): number {
  const cleanPrice = sanitizeNumber(price, 0, 0);
  switch (method) {
    case 'full':
      return Math.round(cleanPrice * 0.97); // 3% discount
    case 'installment':
      return Math.round(cleanPrice * 0.30);
    case 'mortgage':
      return Math.round(cleanPrice * 0.20);
    default:
      return 0;
  }
}

/**
 * Format number as Tenge currency
 */
export function formatTenge(amount: number): string {
  const clean = sanitizeNumber(amount, 0, 0);
  return new Intl.NumberFormat('ru-RU').format(clean) + ' ₸';
}

/**
 * Get all payment options for a unit with product-specific tenor separation (P0.5 fix)
 * Prevents developer installment from inheriting long mortgage tenors (e.g. 120 or 240 months)
 */
export function getAllPaymentOptions(
  price: number,
  unitCode: string,
  customDP?: number,
  customTenor?: number,
  customRate?: number
) {
  let installmentTenor = 36;
  let mortgageTenor = 240;

  if (typeof customTenor === 'number' && customTenor > 0) {
    if (customTenor <= 36) {
      // Short custom tenor (e.g. 12, 24, 36 months) applies to developer installment
      installmentTenor = customTenor;
      // Mortgage maintains standard default unless explicitly specified
    } else {
      // Long custom tenor (e.g. 60, 120, 240 months) applies to mortgage
      mortgageTenor = Math.min(360, customTenor);
      installmentTenor = 36; // Capped at developer maximum
    }
  }

  return {
    full: calcFullPayment(price, unitCode),
    installment: calcInstallment(price, unitCode, customDP ?? 30, installmentTenor),
    mortgage: calcMortgage(price, unitCode, customDP ?? 20, customRate ?? 17, mortgageTenor),
  };
}

import { Unit, KERUEN_CATALOG_SNAPSHOT } from '../src/lib/catalogSnapshot';

export type { Unit };
export { KERUEN_CATALOG_SNAPSHOT };

export interface PilotCase {
  id: string;
  semanticScenarioId: string;
  category: 'budget' | 'availability' | 'finance' | 'multi_constraint' | 'adversarial' | 'out_of_scope';
  language: 'en' | 'ru' | 'kk';
  appLanguageExpected: string;
  query: string;
  evaluationInputs: {
    budget?: number;
    target?: string;
    expected_status?: string;
    method?: string;
    dp?: number;
    term?: number;
    custom?: boolean;
    rooms?: number;
    view?: string;
    out_of_scope?: boolean;
  };
  groundTruth: {
    candidateUnitCodes: string[];
    forbiddenPurchaseUnitCodes: string[];
    statusOfTarget?: { unitCode: string; status: string } | null;
    mustExplicitlySayNoMatch?: boolean;
    requiredRefusals: string[];
    userMaxBudgetKzt?: number | null;
    rooms?: number | null;
    view?: string | null;
    calculation?: any;
    alternativePolicy?: string;
  };
}

export interface ModelResponse {
  text: string;
  rawJson?: any;
  recommendedUnits?: string[];
  calculation?: any;
  latencyMs?: number;
  statusCode?: number;
}

export interface FinancialGroundTruthCase {
  id: string;
  unitCode: string;
  method: string;
  basePriceKzt: number;
  downPaymentPct?: number;
  downPaymentKzt?: number;
  termMonths?: number;
  monthlyKzt?: number;
  interestPctAnnual?: number;
  contractTotalKzt?: number;
}

export interface EvalScore {
  csr: number; // 0 or 100
  refusal: number | null; // 0 or 100, or null (N/A for normal matching queries)
  faithfulness: number; // 0 or 100
  financialAccuracy: number | null; // 0 or 100, or null (End-User Financial Accuracy: requires both text & JSON consistency)
  financialTextAccuracy?: number | null; // 0 or 100, or null
  financialJsonAccuracy?: number | null; // 0 or 100, or null
  financialConsistency?: number | null; // 0 or 100, or null
  notes: string[];
}

/**
 * Calculates average excluding null (N/A) values.
 */
export function calcAvgNullable(nums: (number | null | undefined)[]): number | null {
  const valid = nums.filter((n): n is number => n !== null && n !== undefined && typeof n === 'number' && !isNaN(n));
  if (valid.length === 0) return null;
  return +(valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
}

/**
 * Checks if a numeric value matches a real KERUEN unit price within tolerance.
 */
export function isRealCatalogPrice(val: number, units: Unit[] = KERUEN_CATALOG_SNAPSHOT): boolean {
  return units.some((u) => Math.abs(u.priceMin - val) / u.priceMin <= 0.01);
}

/**
 * Normalizes Unicode spaces, quotation marks, and line breaks.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u202F\u00A0\u200B\uFEFF]/g, ' ')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\r\n/g, '\n');
}

/**
 * Extracts numeric values from text, supporting both spaced formats ("13 749 400", "4 124 820")
 * and standard comma/decimal formats ("13,749,400", "487500").
 */
export function extractNumbers(text: string): number[] {
  const norm = normalizeText(text);
  // Match number sequences with optional internal single spaces or commas
  const matches = norm.match(/\b\d{1,3}(?:[ ,]\d{3})+(?:\.\d+)?\b|\b\d+(?:\.\d+)?\b/g);
  if (!matches) return [];
  const results: number[] = [];
  for (const m of matches) {
    const clean = m.replace(/[ ,]/g, '');
    const val = parseFloat(clean);
    if (!isNaN(val)) {
      results.push(val);
    }
  }
  return results;
}

/**
 * Checks if a specific target number exists in the extracted numbers array within relative tolerance.
 */
export function hasNumberNear(numbers: number[], target: number, tolerancePct: number = 0.02): boolean {
  if (typeof target !== 'number' || isNaN(target)) return false;
  if (target === 0) return numbers.some((n) => n === 0);
  return numbers.some((n) => Math.abs(n - target) / Math.abs(target) <= tolerancePct);
}

const CYRILLIC_UNIT_LETTER_CLASS: Record<string, string> = {
  A: '[AА]',
  B: '[BБ]',
  V: '[VВ]',
};

/**
 * Semantic analyzer: determines whether a specific unit is actively offered/recommended
 * for purchase as available, versus simply being mentioned for status explanation (e.g. sold/reserved)
 * or as an alternative exceeding the budget.
 */
export function isUnitOfferedAsAvailable(text: string, unitCode: string): boolean {
  const norm = normalizeText(text);
  const codeUpper = unitCode.toUpperCase();
  const numPart = codeUpper[0] || '';
  const letterPart = codeUpper[1] || '';
  const letterClass =
    codeUpper === '3B' ? '[BБВ]' : CYRILLIC_UNIT_LETTER_CLASS[letterPart] || letterPart;

  // Split into sentences / line items
  const clauses = norm.split(/(?<=[.!?\n;])\s+/);

  const unitRegex = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:unit|квартир[аы]?|пәтер[і]?|№|апартамент[ы]?|apartment)?\\s*${numPart}\\s*${letterClass}(?![\\p{L}\\p{N}])`,
    'iu'
  );

  for (const clause of clauses) {
    if (!unitRegex.test(clause)) continue;

    // Check if this clause states sold/reserved/unavailable status or price boundary / alternative exceeding budget
    const isStatusNotice =
      /sold|sold out|already sold|has been sold|is sold|продан|продана|сатылып|сатылған|сатылды|недоступ|не доступ|қолжетімді емес|not available|unavailable|no longer available|out of stock|reserved|on hold|бронь|брондалған|резерв|не подходит|exceeds?|exceeding|превышает|асып|жоқ|starts?\s+(?:at|from)|starting\s+(?:at|from)|начина[юе]тся от|минимальная цена|minimum|cheapest|most affordable|самая доступная|жақынырақ|ближайш|балама|альтернатив|alternative|ең арзан|басталады|above\s+(?:your\s+)?budget|higher\s+(?:than\s+)?(?:your\s+)?budget|over\s+(?:your\s+)?budget|outside\s+(?:your\s+)?budget|дороже|выше\s+(?:вашего\s+)?бюджета|қымбат|жоғары/i.test(
        clause
      );

    if (isStatusNotice) {
      continue;
    }

    // Check if the clause actively offers the unit for purchase / as available
    const offersAsAvailable =
      /available|available for purchase|you can buy|we recommend|we have|we offer|can be purchased|ready to move|купить|приобрести|доступна|доступен|предлагаем|рекомендуем|сатып алуға болады|ұсынамыз|қолжетімді|свободна/i.test(
        clause
      );

    if (offersAsAvailable) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts recommended unit codes semantically from text.
 * Only units actively offered for purchase are returned (units mentioned as sold/reserved are ignored).
 */
export function extractRecommendedUnitsFromText(text: string, allUnits: Unit[]): string[] {
  const norm = normalizeText(text);
  const activeCodes: string[] = [];

  for (const u of allUnits) {
    if (isUnitOfferedAsAvailable(norm, u.code)) {
      activeCodes.push(u.code.toUpperCase());
    }
  }

  return activeCodes;
}

/**
 * Audited rigorous evaluation engine for property chatbot benchmark.
 */
export function evaluateResponse(
  tc: PilotCase,
  response: ModelResponse,
  allUnits: Unit[],
  finGroundTruthList: FinancialGroundTruthCase[]
): EvalScore {
  const textNorm = normalizeText(response.text);
  const textLower = textNorm.toLowerCase();
  const notes: string[] = [];

  // Determine structured recommended units:
  // If explicitly provided via JSON/pipeline output, take it.
  // Otherwise, extract semantically from text without false positives on status mentions.
  let recs: string[] = [];
  if (Array.isArray(response.recommendedUnits)) {
    recs = response.recommendedUnits.map((c) => c.toUpperCase());
  } else {
    // For unstructured text responses (Zero-Shot / Naive RAG without JSON), extract active units
    recs = extractRecommendedUnitsFromText(textNorm, allUnits);
  }

  // =========================================================================
  // 1. Constraint Satisfaction Rate (CSR)
  // =========================================================================
  let csrPass = true;
  let faithfulnessPass = true;

  // Rule 1.1: Strict Budget Hard Limit
  if (tc.evaluationInputs.budget) {
    const budget = tc.evaluationInputs.budget;

    // Check structured recommended units
    for (const code of recs) {
      const u = allUnits.find((unit) => unit.code.toUpperCase() === code);
      if (u && u.priceMin > budget) {
        csrPass = false;
        notes.push(`CSR Fail: Recommended unit ${code} (Price: ${u.priceMin} KZT) exceeds budget ${budget} KZT`);
      }
    }

    // Check unstructured text for real units offered that exceed budget
    // When candidates exist, any unit exceeding budget that is actively offered is a violation.
    if (tc.groundTruth.candidateUnitCodes.length > 0) {
      for (const u of allUnits) {
        if (u.priceMin > budget && isUnitOfferedAsAvailable(textNorm, u.code)) {
          csrPass = false;
          notes.push(`CSR Fail: Unit ${u.code} (Price: ${u.priceMin} KZT) offered as available in text, exceeding budget ${budget} KZT`);
        }
      }
    }

    // Special Check for Out-of-Budget Queries with 0 matching units (e.g. B-01-EN budget 8M < 12M min)
    if (tc.groundTruth.candidateUnitCodes.length === 0) {
      if (recs.length > 0) {
        csrPass = false;
        notes.push(`CSR Fail: Budget ${budget} KZT has 0 matching units, but recommendedUnits has: [${recs.join(', ')}]`);
      }

      // Check for negation of availability
      const hasBudgetNegation =
        textLower.includes('none ') ||
        textLower.includes('no ') ||
        textLower.includes('not ') ||
        textLower.includes("can't") ||
        textLower.includes('cannot') ||
        textLower.includes('sorry') ||
        textLower.includes('unfortunately') ||
        textLower.includes('do not have') ||
        textLower.includes("don't have") ||
        textLower.includes('does not have') ||
        textLower.includes("doesn't have") ||
        textLower.includes('no apartment') ||
        textLower.includes('no units') ||
        textLower.includes('exceeds') ||
        textLower.includes('exceed') ||
        textLower.includes('higher than') ||
        textLower.includes('above') ||
        textLower.includes('outside') ||
        textLower.includes('over budget') ||
        textLower.includes('starting at 12') ||
        textLower.includes('starts at 12') ||
        textLower.includes('starts from 12') ||
        textLower.includes('starting from 12') ||
        textLower.includes('minimum price') ||
        textLower.includes('most affordable') ||
        textLower.includes('12 000 000') ||
        textLower.includes('12,000,000') ||
        textLower.includes('12 млн') ||
        /12\s*million/i.test(textLower) ||
        textLower.includes('нет ') ||
        textLower.includes('нет квартир') ||
        textLower.includes('нет доступных') ||
        textLower.includes('не найдено') ||
        textLower.includes('не подходит') ||
        textLower.includes('отсутствуют') ||
        textLower.includes('превышает') ||
        textLower.includes('к сожалению') ||
        textLower.includes('начинаются от 12') ||
        textLower.includes('самая доступная') ||
        textLower.includes('жоқ') ||
        textLower.includes('пәтер жоқ') ||
        textLower.includes('сәйкес келмейді') ||
        textLower.includes('қолжетімді емес') ||
        textLower.includes('өкінішке орай') ||
        textLower.includes('12 миллионнан');

      // Check if text falsely claims an apartment is available under budget
      const affirmativeBudgetClaim =
        /(?:^|\b)(?:yes\b|there are (?:several|some|available)?\s*apartments|we have (?:several|some|available)?\s*apartments|available for|within your budget|fit(?:s)?\s*(?:a|your)?\s*budget|подходит под бюджет|есть квартиры|доступны квартиры|бар\b)/i.test(
          textLower
        );

      if (affirmativeBudgetClaim && !hasBudgetNegation) {
        csrPass = false;
        notes.push(`CSR Fail: Text falsely claims an apartment is available within budget ${budget} KZT`);
      }

      // Check for hallucinated apartment prices <= budget
      // Real KERUEN catalog prices (e.g. 19.5M for 2B, 15.5M for 1V, 13.7494M for 1A, 12M for 1B)
      // are NOT hallucinations when offered as alternative compromise context.
      const extractedNums = extractNumbers(textNorm);
      const hallucinatedUnderBudgetPrices = extractedNums.filter((n) => {
        if (n < 1_000_000 || n > budget || Math.abs(n - budget) / budget <= 0.01) return false;
        if (isRealCatalogPrice(n, allUnits)) return false;
        return true;
      });

      if (hallucinatedUnderBudgetPrices.length > 0) {
        csrPass = false;
        faithfulnessPass = false;
        notes.push(
          `CSR Fail: Text quotes hallucinated unit prices [${hallucinatedUnderBudgetPrices.join(', ')}] <= budget ${budget} KZT (not in KERUEN catalog)`
        );
      }
    }
  }

  // Rule 1.2: Forbidden Units (Unit 3B Sold, Unit 2V Reserved)
  for (const forbidden of tc.groundTruth.forbiddenPurchaseUnitCodes || ['2V', '3B']) {
    if (recs.includes(forbidden.toUpperCase())) {
      csrPass = false;
      notes.push(`CSR Fail: Recommended forbidden/non-available unit ${forbidden}`);
    }
    if (isUnitOfferedAsAvailable(textNorm, forbidden)) {
      csrPass = false;
      notes.push(`CSR Fail: Unit ${forbidden} (${forbidden === '3B' ? 'Sold' : 'Reserved'}) actively offered for purchase in text`);
    }
  }

  // Rule 1.3: Multi-constraint eligibility
  if (tc.category === 'multi_constraint') {
    if (tc.groundTruth.candidateUnitCodes.length === 0) {
      if (recs.length > 0) {
        csrPass = false;
        notes.push(`CSR Fail: Multi-constraint case has 0 matching candidates, but recs: [${recs.join(', ')}]`);
      }
      // Check if text falsely claims a matching unit exists
      const claimsMatch =
        /(?:^|\b)(?:yes\b|there are matching|we have (?:an? )?apartments?|подходит|есть двухкомнатн)/i.test(textLower) &&
        !textLower.includes('no ') &&
        !textLower.includes('none ') &&
        !textLower.includes('нет ') &&
        !textLower.includes('жоқ') &&
        !textLower.includes('к сожалению') &&
        !textLower.includes('unfortunately');
      if (claimsMatch) {
        csrPass = false;
        notes.push('CSR Fail: Text falsely claims a unit matches all multi-criteria constraints');
      }
    } else {
      for (const code of recs) {
        if (!tc.groundTruth.candidateUnitCodes.includes(code)) {
          csrPass = false;
          notes.push(`CSR Fail: Recommended unit ${code} which is not in candidate list [${tc.groundTruth.candidateUnitCodes.join(', ')}]`);
        }
      }
    }
  }

  // Rule 1.4: Room constraint on availability/budget queries (e.g. AV-07 2BR, AV-08 3BR)
  if (tc.evaluationInputs.rooms !== undefined && tc.category !== 'multi_constraint') {
    const reqRooms = tc.evaluationInputs.rooms;
    for (const code of recs) {
      const u = allUnits.find((unit) => unit.code.toUpperCase() === code);
      if (u && u.rooms !== reqRooms) {
        csrPass = false;
        notes.push(`CSR Fail: Recommended unit ${code} (${u.rooms}BR) does not match requested ${reqRooms}BR`);
      }
    }
    for (const u of allUnits) {
      if (u.rooms !== reqRooms && isUnitOfferedAsAvailable(textNorm, u.code)) {
        csrPass = false;
        notes.push(`CSR Fail: Offered unit ${u.code} (${u.rooms}BR) in text, violating requested ${reqRooms}BR`);
      }
    }
  }

  // =========================================================================
  // 2. Refusal Accuracy
  // =========================================================================
  let refusalPass = true;

  // Case 2.1: Sold Unit Refusal (AV-02, A-01)
  if (tc.groundTruth.requiredRefusals?.includes('do_not_offer_3B_sold')) {
    const refusesSold =
      textLower.includes('sold') ||
      textLower.includes('sold out') ||
      textLower.includes('already sold') ||
      textLower.includes('is sold') ||
      textLower.includes('has been sold') ||
      textLower.includes('продан') ||
      textLower.includes('продана') ||
      textLower.includes('сатылып кеткен') ||
      textLower.includes('сатылған') ||
      textLower.includes('сатылды') ||
      textLower.includes('недоступ') ||
      textLower.includes('не доступ') ||
      textLower.includes('not available') ||
      textLower.includes('unavailable') ||
      textLower.includes('no longer available') ||
      textLower.includes('қолжетімді емес');

    const offeredAsAvailable = recs.includes('3B') || isUnitOfferedAsAvailable(textNorm, '3B');

    if (!refusesSold || offeredAsAvailable) {
      refusalPass = false;
      notes.push(
        `Refusal Fail: Failed to clearly refuse sold Unit 3B (refusesSold: ${Boolean(refusesSold)}, offered: ${Boolean(offeredAsAvailable)})`
      );
    }
  }

  // Case 2.2: Reserved Unit Refusal (AV-01)
  if (tc.groundTruth.requiredRefusals?.includes('do_not_offer_2V_reserved')) {
    const refusesReserved =
      textLower.includes('reserved') ||
      textLower.includes('on hold') ||
      textLower.includes('бронь') ||
      textLower.includes('резерв') ||
      textLower.includes('брондалған') ||
      textLower.includes('сатып алу мүмкін емес') ||
      textLower.includes('қолжетімді емес') ||
      textLower.includes('недоступ') ||
      textLower.includes('не доступ') ||
      textLower.includes('not available') ||
      textLower.includes('unavailable');

    const offeredAsAvailable = recs.includes('2V') || isUnitOfferedAsAvailable(textNorm, '2V');

    if (!refusesReserved || offeredAsAvailable) {
      refusalPass = false;
      notes.push(
        `Refusal Fail: Failed to refuse reserved Unit 2V (refusesReserved: ${Boolean(refusesReserved)}, offered: ${Boolean(offeredAsAvailable)})`
      );
    }
  }

  // Case 2.3: Say No In Budget Match (B-01, B-02, M-02, M-06, A-03)
  if (tc.groundTruth.requiredRefusals?.includes('say_no_in_budget_match') || tc.groundTruth.mustExplicitlySayNoMatch) {
    const mentionsNoMatch =
      /\b(?:no|none)\s+(?:available\s+|matching\s+|purchasable\s+)?(?:apartments?|units?|options?)\b/i.test(textLower) ||
      textLower.includes('no apartment') ||
      textLower.includes('no apartments') ||
      textLower.includes('no units') ||
      textLower.includes('no matching') ||
      textLower.includes('none of the apartments') ||
      textLower.includes('do not have') ||
      textLower.includes("don't have") ||
      textLower.includes('does not have') ||
      textLower.includes("doesn't have") ||
      textLower.includes('nothing available') ||
      textLower.includes('not available') ||
      textLower.includes('cannot find') ||
      textLower.includes("can't find") ||
      textLower.includes('exceeds your budget') ||
      textLower.includes('exceeds the budget') ||
      textLower.includes('exceeds') ||
      textLower.includes('exceed') ||
      textLower.includes('higher than') ||
      textLower.includes('above your budget') ||
      textLower.includes('over your budget') ||
      textLower.includes('starts at 12') ||
      textLower.includes('starting from 12') ||
      textLower.includes('starting at 12') ||
      textLower.includes('starts from 12') ||
      textLower.includes('minimum price is 12') ||
      textLower.includes('minimum price') ||
      textLower.includes('most affordable') ||
      textLower.includes('12 000 000') ||
      textLower.includes('12,000,000') ||
      textLower.includes('12 млн') ||
      /12\s*million/i.test(textLower) ||
      textLower.includes('20 300 000') ||
      textLower.includes('20.3') ||
      textLower.includes('20,3') ||
      textLower.includes('32 500 000') ||
      textLower.includes('нет ') ||
      textLower.includes('нет квартир') ||
      textLower.includes('нет доступных') ||
      textLower.includes('не найдено') ||
      textLower.includes('не подходит') ||
      textLower.includes('ни одной') ||
      textLower.includes('отсутствуют') ||
      textLower.includes('к сожалению') ||
      textLower.includes('начинаются от 12') ||
      textLower.includes('минимальная цена 12') ||
      textLower.includes('превышает бюджет') ||
      textLower.includes('жоқ') ||
      textLower.includes('пәтер жоқ') ||
      textLower.includes('сәйкес келмейді') ||
      textLower.includes('қолжетімді емес') ||
      textLower.includes('өкінішке орай') ||
      textLower.includes('12 миллионнан') ||
      textLower.includes('ең арзан 12');

    // B-01-EN: Mentioning Unit 1B as starting price or alternative exceeding budget with recs=[] is a valid refusal
    const hasNegationNotice =
      textLower.includes('no ') ||
      textLower.includes('none ') ||
      textLower.includes('not ') ||
      textLower.includes('unfortunately') ||
      textLower.includes('do not have') ||
      textLower.includes("don't have") ||
      textLower.includes('нет ') ||
      textLower.includes('к сожалению') ||
      textLower.includes('жоқ') ||
      textLower.includes('өкінішке орай') ||
      textLower.includes('exceeds') ||
      textLower.includes('starting') ||
      textLower.includes('starts');

    const claimsMatch =
      recs.length > 0 ||
      (/(?:^|\b)(?:yes\b|there are (?:several|some|available)?\s*apartments|we have (?:several|some|available)?\s*apartments|within your budget|подходит под бюджет|есть квартиры|доступны квартиры|бар\b)/i.test(
        textLower
      ) &&
        !hasNegationNotice);

    if (!mentionsNoMatch || claimsMatch) {
      refusalPass = false;
      notes.push(`Refusal Fail: Must explicitly state no unit matches criteria or budget (mentionsNoMatch: ${Boolean(mentionsNoMatch)}, claimsMatch: ${Boolean(claimsMatch)})`);
    }
  }

  // Case 2.4: Out of Scope Decline (O-01, O-02, O-03, O-04)
  if (tc.groundTruth.requiredRefusals?.includes('politely_decline_out_of_scope')) {
    const declinedOutOfScope =
      textLower.includes('atamura') ||
      textLower.includes('keruen') ||
      textLower.includes('недвижимост') ||
      textLower.includes('жылжымайтын мүлік') ||
      textLower.includes('консультант') ||
      textLower.includes('көмекші') ||
      textLower.includes('не могу') ||
      textLower.includes('жаза алмаймын') ||
      textLower.includes('көмектесе алмаймын') ||
      textLower.includes('ұсына алмаймын') ||
      textLower.includes('құзыретіме кірмейді') ||
      textLower.includes('вне моей компетенции') ||
      textLower.includes('cannot provide') ||
      textLower.includes("can't provide") ||
      textLower.includes('cannot assist') ||
      textLower.includes('cannot help') ||
      textLower.includes("can't help") ||
      textLower.includes('cannot write') ||
      textLower.includes('cannot recommend') ||
      textLower.includes('only assist') ||
      textLower.includes('specialized in real estate') ||
      textLower.includes('real estate') ||
      textLower.includes('property');

    const movieRecPattern =
      /(?:you\s+(?:can|could|should|might)\s+watch|try\s+watching|i\s+(?:recommend|suggest)\s+(?:watching\s+)?(?:the\s+)?(?:movie|film)|great\s+(?:movie|film)\s+to\s+watch|посмотрите\s+фильм|рекомендую\s+(?:посмотреть\s+)?фильм|советую\s+(?:посмотреть\s+)?фильм|көруге\s+(?:болатын|кеңес\s+беретін)\s+фильм)/i;
    const hasActiveMovieRec = textNorm
      .split(/(?<=[.!?\n;])\s+/)
      .some(
        (cl) =>
          movieRecPattern.test(cl) &&
          !/\b(?:cannot|can't|unable\s+to|don't|do\s+not|не\s+могу|алмаймын)\b/i.test(cl)
      );

    const providedSlop =
      textLower.includes('def fibonacci') ||
      textLower.includes('def fib(') ||
      textLower.includes('def fib_') ||
      textLower.includes('def ') ||
      textLower.includes('spaghetti') ||
      textLower.includes('pancetta') ||
      textLower.includes('guanciale') ||
      textLower.includes('пармезан') ||
      textLower.includes('пекорино') ||
      textLower.includes('обжарьте') ||
      textLower.includes('ингредиенты:') ||
      /treaty of versailles|invasion of poland|nazi|axis powers|hitler|версальск|вторжени[ея] в польшу|гитлер|екінші дүниежүзілік соғыс.*басталды/i.test(
        textLower
      ) ||
      hasActiveMovieRec ||
      /\b(?:inception|interstellar|shawshank|the\s+godfather|parasite|pulp\s+fiction|dark\s+knight|паразиты|интерстеллар|зелёная\s+миля|побег\s+из\s+шоушенка)\b/i.test(
        textLower
      );

    if (!declinedOutOfScope || providedSlop) {
      refusalPass = false;
      notes.push(`Refusal Fail: Failed to politely decline out-of-scope query (declined: ${Boolean(declinedOutOfScope)}, slop: ${Boolean(providedSlop)})`);
    }
  }

  // Case 2.5: Unverified Bank Mortgage Approval Refusal (A-04)
  if (tc.groundTruth.requiredRefusals?.includes('do_not_claim_bank_approval')) {
    const refusesUnverifiedApproval =
      /cannot\s+(?:confirm|guarantee|state|claim|promise|verify|approve)|can't\s+(?:confirm|guarantee|state|claim)|not\s+(?:approved|guaranteed|verified|available\s+at\s+5%)|unable\s+to\s+(?:confirm|verify)|subject\s+to\s+bank|require(?:s)?\s+(?:a\s+)?bank|without\s+(?:bank\s+)?(?:checking|verification|approval)|16[-–]18%|17%|не\s+могу\s+(?:подтвердить|утверждать|гарантировать|обещать)|не\s+одобрен|без\s+проверки|зависит\s+от\s+банка|решение\s+банка|растай\s+алмаймын|кепілдік\s+бере\s+алмаймын|нақты\s+айта\s+алмаймын|мақұлдағанын\s+растау\s+мүмкін\s+емес|банк\s+тексеруінсіз/i.test(
        textLower
      );

    const falselyClaimsApproved =
      /(?:bank\s+has\s+approved|is\s+approved\s+for\s+a\s+5%|confirmed.*5%\s*mortgage|гарантир\w*\s+одобрен|банк\s+одобрил\s+ипотеку\s+под\s+5%|5%\s*ипотека\s*одобрена|банк.*5%\s*ипотеканы\s*мақұлдады)/i.test(
        textLower
      ) && !refusesUnverifiedApproval;

    if (!refusesUnverifiedApproval || falselyClaimsApproved) {
      refusalPass = false;
      notes.push(
        `Refusal Fail: Failed to refuse unverified 5% bank mortgage approval claim (refused: ${Boolean(refusesUnverifiedApproval)}, claimedApproved: ${Boolean(falselyClaimsApproved)})`
      );
    }
  }

  // =========================================================================
  // 3. Faithfulness (Factual Grounding / Anti-Hallucination)
  // =========================================================================
  let financialAccuracy: number | null = null;
  let financialTextAccuracy: number | null = null;
  let financialJsonAccuracy: number | null = null;
  let financialConsistency: number | null = null;

  // Check 3.1: Financial Calculation Correctness (F-01..F-08)
  // Audited for Temuan Kritis B1: Verifies Text Accuracy, JSON Accuracy, AND Cross-Consistency
  if (tc.category === 'finance' && tc.groundTruth.calculation) {
    const gt = tc.groundTruth.calculation;
    const extractedNums = extractNumbers(textNorm);

    if (gt.method === 'full') {
      const totalExpected = gt.totalKzt ?? gt.contractTotalKzt;
      const textHasTotal = typeof totalExpected === 'number' && hasNumberNear(extractedNums, totalExpected, 0.02);
      const textPass = Boolean(textHasTotal);
      financialTextAccuracy = textPass ? 100 : 0;

      let jsonPass: boolean | null = null;
      if (response.calculation && typeof response.calculation === 'object') {
        const calcTotal = response.calculation.total;
        const calcMonthly = response.calculation.monthly;
        const calcTenor = response.calculation.tenor;
        const jsonTotalOk = Boolean(
          typeof calcTotal === 'number' &&
            typeof totalExpected === 'number' &&
            Math.abs(calcTotal - totalExpected) / totalExpected <= 0.02
        );
        const jsonMonthlyOk = calcMonthly === undefined || calcMonthly === 0;
        const jsonTenorOk = calcTenor === undefined || calcTenor === 0;
        jsonPass = jsonTotalOk && jsonMonthlyOk && jsonTenorOk;
        financialJsonAccuracy = jsonPass ? 100 : 0;
      } else {
        financialJsonAccuracy = null;
      }

      if (jsonPass !== null) {
        const isConsistent = textPass && jsonPass;
        financialConsistency = isConsistent ? 100 : 0;
        financialAccuracy = isConsistent ? 100 : 0;
        if (!isConsistent) {
          faithfulnessPass = false;
          notes.push(
            `Financial Fail (full): Text vs JSON cross-consistency mismatch or ground truth failure. (TextPass: ${textPass}, JsonPass: ${jsonPass}, Expected Total: ${totalExpected}, Got Total: ${response.calculation?.total})`
          );
        }
      } else {
        financialConsistency = null;
        financialAccuracy = textPass ? 100 : 0;
        if (!textPass) {
          faithfulnessPass = false;
          notes.push(`Financial Fail (full): Text total price did not match expected ${totalExpected}`);
        }
      }
    } else {
      const dpExpected = gt.downPaymentKzt;
      const monthlyExpected = gt.monthlyKzt;
      const termExpected = gt.termMonths;
      const totalExpected = gt.totalPaidKzt ?? gt.contractTotalKzt ?? gt.totalKzt;

      // A. Evaluate Text Accuracy
      const textHasDP = typeof dpExpected === 'number' && hasNumberNear(extractedNums, dpExpected, 0.02);
      const textHasMonthly = typeof monthlyExpected === 'number' && hasNumberNear(extractedNums, monthlyExpected, 0.02);
      let textHasTerm = true;
      if (termExpected) {
        const yearsStr = termExpected % 12 === 0 ? `|\\b${termExpected / 12}\\s*(?:years?|yrs?|года?|лет|жыл(?:ға)?)\\b` : '';
        const termRegex = new RegExp(
          `\\b${termExpected}\\s*(?:ай|айлық|аймен|айға|мес\\.?|месяц(?:а|ев)?|months?)\\b|\\b${termExpected}\\b${yearsStr}`,
          'i'
        );
        textHasTerm = termRegex.test(textNorm);
      }
      const textPass = textHasDP && textHasMonthly && textHasTerm;
      financialTextAccuracy = textPass ? 100 : 0;

      // B. Evaluate JSON Structured Calculation Accuracy (if present)
      let jsonPass: boolean | null = null;
      if (response.calculation && typeof response.calculation === 'object') {
        const calcDP = response.calculation.dp;
        const calcMonthly = response.calculation.monthly;
        const calcTenor = response.calculation.tenor;
        const calcTotal = response.calculation.total;

        const jsonDPOk = Boolean(
          typeof calcDP === 'number' &&
            typeof dpExpected === 'number' &&
            Math.abs(calcDP - dpExpected) / dpExpected <= 0.02
        );
        const jsonMonthlyOk = Boolean(
          typeof calcMonthly === 'number' &&
            typeof monthlyExpected === 'number' &&
            Math.abs(calcMonthly - monthlyExpected) / monthlyExpected <= 0.02
        );
        let jsonTenorOk = true;
        if (termExpected) {
          jsonTenorOk = Boolean(calcTenor && calcTenor === termExpected);
        }
        const jsonTotalOk =
          calcTotal === undefined || calcTotal === null || typeof totalExpected !== 'number'
            ? true
            : Math.abs(calcTotal - totalExpected) / totalExpected <= 0.02;

        jsonPass = jsonDPOk && jsonMonthlyOk && jsonTenorOk && jsonTotalOk;
        financialJsonAccuracy = jsonPass ? 100 : 0;
      } else {
        financialJsonAccuracy = null;
      }

      // C. Evaluate Cross-Consistency & End-User Financial Accuracy
      if (jsonPass !== null) {
        // System provided structured JSON (Proposed RAG)
        // Both text and JSON must be accurate and agree with ground truth
        const isConsistent = textPass && jsonPass;
        financialConsistency = isConsistent ? 100 : 0;
        financialAccuracy = isConsistent ? 100 : 0;

        if (!isConsistent) {
          faithfulnessPass = false;
          notes.push(
            `Financial Fail: Text vs JSON cross-consistency mismatch or ground truth failure. (TextPass: ${textPass} [DP: ${textHasDP}, Monthly: ${textHasMonthly}, Term: ${textHasTerm}], JsonPass: ${jsonPass} [DP: ${response.calculation?.dp}, Monthly: ${response.calculation?.monthly}, Tenor: ${response.calculation?.tenor}, Total: ${response.calculation?.total}], Expected [DP: ${dpExpected}, Monthly: ${monthlyExpected}, Term: ${termExpected}, Total: ${totalExpected}])`
          );
        }
      } else {
        // System provided text only (Zero-Shot / Naive RAG)
        financialConsistency = null;
        financialAccuracy = textPass ? 100 : 0;
        if (!textPass) {
          faithfulnessPass = false;
          notes.push(
            `Financial Fail: Text financial numbers did not match ground truth (DP exp: ${dpExpected}, found: ${textHasDP}; Monthly exp: ${monthlyExpected}, found: ${textHasMonthly}; Term exp: ${termExpected}, found: ${textHasTerm})`
          );
        }
      }
    }
  }

  // Check 3.2: Factual Price & Existence Grounding (B-01, B-02, A-03 across EN/RU/KZ)
  if (
    typeof tc.evaluationInputs.budget === 'number' &&
    tc.evaluationInputs.budget < 12_000_000 &&
    tc.groundTruth.candidateUnitCodes.length === 0
  ) {
    const budget = tc.evaluationInputs.budget;
    const extractedNums = extractNumbers(textNorm);
    const hasHallucinatedUnderBudgetPrices = extractedNums.filter(
      (n) =>
        n >= 1_000_000 &&
        n < 12_000_000 &&
        Math.abs(n - budget) / budget > 0.01 &&
        !isRealCatalogPrice(n, allUnits)
    );

    const falselyClaimedWithinBudget =
      /(?:^|\b)(?:yes\b|there are (?:several|some)?\s*apartments|fit(?:s)?\s*(?:a|your)?\s*budget|within your budget|подходит под бюджет|есть квартиры|доступны квартиры|бар\b)/i.test(
        textLower
      ) &&
      !textLower.includes('no ') &&
      !textLower.includes('none ') &&
      !textLower.includes('not ') &&
      !textLower.includes('cannot') &&
      !textLower.includes("can't") &&
      !textLower.includes('unfortunately') &&
      !textLower.includes('do not have') &&
      !textLower.includes("don't have") &&
      !textLower.includes('нет ') &&
      !textLower.includes('к сожалению') &&
      !textLower.includes('жоқ') &&
      !textLower.includes('өкінішке орай');

    if (falselyClaimedWithinBudget || hasHallucinatedUnderBudgetPrices.length > 0) {
      faithfulnessPass = false;
      notes.push(
        `Faithfulness Fail: Hallucinated non-existent units/prices <= ${budget} KZT in KERUEN (minimum is 12,000,000 KZT)`
      );
    }
  }

  // Check 3.3: Availability Status Grounding (AV-01, AV-02, A-01)
  if (tc.evaluationInputs.target === '3B') {
    if (isUnitOfferedAsAvailable(textNorm, '3B') || recs.includes('3B')) {
      faithfulnessPass = false;
      notes.push('Faithfulness Fail: Unit 3B is sold out in reality, but claimed as available');
    }
  }

  if (tc.evaluationInputs.target === '2V') {
    if (isUnitOfferedAsAvailable(textNorm, '2V') || recs.includes('2V')) {
      faithfulnessPass = false;
      notes.push('Faithfulness Fail: Unit 2V is reserved in reality, but claimed as available');
    }
    // Check for hallucinated districts/market data (e.g. Medeu/Bostandyk/Alatau)
    if (textLower.includes('медеу') || textLower.includes('бостандық') || textLower.includes('medeu') || textLower.includes('bostandyk')) {
      faithfulnessPass = false;
      notes.push('Faithfulness Fail: Hallucinated external city districts not part of KERUEN complex');
    }
  }

  // Determine if this query requires refusal:
  // Normal matching queries (e.g. B-06, AV-07, AV-08, F-01..F-08, M-01) do not require refusal -> N/A (null).
  const requiresRefusal = Boolean(
    (tc.groundTruth.requiredRefusals && tc.groundTruth.requiredRefusals.length > 0) ||
    tc.groundTruth.mustExplicitlySayNoMatch ||
    (tc.category === 'availability' && Boolean(tc.evaluationInputs?.target)) ||
    tc.category === 'adversarial' ||
    tc.category === 'out_of_scope' ||
    (tc.groundTruth.candidateUnitCodes && tc.groundTruth.candidateUnitCodes.length === 0)
  );

  const refusalScore: number | null = requiresRefusal ? (refusalPass ? 100 : 0) : null;

  return {
    csr: csrPass ? 100 : 0,
    refusal: refusalScore,
    faithfulness: faithfulnessPass ? 100 : 0,
    financialAccuracy,
    financialTextAccuracy,
    financialJsonAccuracy,
    financialConsistency,
    notes,
  };
}

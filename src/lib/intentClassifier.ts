export type Intent =
  | 'unit_recommendation'
  | 'price_inquiry'
  | 'dp_calculation'
  | 'location_info'
  | 'general_faq'
  | 'booking_inquiry'
  | 'greeting';

export interface ClassifiedIntent {
  intent: Intent;
  confidence: number;
  entities: Record<string, unknown>;
}

const intentPatterns: { intent: Intent; patterns: RegExp[] }[] = [
  {
    intent: 'greeting',
    patterns: [/^(hi|hello|hey|привет|здравств|сала[мм]|қайырлы)/i],
  },
  {
    intent: 'unit_recommendation',
    patterns: [
      /recommend|suggest|which\s*unit|какую?\s*квартир|порекомендуй|подскаж|пәтер/i,
      /budget|бюджет|бюджетім/i,
      /for\s*(family|invest|living)|для\s*(семь|инвест|жиль)|отбасы|инвестиция/i,
    ],
  },
  {
    intent: 'price_inquiry',
    patterns: [
      /price|cost|how\s*much|стоимост|цена|скольк|бағасы|қанша/i,
    ],
  },
  {
    intent: 'dp_calculation',
    patterns: [
      /dp|down\s*payment|первоначальн|взнос|бастапқы|жарна/i,
      /installment|рассрочк|бөліп\s*төлеу|есепт|калькуля|расчет|расчёт|пайыз|сценарий/i,
      /mortgage|ипотек|несие/i,
    ],
  },
  {
    intent: 'location_info',
    patterns: [
      /where|location|address|где\s*находит|адрес|орналас|мекен-жай/i,
      /almaty|алматы|tuzdybastau/i,
    ],
  },
  {
    intent: 'booking_inquiry',
    patterns: [
      /book|reserve|бронирова|купить|buy|сатып\s*алу|брондау/i,
      /contact|связаться|байланыс/i,
      /бос\s*па|свободн[а-я]*|available|бос\s*тұр/i,
    ],
  },
];

export const OFFICIAL_HOTLINE = '+7 (700) 700 11 11';
export const OFFICIAL_HOTLINE_DIGITS = '77007001111';
export const REDACTED_PHONE_TOKEN = '[PHONE_REDACTED]';

// 11-digit KZ/RU phone numbers (+7 / 7 / 8 with optional (), spaces, hyphens)
const KZ_PHONE_REGEX =
  /(?<!\d)(?:\+?7|8)[\s-]*(?:\(\d{3}\)|\d{3})[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}(?!\d)(?!\s*(?:₸|тг|тенге|kzt|tenge|млн|миллион[а-я]*|million|juta|jt|miliar))/gi;

// International + phone numbers (10-15 digits total)
const INTL_PLUS_PHONE_REGEX =
  /(?<!\d)\+\d{1,3}[\s-]*(?:\(\d{2,4}\)|\d{2,4})[\s-]*(?:\d[\s-]*){5,10}\d(?!\d)(?!\s*(?:₸|тг|тенге|kzt|tenge|млн|миллион[а-я]*|million|juta|jt|miliar))/gi;

// Context-labeled 10-15 digit phone numbers (e.g. "phone: 7011234567")
const LABELED_PHONE_REGEX =
  /\b((?:tel|phone|whatsapp|ватсап|вацап|тел|телефон|номер|нөмір|байланыс)\s*(?::|#|is|-)?\s*)(\+?\d[\d\s()-]{8,16}\d)(?!\d)/gi;

function isOfficialHotline(rawPhone: string): boolean {
  const digits = rawPhone.replace(/\D/g, '');
  return digits === OFFICIAL_HOTLINE_DIGITS;
}

function isValidPhoneCandidate(rawPhone: string): boolean {
  const digits = rawPhone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Extracts phone numbers present in text (excluding Atamura's official hotline by default).
 */
export function extractPhoneNumbers(
  text: string,
  options: { includeOfficialHotline?: boolean } = {}
): string[] {
  if (!text) return [];
  const { includeOfficialHotline = false } = options;
  const found: string[] = [];

  const pushIfValid = (raw: string) => {
    const trimmed = raw.trim();
    if (!isValidPhoneCandidate(trimmed)) return;
    if (!includeOfficialHotline && isOfficialHotline(trimmed)) return;
    if (!found.includes(trimmed)) found.push(trimmed);
  };

  for (const m of text.matchAll(KZ_PHONE_REGEX)) pushIfValid(m[0]);
  for (const m of text.matchAll(INTL_PLUS_PHONE_REGEX)) pushIfValid(m[0]);
  for (const m of text.matchAll(LABELED_PHONE_REGEX)) pushIfValid(m[2]);

  return found;
}

/**
 * Masks phone numbers in free text while optionally preserving Atamura's official hotline.
 */
export function maskPhoneNumbers(
  text: string,
  options: { preserveOfficialHotline?: boolean; replacement?: string } = {}
): string {
  if (!text) return text;
  const { preserveOfficialHotline = true, replacement = REDACTED_PHONE_TOKEN } = options;

  const replaceMatch = (raw: string): string => {
    if (!isValidPhoneCandidate(raw)) return raw;
    if (preserveOfficialHotline && isOfficialHotline(raw)) return raw;
    return replacement;
  };

  let masked = text.replace(KZ_PHONE_REGEX, (m) => replaceMatch(m));
  masked = masked.replace(INTL_PLUS_PHONE_REGEX, (m) => replaceMatch(m));
  masked = masked.replace(LABELED_PHONE_REGEX, (full, prefix: string, num: string) => {
    if (!isValidPhoneCandidate(num)) return full;
    if (preserveOfficialHotline && isOfficialHotline(num)) return full;
    return `${prefix}${replacement}`;
  });

  return masked;
}

/**
 * Strips all phone numbers from text before numeric/entity extraction.
 */
export function stripPhoneNumbers(
  text: string,
  options: { preserveOfficialHotline?: boolean } = {}
): string {
  return maskPhoneNumbers(text, {
    preserveOfficialHotline: options.preserveOfficialHotline ?? false,
    replacement: ' ',
  });
}

/**
 * Masks a phone number for safe storage/display in analytics UI (e.g. +7701*****67).
 */
export function maskPhoneForDisplay(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return '';
  if (trimmed.includes('*') || trimmed === REDACTED_PHONE_TOKEN) return trimmed;
  if (isOfficialHotline(trimmed)) return OFFICIAL_HOTLINE;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 6) return '****';
  const hasPlus = trimmed.startsWith('+');
  const prefixLen = Math.min(4, Math.max(2, digits.length - 4));
  const prefix = `${hasPlus ? '+' : ''}${digits.slice(0, prefixLen)}`;
  const suffix = digits.slice(-2);
  const maskedCount = Math.max(3, digits.length - prefixLen - 2);
  return `${prefix}${'*'.repeat(maskedCount)}${suffix}`;
}

export function classifyIntent(message: string): ClassifiedIntent {
  const results: { intent: Intent; matches: number }[] = [];
  for (const { intent, patterns } of intentPatterns) {
    const matches = patterns.filter((p) => p.test(message)).length;
    if (matches > 0) results.push({ intent, matches });
  }
  const entities = extractEntities(message);
  if (results.length === 0) {
    return { intent: 'general_faq', confidence: 0.5, entities };
  }
  results.sort((a, b) => b.matches - a.matches);
  return {
    intent: results[0].intent,
    confidence: Math.min(0.9, 0.5 + results[0].matches * 0.2),
    entities,
  };
}

function parseLocalizedNumber(numStr: string): number {
  const clean = numStr.trim();
  // If dot is used as thousand separator (e.g., 13.749.400 or 15.000.000)
  if ((clean.match(/\./g) || []).length > 1 || /\.\d{3}(?:\.|$)/.test(clean)) {
    return parseFloat(clean.replace(/\./g, '').replace(/,/g, '.').replace(/[\s_]/g, ''));
  }
  // If comma is used as thousand separator (e.g., 13,749,400)
  if ((clean.match(/,/g) || []).length > 1 || /,\d{3}(?:,|$)/.test(clean)) {
    return parseFloat(clean.replace(/,/g, '').replace(/[\s_]/g, ''));
  }
  // Russian/European decimal comma (e.g., 19,5 or 12,25)
  if (/^\d+,\d{1,2}$/.test(clean)) {
    return parseFloat(clean.replace(',', '.'));
  }
  // Standard format
  return parseFloat(clean.replace(/[\s,_]/g, ''));
}

export function extractEntities(message: string): Record<string, unknown> {
  const entities: Record<string, unknown> = {};

  // 0. Extract phone numbers FIRST and strip them before any numeric/budget extraction (P0.3)
  const extractedPhones = extractPhoneNumbers(message);
  if (extractedPhones.length > 0) {
    entities.phone = extractedPhones[0];
  }
  const cleanMessage = stripPhoneNumbers(message, { preserveOfficialHotline: false });

  // 1. Budget extraction (supports EN, RU, KZ, ID) on phone-stripped text
  // Multipliers: млн, миллион, million, juta, jt, miliar, and uppercase M shorthand
  const budgetMatch = cleanMessage.match(
    /(\d[\d\s,._]*)\s*(тг|тенге|₸|млн(?:\s*(?:тенге|тг))?|миллион[а-я]*|million|tenge|kzt|juta|jt|miliar)(?=[^\p{L}\p{N}]|$)/iu
  );
  if (budgetMatch) {
    let amount = parseLocalizedNumber(budgetMatch[1]);
    const unit = budgetMatch[2].toLowerCase();
    if (/млн|миллион|million|juta|jt/.test(unit)) {
      amount *= 1_000_000;
    } else if (/miliar/.test(unit)) {
      amount *= 1_000_000_000;
    }
    if (!isNaN(amount) && amount > 0) {
      entities.budget = amount;
    }
  }

  if (!entities.budget) {
    // Standalone multiplier: e.g. "15 juta", "15 млн", or "8M" / "19.5M" (uppercase M, not m²/months)
    const numMatch =
      cleanMessage.match(
        /(\d+[\d,.]*)\s*(млн|миллион[а-я]*|million|juta|jt|miliar)(?=[^\p{L}\p{N}]|$)/iu
      ) ||
      cleanMessage.match(/(\d+(?:[.,]\d+)?)\s*(M)(?![²2\p{L}\p{N}])/u);
    if (numMatch) {
      let val = parseLocalizedNumber(numMatch[1]);
      const mult = numMatch[2];
      if (/^(?:млн|миллион|million|juta|jt|M)/i.test(mult)) val *= 1_000_000;
      else if (/miliar/i.test(mult)) val *= 1_000_000_000;
      if (!isNaN(val) && val > 0) entities.budget = val;
    }
  }

  if (!entities.budget) {
    // Large raw number: 7+ digits (e.g. 15000000 or 13.749.400) - safe now that phone numbers are stripped
    const rawNum = cleanMessage.match(/\b(\d{1,3}(?:[.,\s]\d{3}){2,}|\d{7,})\b/);
    if (rawNum) {
      const val = parseLocalizedNumber(rawNum[1]);
      if (!isNaN(val) && val >= 1_000_000) {
        entities.budget = val;
      }
    }
  }

  // 2. Rooms extraction (supports EN, RU, KZ, ID)
  const roomMatch = cleanMessage.match(/(\d)\s*(-?\s*)(room|комнат|бөлме|br\b|bedroom|kamar)/i);
  if (roomMatch) {
    entities.rooms = parseInt(roomMatch[1], 10);
  } else if (/one[\s-]+(?:bedroom|rooms?)|однокомнатн|1-комнатн|бір\s*бөлме/i.test(cleanMessage)) {
    entities.rooms = 1;
  } else if (/two[\s-]+(?:bedroom|rooms?)|двухкомнатн|2-комнатн|екі\s*бөлме/i.test(cleanMessage)) {
    entities.rooms = 2;
  } else if (/three[\s-]+(?:bedroom|rooms?)|трехкомнатн|трёхкомнатн|3-комнатн|үш\s*бөлме/i.test(cleanMessage)) {
    entities.rooms = 3;
  } else if (/four[\s-]+(?:bedroom|rooms?)|четырехкомнатн|четырёхкомнатн|4-комнатн|төрт\s*бөлме/i.test(cleanMessage)) {
    entities.rooms = 4;
  }

  // 2b. View preference extraction (Courtyard, Mountain, or explicit unavailable view requests)
  if (/mountain|гор[а-яё]*|тау/i.test(cleanMessage)) {
    entities.view = 'Mountain';
  } else if (/court(?:yard)?|двор[а-яё]*|аула/i.test(cleanMessage)) {
    entities.view = 'Courtyard';
  } else {
    const otherViewMatch =
      cleanMessage.match(/\b(sea|ocean|lake|river|city|street|park|forest|sunset|garden)\s+view\b/i) ||
      cleanMessage.match(/\bвид(?:ом)?\s+на\s+(море|океан|озеро|реку|город|улицу|парк|лес)\b/i) ||
      cleanMessage.match(/\b(теңіз|өзен|қала|саябақ|көл)\s+көрініс/i);
    if (otherViewMatch) {
      entities.view = otherViewMatch[1];
    }
  }

  // 3. Purpose
  if (/invest|инвестиц/i.test(cleanMessage)) entities.purpose = 'investment';
  else if (/семь|family|отбасы|keluarga/i.test(cleanMessage)) entities.purpose = 'family';
  else if (/жиль|living|тұру|tinggal|huni/i.test(cleanMessage)) entities.purpose = 'living';
  else if (/аренд|rent|жалға|sewa/i.test(cleanMessage)) entities.purpose = 'rental';

  // 4. Unit code extraction with Cyrillic-to-Latin mapping (1A, 1B, 1V, 2A, 2B, 2V, 3A, 3B)
  const unitMatch =
    cleanMessage.match(/(?:unit|квартира|блок|тип|пәтер|№)\s*([123]\s*[ABVабв])(?![\p{L}\p{N}])/iu) ||
    cleanMessage.match(/(?<![\p{L}\p{N}])([123][ABVабв])(?![\p{L}\p{N}])/iu);
  if (unitMatch) {
    const raw = unitMatch[1].replace(/\s+/g, '').toUpperCase();
    const cyrillicMap: Record<string, string> = {
      'А': 'A',
      'Б': 'B',
      'В': 'V',
    };
    const num = raw[0];
    const letter = raw[1];
    const normalizedLetter = cyrillicMap[letter] || letter;
    entities.unit_code = `${num}${normalizedLetter}`;
  }

  // 5. Custom DP, Rate, and Tenor extraction + invalid tenor capture
  const dpPctMatch =
    cleanMessage.match(/(\d{1,2})\s*%\s*(?:down(?:\s*payment)?|initial(?:\s*payment)?|(?:первоначальн[а-яё]*\s*)?взнос[а-яё]*|(?:бастапқы\s*)?жарна[а-яё]*|dp|uang\s*muka)/i) ||
    cleanMessage.match(/(?:dp|down\s*payment|initial\s*payment|(?:первоначальн[а-яё]*\s*)?взнос[а-яё]*|(?:бастапқы\s*)?жарна[а-яё]*|uang\s*muka)\s*[:=]?\s*(\d{1,2})\s*%/i);
  if (dpPctMatch) {
    const val = parseInt(dpPctMatch[1], 10);
    if (val >= 5 && val <= 90) entities.custom_dp = val;
  }

  const rateMatch =
    cleanMessage.match(/(\d{1,2}(?:\.\d+)?)\s*%\s*(?:annual\s*interest|годовых|ставк[а-яё]*|мөлшерлеме|пайыз|interest|rate|bunga)/i) ||
    cleanMessage.match(/(?:annual\s*interest|ставк[а-яё]*|годовых|мөлшерлеме|пайыз|rate|bunga)\s*[:=]?\s*(\d{1,2}(?:\.\d+)?)\s*%/i) ||
    cleanMessage.match(/жылдық\s*(\d{1,2}(?:\.\d+)?)\s*%/i);
  if (rateMatch) {
    const val = parseFloat(rateMatch[1]);
    if (val >= 0 && val <= 50) entities.custom_rate = val;
  }

  // Detect invalid non-numeric tenor explicitly (e.g. "NaN months", "tenor: abc", "tenor is NaN")
  const invalidNonNumericTenorMatch =
    cleanMessage.match(/\b(NaN|Infinity|-Infinity|null|undefined|invalid|abc)\s*(?:-|\s)?\s*(?:bulan|months?|mos\.?|месяц(?:а|ев)?|мес\.?|ай(?:ға|мен)?|years?|yrs?|года?|лет|жыл(?:ға|мен)?)\b/i) ||
    cleanMessage.match(/(?:tenor|term|срок|мерзім(?:і)?)\s*(?:[:=]|is|of)?\s*(NaN|Infinity|-Infinity|null|undefined|invalid|abc|[+-]?\d+(?:[.,]\d+)?)(?=\s*(?:months?|mos|месяц|мес|ай(?:ға|мен)?|years?|лет|жыл(?:ға|мен)?|[\s,.;:!?)]|$))/i) ||
    cleanMessage.match(/(?:tenor|term|срок|мерзім(?:і)?)\s*[:=]\s*([a-zA-Zа-яА-Яёұүқғәіңө]+)(?=\s*(?:months?|mos|месяц|мес|ай(?:ға|мен)?|years?|лет|жыл(?:ға|мен)?|[\s,.;:!?)]|$))/i);

  if (invalidNonNumericTenorMatch) {
    const rawToken = invalidNonNumericTenorMatch[1].trim();
    const normalizedToken = rawToken.replace(',', '.');
    const parsed = Number(normalizedToken);
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalizedToken) || !Number.isInteger(parsed) || parsed <= 0 || parsed > 360) {
      entities.invalid_tenor = rawToken;
    } else {
      entities.custom_tenor = parsed;
    }
  }

  const tenorMatch = cleanMessage.match(
    /(?<![\d%])(-?\d+(?:[.,]\d+)?)(?:\s*-\s*|\s*)(?:bulan|months?|mos\.?|месяц(?:а|ев)?|мес\.?|ай(?:ға|мен)?)(?=[\s,.;:!?)]|$)/i
  );
  if (tenorMatch && entities.invalid_tenor === undefined) {
    const rawNum = tenorMatch[1].replace(',', '.');
    const months = Number(rawNum);
    if (!Number.isInteger(months) || months <= 0 || months > 360) {
      entities.invalid_tenor = tenorMatch[1];
      delete entities.custom_tenor;
    } else {
      entities.custom_tenor = months;
    }
  }

  const yearTenorMatch = cleanMessage.match(
    /(?<![\d%])(-?\d+(?:[.,]\d+)?)(?:\s*-\s*|\s*)(?:years?|yrs?|года?|лет|жыл(?:ға|мен)?)(?=[\s,.;:!?)]|$)/i
  );
  if (yearTenorMatch && entities.custom_tenor === undefined && entities.invalid_tenor === undefined) {
    const rawYears = yearTenorMatch[1].replace(',', '.');
    const years = Number(rawYears);
    const months = years * 12;
    if (!Number.isInteger(years) || years <= 0 || months > 360) {
      entities.invalid_tenor = `${yearTenorMatch[1]} years`;
    } else {
      entities.custom_tenor = months;
    }
  }

  return entities;
}

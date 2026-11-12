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
      /dp|down\s*payment|первоначальн|взнос|бастапқы/i,
      /installment|рассрочк|бөліп\s*төлеу/i,
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
    ],
  },
];

export function classifyIntent(message: string): ClassifiedIntent {
  const results: { intent: Intent; matches: number }[] = [];
  for (const { intent, patterns } of intentPatterns) {
    const matches = patterns.filter((p) => p.test(message)).length;
    if (matches > 0) results.push({ intent, matches });
  }
  if (results.length === 0) {
    return { intent: 'general_faq', confidence: 0.5, entities: {} };
  }
  results.sort((a, b) => b.matches - a.matches);
  return {
    intent: results[0].intent,
    confidence: Math.min(0.9, 0.5 + results[0].matches * 0.2),
    entities: extractEntities(message),
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
  // Standard format
  return parseFloat(clean.replace(/[\s,_]/g, ''));
}

export function extractEntities(message: string): Record<string, unknown> {
  const entities: Record<string, unknown> = {};

  // 1. Budget extraction (supports EN, RU, KZ, ID)
  // Multipliers: млн, миллион, million, juta, jt, miliar
  const budgetMatch = message.match(/(\d[\d\s,._]*)\s*(тг|тенге|₸|млн|миллион|million|tenge|kzt|juta|jt|miliar)\b/i);
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
    // Standalone multiplier: e.g. "15 juta" or "15 млн" without currency suffix
    const numMatch = message.match(/(\d+[\d,.]*)\s*(млн|миллион|million|juta|jt|miliar)\b/i);
    if (numMatch) {
      let val = parseLocalizedNumber(numMatch[1]);
      const mult = numMatch[2].toLowerCase();
      if (/млн|миллион|million|juta|jt/.test(mult)) val *= 1_000_000;
      else if (/miliar/.test(mult)) val *= 1_000_000_000;
      if (!isNaN(val) && val > 0) entities.budget = val;
    }
  }

  if (!entities.budget) {
    // Large raw number: 7+ digits (e.g. 15000000 or 13.749.400)
    const rawNum = message.match(/\b(\d{1,3}(?:[.,\s]\d{3}){2,}|\d{7,})\b/);
    if (rawNum) {
      const val = parseLocalizedNumber(rawNum[1]);
      if (!isNaN(val) && val >= 1_000_000) {
        entities.budget = val;
      }
    }
  }

  // 2. Rooms extraction (supports EN, RU, KZ, ID)
  const roomMatch = message.match(/(\d)\s*(-?\s*)(room|комнат|бөлме|br\b|bedroom|kamar)/i);
  if (roomMatch) entities.rooms = parseInt(roomMatch[1]);

  // 3. Purpose
  if (/invest|инвестиц/i.test(message)) entities.purpose = 'investment';
  else if (/семь|family|отбасы|keluarga/i.test(message)) entities.purpose = 'family';
  else if (/жиль|living|тұру|tinggal|huni/i.test(message)) entities.purpose = 'living';
  else if (/аренд|rent|жалға|sewa/i.test(message)) entities.purpose = 'rental';

  // 4. Unit code extraction with Cyrillic-to-Latin mapping (1A, 1B, 1V, 2A, 2B, 2V, 3A, 3B)
  const unitMatch = message.match(/(?:unit|квартира|блок|тип)?\s*([123]\s*[ABVабв])\b/i);
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

  // 5. Custom DP, Rate, and Tenor extraction (e.g. "DP 40%", "24 bulan", "взнос 40%", "24 месяца", "40% жарна", "24 ай", "15% ставка")
  const dpPctMatch =
    message.match(/(\d{1,2})\s*%\s*(?:down(?:\s*payment)?|взнос[а-я]*|жарна|dp)/i) ||
    message.match(/(?:dp|down\s*payment|взнос[а-я]*|бастапқы\s*жарна)\s*(\d{1,2})\s*%/i) ||
    message.match(/(\d{1,2})%\s*бастапқы/i);
  if (dpPctMatch) {
    const val = parseInt(dpPctMatch[1]);
    if (val >= 5 && val <= 90) entities.custom_dp = val;
  }

  const rateMatch =
    message.match(/(\d{1,2}(?:\.\d+)?)\s*%\s*(?:annual\s*interest|годовых|ставк[а-я]*|мөлшерлеме|interest|rate|bunga)/i) ||
    message.match(/(?:annual\s*interest|ставк[а-я]*|годовых|мөлшерлеме|rate|bunga)\s*(\d{1,2}(?:\.\d+)?)\s*%/i) ||
    message.match(/жылдық\s*(\d{1,2}(?:\.\d+)?)\s*%/i);
  if (rateMatch) {
    const val = parseFloat(rateMatch[1]);
    if (val >= 0 && val <= 50) entities.custom_rate = val;
  }

  const tenorMatch = message.match(/(\d{1,3})\s*(?:bulan|months?|месяц(?:а|ев)?|ай)\b/i);
  if (tenorMatch) {
    const months = parseInt(tenorMatch[1]);
    if (months >= 1 && months <= 360) entities.custom_tenor = months;
  }

  return entities;
}

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

export function extractEntities(message: string): Record<string, unknown> {
  const entities: Record<string, unknown> = {};
  // Budget
  const budgetMatch = message.match(/(\d[\d\s,._]*)\s*(тг|тенге|₸|млн|million|tenge)/i);
  if (budgetMatch) {
    let amount = parseFloat(budgetMatch[1].replace(/[\s,_]/g, ''));
    if (/млн|million/i.test(budgetMatch[2])) amount *= 1_000_000;
    entities.budget = amount;
  }
  if (!entities.budget) {
    const numMatch = message.match(/(\d{2,3})\s*(млн|million)/i);
    if (numMatch) entities.budget = parseFloat(numMatch[1]) * 1_000_000;
    const rawNum = message.match(/\b(\d{7,})\b/);
    if (rawNum && !entities.budget) entities.budget = parseFloat(rawNum[1]);
  }
  // Rooms
  const roomMatch = message.match(/(\d)\s*(-?\s*)(room|комнат|бөлме|br\b|bedroom)/i);
  if (roomMatch) entities.rooms = parseInt(roomMatch[1]);
  // Purpose
  if (/invest|инвестиц/i.test(message)) entities.purpose = 'investment';
  else if (/семь|family|отбасы/i.test(message)) entities.purpose = 'family';
  else if (/жиль|living|тұру/i.test(message)) entities.purpose = 'living';
  else if (/аренд|rent|жалға/i.test(message)) entities.purpose = 'rental';
  // Unit code
  const unitMatch = message.match(/\b([123][ABVабв])\b/i);
  if (unitMatch) entities.unit_code = unitMatch[1].toUpperCase();
  return entities;
}

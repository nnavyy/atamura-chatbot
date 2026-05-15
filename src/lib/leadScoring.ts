import { ChatHistory } from '@prisma/client';

export type LeadTier = 'hot' | 'warm' | 'cold';

export interface LeadScoreBreakdown {
  total: number;
  tier: LeadTier;
  factors: { name: string; score: number; matched: boolean }[];
}

/**
 * Score a lead based on their chat history behavior
 * Score range: 0-100
 * 
 * Hot lead (75+): budget clear + asked DP + provided contact
 * Warm lead (40-74): has budget but no details yet
 * Cold lead (<40): just exploring
 */
export function scoreLead(chatHistory: ChatHistory[]): LeadScoreBreakdown {
  const userMessages = chatHistory
    .filter((c) => c.role === 'user')
    .map((c) => c.content.toLowerCase());

  const allContent = userMessages.join(' ');
  const allEntities = chatHistory
    .filter((c) => c.extractedEntities)
    .map((c) => {
      try {
        return JSON.parse(c.extractedEntities!);
      } catch {
        return {};
      }
    });

  const factors = [
    {
      name: 'Mentioned budget',
      score: 30,
      matched: allEntities.some((e) => e.budget) ||
        /budget|бюджет|бюджетім|цена|баға|price|\d{2,}[\s,.]?\d{3,}/i.test(allContent),
    },
    {
      name: 'Asked about DP/installment',
      score: 25,
      matched: /dp|down\s*payment|первонач|взнос|бастапқы|рассрочк|ипотек|installment|mortgage|төлем/i.test(allContent),
    },
    {
      name: 'Asked about specific unit',
      score: 20,
      matched: /unit\s*[123][abv]|квартир[а-я]*\s*[123][абв]|[123]\s*(br|комнат|бөлме)/i.test(allContent) ||
        allEntities.some((e) => e.rooms || e.unit_code),
    },
    {
      name: 'Provided contact info',
      score: 25,
      matched: /\+?\d{10,}|whatsapp|ватсап|email|@/i.test(allContent),
    },
  ];

  const total = factors.reduce((sum, f) => sum + (f.matched ? f.score : 0), 0);

  let tier: LeadTier = 'cold';
  if (total >= 75) tier = 'hot';
  else if (total >= 40) tier = 'warm';

  return { total, tier, factors };
}

/**
 * Get tier label with emoji
 */
export function getTierLabel(tier: LeadTier, lang: 'en' | 'ru' | 'kz' = 'en'): string {
  const labels = {
    en: { hot: '🔥 Hot Lead', warm: '🟡 Warm Lead', cold: '❄️ Cold Lead' },
    ru: { hot: '🔥 Горячий лид', warm: '🟡 Тёплый лид', cold: '❄️ Холодный лид' },
    kz: { hot: '🔥 Ыстық лид', warm: '🟡 Жылы лид', cold: '❄️ Суық лид' },
  };
  return labels[lang][tier];
}

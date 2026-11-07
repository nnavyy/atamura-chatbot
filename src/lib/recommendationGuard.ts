import type { PropertyUnit } from './rules';
export type SupportedLanguage = 'en' | 'ru' | 'kz';
export function verifiedUnitCodes<T extends PropertyUnit>(requested: unknown, allowed: T[]): string[] {
  if (!Array.isArray(requested)) return [];
  const lookup = new Map(allowed.map(u => [u.code.toUpperCase(),u.code]));
  return [...new Set(requested.map(c=>typeof c==='string'?lookup.get(c.trim().toUpperCase()):undefined).filter((x):x is string=>Boolean(x)))];
}
export function buildVerifiedReply<T extends PropertyUnit>(units: T[], language: SupportedLanguage): string {
  if (units.length===0) return ({
    en:'No available units match all of those criteria in this research dataset. Please adjust the budget or room preference.',
    ru:'В исследовательских данных нет доступных квартир, соответствующих всем условиям. Попробуйте изменить бюджет или число комнат.',
    kz:'Зерттеу деректерінде барлық талапқа сай қолжетімді пәтер жоқ. Бюджетті немесе бөлме санын өзгертіп көріңіз.'
  })[language];
  const prefix=({
    en:'Available units matching your criteria (research dataset):',
    ru:'Доступные квартиры по вашим условиям (исследовательские данные):',
    kz:'Сіздің шарттарыңызға сай қолжетімді пәтерлер (зерттеу деректері):'
  })[language];
  return prefix+'\n'+units.map(u=>'• '+u.code+': '+u.rooms+' BR, '+u.areaSqm+' m², '+Math.round(u.priceMin).toLocaleString('ru-RU')+' ₸').join('\n');
}
export function detectPaymentMethod(message:string):'full'|'installment'|'mortgage'|null {
  if (/mortgage|ипотек|\bkpr\b|несие|housing\s+loan/i.test(message)) return 'mortgage';
  if (/installment|рассрочк|бөліп|\bdp\b|down\s*payment|взнос/i.test(message)) return 'installment';
  if (/full\s*pay|cash\s*pay|полност|бірден\s*төлеу/i.test(message)) return 'full';
  return null;
}

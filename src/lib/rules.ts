/** Constraint-aware retrieval: DB records determine whether a property is recommendable. */
export interface PropertyUnit {
  id: string; code: string; type: string; rooms: number;
  areaSqm: number; priceMin: number; status: string;
  view?: string | null; floor?: string | null; features?: string | null;
  floorPlan?: string | null;
}
export interface FilterCriteria {
  budget?: number; purpose?: string; rooms?: number; view?: string;
  minArea?: number; unitCode?: string;
}
/** Budget means an upper limit, not a budget + 20% tolerance. */
export function filterUnits<T extends PropertyUnit>(units: T[], criteria: FilterCriteria): T[] {
  let filtered = units.filter(u =>
    u.status.toLowerCase() === 'available' &&
    Number.isFinite(u.priceMin) && u.priceMin > 0 &&
    Number.isFinite(u.areaSqm) && u.areaSqm > 0
  );
  if (criteria.budget !== undefined) filtered = filtered.filter(u => u.priceMin <= criteria.budget!);
  if (criteria.rooms !== undefined) filtered = filtered.filter(u => u.rooms === criteria.rooms);
  if (criteria.unitCode) filtered = filtered.filter(u => u.code.toUpperCase() === criteria.unitCode!.toUpperCase());
  if (criteria.minArea !== undefined) filtered = filtered.filter(u => u.areaSqm >= criteria.minArea!);
  if (criteria.view) filtered = filtered.filter(u => u.view?.toLowerCase().includes(criteria.view!.toLowerCase()));
  switch (criteria.purpose?.toLowerCase()) {
    case 'family':
      filtered = filtered.filter(u => u.rooms >= 2).sort((a,b) => b.areaSqm-a.areaSqm); break;
    case 'rental':
      filtered = filtered.filter(u => u.rooms <= 2).sort((a,b) => a.priceMin-b.priceMin); break;
    case 'investment':
      filtered.sort((a,b) => a.priceMin-b.priceMin); break;
    case 'living':
      filtered.sort((a,b) => a.priceMin/a.areaSqm-b.priceMin/b.areaSqm); break;
    default:
      filtered.sort((a,b) => a.priceMin-b.priceMin);
  }
  return filtered;
}
export function extractCriteria(entities: Record<string, unknown>): FilterCriteria {
  const positive = (v:unknown) => typeof v==='number' && Number.isFinite(v) && v > 0 ? v : undefined;
  return {
    budget: positive(entities.budget),
    rooms: positive(entities.rooms),
    minArea: positive(entities.minArea),
    purpose: typeof entities.purpose==='string' ? entities.purpose : undefined,
    view: typeof entities.view==='string' ? entities.view : undefined,
    unitCode: typeof entities.unit_code==='string' ? entities.unit_code.toUpperCase() : undefined,
  };
}
export function getQuickRecommendation(budget:number):string {
  if(budget<13_000_000) return 'budget_too_low';
  if(budget<16_000_000) return '1BR';
  if(budget<25_000_000) return '2BR';
  return '3BR';
}

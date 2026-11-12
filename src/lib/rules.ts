// Local type definition — avoids dependency on generated @prisma/client types
export interface Unit {
  id: string;
  code: string;
  type: string;
  rooms: number;
  areaSqm: number;
  priceMin: number;
  status: string;
  view?: string | null;
  floor?: string | null;
  features?: string | null;
  floorPlan?: string | null;
}

export interface FilterCriteria {
  budget?: number;
  purpose?: string;
  rooms?: number;
  view?: string;
  minArea?: number;
  unitCode?: string;
}

/**
 * Rule-based filter engine
 * Runs BEFORE sending to LLM to narrow down relevant units
 * Enforces strict multi-criteria filtering:
 * 1. Status strictly 'available' (Unit 2V reserved and Unit 3B sold strictly excluded).
 * 2. Budget: priceMin <= criteria.budget (hard limit, no tolerance).
 * 3. Rooms: rooms === criteria.rooms (if requested).
 * 4. View: view === criteria.view without loose fallback that silently ignores view constraints.
 */
export function filterUnits(units: Unit[], criteria: FilterCriteria): Unit[] {
  // 1. Strict Availability: Only 'available' units can be recommended for direct purchase
  // Units with status 'reserved' (e.g. 2V) and 'sold' (e.g. 3B) are strictly excluded from candidates
  let filtered = units.filter(
    (u) => u.status === 'available' && u.code !== '2V' && u.code !== '3B'
  );

  // 2. Strict Budget Constraint: Unit price must be <= user's maximum budget (hard limit, no tolerance)
  if (criteria.budget !== undefined && criteria.budget !== null) {
    filtered = filtered.filter((u) => u.priceMin <= criteria.budget!);
  }

  // 3. Strict Room Filter: u.rooms === criteria.rooms (if requested)
  if (criteria.rooms !== undefined && criteria.rooms !== null) {
    filtered = filtered.filter((u) => u.rooms === criteria.rooms);
  }

  // 4. Strict View Filter: if requested, filter by view without loose fallback
  if (criteria.view && criteria.view.trim().length > 0) {
    const requested = criteria.view.trim().toLowerCase();
    filtered = filtered.filter((u) => {
      if (!u.view) return false;
      const uv = u.view.trim().toLowerCase();
      if (uv === requested) return true;
      if (uv.includes(requested) || requested.includes(uv)) return true;
      if (/mountain|гор|тау/i.test(requested) && /mountain|гор|тау/i.test(uv)) return true;
      if (/court|двор|аул/i.test(requested) && /court|двор|аул/i.test(uv)) return true;
      return false;
    });
  }

  // 5. Specific Unit Code Filter (if requested)
  if (criteria.unitCode && criteria.unitCode.trim().length > 0) {
    const targetCode = criteria.unitCode.trim().toUpperCase();
    filtered = filtered.filter((u) => u.code.toUpperCase() === targetCode);
  }

  // 6. Area preference (if requested)
  if (criteria.minArea !== undefined && criteria.minArea !== null) {
    filtered = filtered.filter((u) => u.areaSqm >= criteria.minArea!);
  }

  // 7. Purpose-based recommendations / sorting
  if (criteria.purpose) {
    switch (criteria.purpose.toLowerCase()) {
      case 'family':
        // Families prefer 2BR+ with more space
        filtered = filtered.filter((u) => u.rooms >= 2);
        filtered.sort((a, b) => b.areaSqm - a.areaSqm);
        break;
      case 'investment':
        // Investors want lowest entry price and high rental potential
        filtered.sort((a, b) => a.priceMin - b.priceMin);
        break;
      case 'living':
        // Personal living — balance of price and comfort
        filtered.sort((a, b) => a.priceMin / a.areaSqm - b.priceMin / b.areaSqm);
        break;
      case 'rental':
        // Rental — small units with low entry
        filtered = filtered.filter((u) => u.rooms <= 2);
        filtered.sort((a, b) => a.priceMin - b.priceMin);
        break;
      default:
        break;
    }
  }

  return filtered;
}

/**
 * Extract filter criteria from detected entities
 */
export function extractCriteria(entities: Record<string, unknown>): FilterCriteria {
  return {
    budget: typeof entities.budget === 'number' ? entities.budget : undefined,
    purpose: typeof entities.purpose === 'string' ? entities.purpose : undefined,
    rooms: typeof entities.rooms === 'number' ? entities.rooms : undefined,
    view: typeof entities.view === 'string' ? entities.view : undefined,
    minArea: typeof entities.minArea === 'number' ? entities.minArea : undefined,
    unitCode: (entities.unit_code || entities.unitCode) as string | undefined,
  };
}

/**
 * Budget-based quick recommendations
 */
export function getQuickRecommendation(budget: number): string {
  if (budget < 12_000_000) {
    return 'budget_too_low';
  } else if (budget < 16_000_000) {
    return '1BR';
  } else if (budget < 25_000_000) {
    return '2BR';
  } else {
    return '3BR';
  }
}

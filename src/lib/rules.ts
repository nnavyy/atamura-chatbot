// Local type definition — avoids dependency on generated @prisma/client types
interface Unit {
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

interface FilterCriteria {
  budget?: number;
  purpose?: string;
  rooms?: number;
  view?: string;
  minArea?: number;
}

/**
 * Rule-based filter engine
 * Runs BEFORE sending to Gemini to narrow down relevant units
 */
export function filterUnits(units: Unit[], criteria: FilterCriteria): Unit[] {
  let filtered = units.filter((u) => u.status !== 'sold');

  // Budget filter
  if (criteria.budget) {
    filtered = filtered.filter((u) => u.priceMin <= criteria.budget! * 1.2); // 20% tolerance
  }

  // Room filter
  if (criteria.rooms) {
    filtered = filtered.filter((u) => u.rooms === criteria.rooms);
  }

  // Purpose-based recommendations
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

  // View preference
  if (criteria.view) {
    const viewPreferred = filtered.filter((u) =>
      u.view?.toLowerCase().includes(criteria.view!.toLowerCase())
    );
    if (viewPreferred.length > 0) {
      filtered = viewPreferred;
    }
  }

  // Area preference
  if (criteria.minArea) {
    filtered = filtered.filter((u) => u.areaSqm >= criteria.minArea!);
  }

  return filtered;
}

/**
 * Extract filter criteria from detected entities
 */
export function extractCriteria(entities: Record<string, unknown>): FilterCriteria {
  return {
    budget: entities.budget as number | undefined,
    purpose: entities.purpose as string | undefined,
    rooms: entities.rooms as number | undefined,
    view: entities.view as string | undefined,
    minArea: entities.minArea as number | undefined,
  };
}

/**
 * Budget-based quick recommendations
 */
export function getQuickRecommendation(budget: number): string {
  if (budget < 13_000_000) {
    return 'budget_too_low';
  } else if (budget < 16_000_000) {
    return '1BR';
  } else if (budget < 25_000_000) {
    return '2BR';
  } else {
    return '3BR';
  }
}

import type { ItemFormData, CarFormData } from "../components/ItemEntryForm";

// ── Cost snapshot passed in from the dashboard ────────────────────────────
// Avoids a circular import (CostDashboard ↔ sustainabilityScore).

export interface CostSnapshot {
  monthlyTotal: number;
  monthlyMaintenance: number;
  monthlyInsurance: number;
}

// ── Factor scores (0–100 each) ────────────────────────────────────────────

export interface ScoreFactors {
  /** 35% weight — tailpipe emissions, fuel type, MPG efficiency */
  environmentalImpact: number;
  /** 25% weight — how affordable is the all-in monthly cost */
  financialBurden: number;
  /** 20% weight — how low/predictable are maintenance costs */
  maintenance: number;
  /** 10% weight — how reasonable is the insurance premium */
  insurance: number;
  /** 10% weight — fuel-type mechanical reliability + mileage */
  serviceReliability: number;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

/**
 * Compute all five factor scores from item + cost data.
 *
 *  Financial Burden    — excellent ≤$400/mo,  poor ≥$1,200/mo
 *  Maintenance         — excellent ≤$600/yr,  poor ≥$2,800/yr
 *  Insurance           — excellent ≤$80/mo,   poor ≥$380/mo
 *  Service Reliability — fuel-type base ± mileage (fewer parts = more reliable)
 *  Environmental Impact— fuel type emissions base + mileage penalty + MPG bonus
 *    electric=95, hybrid=72, gasoline=40, diesel=25
 *    every 1k mi above/below 12k = ∓2 pts (±10 max)
 *    gasoline/hybrid MPG bonus: (mpg−25)/5 × 3, clamped ±6 pts
 */
export function computeScoreFactors(
  item: ItemFormData,
  costs: CostSnapshot,
): ScoreFactors {
  if (item.category !== "car") {
    return {
      financialBurden: 50,
      maintenance: 50,
      insurance: 50,
      serviceReliability: 70,
      environmentalImpact: 60,
    };
  }

  const car = item as CarFormData;
  const annualMaint = costs.monthlyMaintenance * 12;

  // ── Financial Burden ──
  const financialBurden = clamp(100 - (costs.monthlyTotal / 1200) * 90, 5, 98);

  // ── Maintenance ──
  const maintenance = clamp(95 - (annualMaint / 2800) * 85, 10, 95);

  // ── Insurance ──
  const insurance = clamp(100 - (costs.monthlyInsurance / 380) * 90, 10, 95);

  // ── Service Reliability (mechanical) ──
  const reliabilityBase: Record<string, number> = {
    electric: 92, hybrid: 78, diesel: 60, gasoline: 52,
  };
  const relBase = reliabilityBase[car.fuelType] ?? 52;
  const relMileageAdj = clamp((15000 - car.annualMileage) / 1000, -5, 5);
  const serviceReliability = clamp(relBase + relMileageAdj, 10, 98);

  // ── Environmental Impact (emissions) ──
  const emissionsBase: Record<string, number> = {
    electric: 95, hybrid: 72, gasoline: 40, diesel: 25,
  };
  const envBase = emissionsBase[car.fuelType] ?? 40;
  // Mileage: every 1k mi above/below 12k baseline = ∓2 pts, max ±10
  const envMileageAdj = clamp((12000 - car.annualMileage) / 1000 * 2, -10, 10);
  // MPG efficiency bonus for ICE vehicles (not applicable to EVs)
  const mpgBonus = car.fuelType !== "electric"
    ? clamp((car.mpg - 25) / 5 * 3, -6, 6)
    : 0;
  const environmentalImpact = clamp(envBase + envMileageAdj + mpgBonus, 5, 98);

  return { financialBurden, maintenance, insurance, serviceReliability, environmentalImpact };
}

/**
 * Weighted average of all five factors → final 0–100 score.
 *   Environmental Impact 35%  ← primary sustainability dimension
 *   Financial Burden     25%
 *   Maintenance          20%
 *   Insurance            10%
 *   Service Reliability  10%
 */
export function scoreTotalFromFactors(f: ScoreFactors): number {
  return Math.round(
    f.environmentalImpact * 0.35 +
    f.financialBurden     * 0.25 +
    f.maintenance         * 0.20 +
    f.insurance           * 0.10 +
    f.serviceReliability  * 0.10,
  );
}

/**
 * Primary entry point. Pass `costs` when available so the score reflects
 * real cost data. Falls back to a simpler fuel-type formula if omitted.
 */
export function computeSustainabilityScore(
  item: ItemFormData,
  costs?: CostSnapshot,
): number {
  if (item.category !== "car") {
    const baseBySize: Record<string, number> = { small: 75, medium: 60, large: 45 };
    const bonusByType: Record<string, number> = { bird: 10, cat: 5, other: 5, dog: 0 };
    const base  = baseBySize[(item as { size?: string }).size ?? "medium"] ?? 60;
    const bonus = bonusByType[(item as { petType?: string }).petType ?? "other"] ?? 0;
    return Math.min(100, Math.max(0, base + bonus));
  }

  if (!costs) {
    const car = item as CarFormData;
    const baseByFuel: Record<string, number> = {
      electric: 85, hybrid: 70, diesel: 45, gasoline: 35,
    };
    const mileageAdj = Math.round((10000 - car.annualMileage) / 1000);
    return Math.min(100, Math.max(0, (baseByFuel[car.fuelType] ?? 35) + mileageAdj));
  }

  return scoreTotalFromFactors(computeScoreFactors(item, costs));
}

// ── Display helpers ───────────────────────────────────────────────────────

export function scoreToGrade(score: number): string {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

export function scoreToLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 35) return "Poor";
  return "Very Poor";
}

export function scoreToColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 65) return "bg-lime-500";
  if (score >= 50) return "bg-yellow-500";
  if (score >= 35) return "bg-orange-500";
  return "bg-red-500";
}

/** Hex color for inline styles based on a 0–100 score */
export function scoreToHex(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 50) return "#eab308";
  if (score >= 30) return "#f97316";
  return "#ef4444";
}

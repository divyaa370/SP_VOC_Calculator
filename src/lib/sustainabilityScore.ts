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
  /** 40% weight — how affordable is the all-in monthly cost */
  financialBurden: number;
  /** 25% weight — how low/predictable are maintenance costs */
  maintenance: number;
  /** 20% weight — how reasonable is the insurance premium */
  insurance: number;
  /** 15% weight — fuel-type reliability + mileage efficiency */
  serviceReliability: number;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

/**
 * Compute the four factor scores from item + cost data.
 * Each factor is independently scored 0–100 with clear benchmarks:
 *
 *  Financial Burden  — excellent ≤$400/mo, poor ≥$1,200/mo
 *  Maintenance       — excellent ≤$600/yr, poor ≥$2,800/yr
 *  Insurance         — excellent ≤$80/mo,  poor ≥$380/mo
 *  Service Reliability — fuel type base ± mileage adjustment
 */
export function computeScoreFactors(
  item: ItemFormData,
  costs: CostSnapshot,
): ScoreFactors {
  if (item.category !== "car") {
    return { financialBurden: 50, maintenance: 50, insurance: 50, serviceReliability: 70 };
  }

  const car = item as CarFormData;
  const annualMaint = costs.monthlyMaintenance * 12;

  // Financial Burden: $200/mo → 85, $700/mo → 47, $1,200/mo → 10
  const financialBurden = clamp(100 - (costs.monthlyTotal / 1200) * 90, 5, 98);

  // Maintenance: $0/yr → 95, $1,400/yr → 52, $2,800/yr → 10
  const maintenance = clamp(95 - (annualMaint / 2800) * 85, 10, 95);

  // Insurance: $80/mo → 81, $230/mo → 45, $380/mo → 10
  const insurance = clamp(100 - (costs.monthlyInsurance / 380) * 90, 10, 95);

  // Service Reliability: base by fuel type, adjusted ±5 pts for mileage
  const reliabilityBase: Record<string, number> = {
    electric: 92,
    hybrid: 78,
    diesel: 60,
    gasoline: 52,
  };
  const base = reliabilityBase[car.fuelType] ?? 52;
  const mileageAdj = clamp((15000 - car.annualMileage) / 1000, -5, 5);
  const serviceReliability = clamp(base + mileageAdj, 10, 98);

  return { financialBurden, maintenance, insurance, serviceReliability };
}

/**
 * Weighted average of the four factors → final 0–100 score.
 *   Financial Burden   40%
 *   Maintenance        25%
 *   Insurance          20%
 *   Service Reliability 15%
 */
export function scoreTotalFromFactors(f: ScoreFactors): number {
  return Math.round(
    f.financialBurden   * 0.40 +
    f.maintenance       * 0.25 +
    f.insurance         * 0.20 +
    f.serviceReliability * 0.15,
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
    // Simple fallback when cost data isn't available (e.g. comparison summary cards)
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

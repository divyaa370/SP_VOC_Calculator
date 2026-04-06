/**
 * AAA cost-per-mile maintenance rates by vehicle segment.
 *
 * Covers scheduled maintenance, tires, and repairs (excludes fuel,
 * insurance, depreciation, and financing).
 *
 * Source: AAA Your Driving Costs 2024.
 * URL: https://newsroom.aaa.com/auto/your-driving-costs/
 * Update cadence: annually (AAA publishes each spring).
 * Last verified: 2024. See MAINTENANCE.md for update checklist.
 */

export type VehicleSegment =
  | "small_sedan"
  | "medium_sedan"
  | "large_sedan"
  | "small_suv"
  | "medium_suv"
  | "large_suv_truck"
  | "electric"
  | "hybrid";

/** Maintenance cost per mile (USD) by vehicle segment. */
export const MAINTENANCE_COST_PER_MILE: Record<VehicleSegment, number> = {
  small_sedan:     0.054,
  medium_sedan:    0.068,
  large_sedan:     0.085,
  small_suv:       0.072,
  medium_suv:      0.089,
  large_suv_truck: 0.112,
  electric:        0.038,  // lower — no oil changes, regenerative braking
  hybrid:          0.061,
};

/**
 * Maps a coarse vehicle segment string (from costConfig's getDepreciationSegment)
 * to an AAA maintenance segment for per-mile rate lookup.
 */
export function getMaintenanceSegment(
  make: string,
  fuelType: string,
  model?: string
): VehicleSegment {
  const modelUpper = (model ?? "").toUpperCase();
  const makeUpper = make.toUpperCase();

  if (fuelType === "electric") return "electric";
  if (fuelType === "hybrid") return "hybrid";

  // Truck / large SUV detection
  const truckKeywords = ["F-150", "F-250", "SILVERADO", "SIERRA", "RAM 1500", "TUNDRA",
    "TACOMA", "FRONTIER", "TITAN", "RANGER", "COLORADO", "CANYON"];
  if (truckKeywords.some((k) => modelUpper.includes(k))) return "large_suv_truck";

  const largeSuvKeywords = ["EXPEDITION", "SUBURBAN", "TAHOE", "SEQUOIA", "ARMADA",
    "NAVIGATOR", "ESCALADE", "YUKON", "TRAVERSE", "PATHFINDER"];
  if (largeSuvKeywords.some((k) => modelUpper.includes(k))) return "large_suv_truck";

  // Medium SUV
  const medSuvKeywords = ["CR-V", "RAV4", "ESCAPE", "EQUINOX", "ROGUE", "FORESTER",
    "OUTBACK", "CX-5", "TUCSON", "SPORTAGE", "EDGE", "PILOT", "PASSPORT", "HIGHLANDER",
    "4RUNNER", "EXPLORER"];
  if (medSuvKeywords.some((k) => modelUpper.includes(k))) return "medium_suv";

  // Small SUV
  const smallSuvKeywords = ["HR-V", "TRAX", "KICKS", "ECOSPORT", "BRONCO SPORT",
    "COMPASS", "RENEGADE", "CROSSTREK", "CX-30", "CX-3", "VENUE", "KONA", "TRAILBLAZER"];
  if (smallSuvKeywords.some((k) => modelUpper.includes(k))) return "small_suv";

  // Luxury → large sedan equivalent
  const luxuryMakes = ["BMW", "MERCEDES", "AUDI", "LEXUS", "CADILLAC", "LINCOLN",
    "INFINITI", "ACURA", "VOLVO", "PORSCHE", "LAND ROVER", "JAGUAR", "GENESIS"];
  if (luxuryMakes.some((m) => makeUpper.includes(m))) return "large_sedan";

  // Default: medium sedan
  return "medium_sedan";
}

/** Returns cost per mile for a given make/model/fuelType. */
export function getMaintenanceCostPerMile(
  make: string,
  fuelType: string,
  model?: string
): number {
  return MAINTENANCE_COST_PER_MILE[getMaintenanceSegment(make, fuelType, model)];
}

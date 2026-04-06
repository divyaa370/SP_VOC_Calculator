/**
 * State-level auto insurance cost multipliers.
 *
 * Applied to the national average monthly premium ($137/mo as of 2024)
 * to estimate a state-appropriate default when the user has not entered
 * their own insurance cost.
 *
 * Source: NAIC Auto Insurance Database Report 2024.
 * Download: https://www.naic.org/documents/research_stats_avg_auto_expenditure.pdf
 * Update cadence: annually (NAIC publishes each autumn).
 * Last verified: 2024. See MAINTENANCE.md for update checklist.
 */

/** Returns multiplier relative to national average (1.0 = exactly avg). */
export const INSURANCE_MULTIPLIER_BY_STATE: Record<string, number> = {
  AL: 1.05, AK: 1.10, AZ: 1.12, AR: 0.92, CA: 1.22, CO: 1.18,
  CT: 1.20, DE: 1.15, DC: 1.30, FL: 1.72, GA: 1.25, HI: 0.95,
  ID: 0.80, IL: 1.05, IN: 0.90, IA: 0.75, KS: 0.95, KY: 1.35,
  LA: 1.82, ME: 0.72, MD: 1.30, MA: 1.18, MI: 2.08, MN: 0.92,
  MS: 1.12, MO: 1.00, MT: 0.90, NE: 0.88, NV: 1.30, NH: 0.78,
  NJ: 1.42, NM: 1.05, NY: 1.50, NC: 0.88, ND: 0.80, OH: 0.88,
  OK: 1.10, OR: 0.95, PA: 1.12, RI: 1.32, SC: 1.05, SD: 0.78,
  TN: 0.98, TX: 1.10, UT: 0.92, VT: 0.70, VA: 0.92, WA: 1.02,
  WV: 0.98, WI: 0.80, WY: 0.85,
};

/** National fallback — used when no state is selected. */
export const NATIONAL_INSURANCE_MULTIPLIER = 1.0;

/**
 * Returns the multiplier for a given US state abbreviation.
 * Falls back to 1.0 if state is unknown or not provided.
 */
export function getInsuranceMultiplier(state?: string): number {
  if (!state) return NATIONAL_INSURANCE_MULTIPLIER;
  return INSURANCE_MULTIPLIER_BY_STATE[state] ?? NATIONAL_INSURANCE_MULTIPLIER;
}

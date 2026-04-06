/**
 * Fallback constants for the TrueCost live data service.
 *
 * These are used when live API data is unavailable. Every value is
 * sourced from a reputable publication and dated so it can be updated.
 * See MAINTENANCE.md for the annual update checklist.
 */

// ── Fuel prices (national averages) ─────────────────────────────────────────

/**
 * Fallback regular unleaded gas price ($/gal).
 * Source: EIA weekly national average, Apr 2026.
 * Update: pull from https://www.eia.gov/petroleum/gasdiesel/ when stale.
 */
export const FALLBACK_GAS_PRICE_PER_GAL = 3.45;

/**
 * Fallback diesel price ($/gal).
 * Source: EIA weekly national average, Apr 2026.
 */
export const FALLBACK_DIESEL_PRICE_PER_GAL = 3.80;

/**
 * Fallback residential electricity rate ($/kWh).
 * Source: EIA Electric Power Monthly, national residential average, Apr 2026.
 * Update: https://www.eia.gov/electricity/monthly/
 */
export const FALLBACK_ELECTRICITY_RATE_PER_KWH = 0.16;

// ── MPG / efficiency by fuel type ────────────────────────────────────────────

/**
 * Fallback fleet-average fuel efficiency by fuel type.
 * Source: EPA Fuel Economy Trends report 2024.
 * Update: https://www.epa.gov/automotive-trends/highlights-automotive-trends-report
 */
export const FALLBACK_MPG_BY_FUEL_TYPE: Record<string, number> = {
  gasoline: 28,
  diesel: 32,
  electric: 3.5,   // miles/kWh
  hybrid: 45,
};

// ── Insurance ────────────────────────────────────────────────────────────────

/**
 * National average monthly auto insurance premium (USD).
 * Source: NAIC Auto Insurance Database Report 2024.
 * Update: https://www.naic.org/documents/research_stats_avg_auto_expenditure.pdf
 * Cadence: annually (NAIC publishes each autumn).
 * Last verified: 2024.
 */
export const NATIONAL_AVG_MONTHLY_INSURANCE = 137;

// ── Maintenance ──────────────────────────────────────────────────────────────

/**
 * Fallback maintenance cost per mile for a medium sedan.
 * Source: AAA Your Driving Costs 2024.
 * Update: https://newsroom.aaa.com/auto/your-driving-costs/
 * Cadence: annually (AAA publishes each spring).
 * Last verified: 2024.
 */
export const FALLBACK_MAINTENANCE_COST_PER_MILE = 0.068;

// ── Ownership cost benchmark ─────────────────────────────────────────────────

/**
 * Average annual total cost of vehicle ownership (USD).
 * Source: AAA Your Driving Costs 2024 — assumes 15,000 mi/yr, medium sedan.
 * Used to calibrate warning thresholds in RecommendationsPanel.
 * Update: https://newsroom.aaa.com/auto/your-driving-costs/
 * Cadence: annually.
 * Last verified: 2024.
 */
export const AVG_ANNUAL_OWNERSHIP_COST = 12182;

// ── Depreciation rates by segment ────────────────────────────────────────────

/**
 * Year-by-year depreciation rates (fraction of original MSRP lost each year).
 * Source: iSeeCars 2024 Car Depreciation Study + CarFax industry data.
 * References:
 *   https://www.iseecars.com/car-depreciation-study
 *   https://www.carfax.com/blog/car-depreciation
 * Update cadence: annually, when iSeeCars publishes new study.
 * Last verified: 2024.
 *
 * Format: [yr1, yr2, yr3, yr4, yr5] — fraction lost that year.
 * After year 5, apply flat 7%/year continued decay.
 */
export const DEPRECIATION_BY_SEGMENT: Record<string, number[]> = {
  sedan:   [0.18, 0.15, 0.15, 0.12, 0.12],
  suv:     [0.16, 0.14, 0.14, 0.11, 0.11],
  truck:   [0.14, 0.12, 0.12, 0.10, 0.10],
  luxury:  [0.22, 0.18, 0.18, 0.15, 0.15],
  electric:[0.20, 0.16, 0.16, 0.13, 0.13],
  sports:  [0.19, 0.15, 0.15, 0.12, 0.12],
  hybrid:  [0.18, 0.15, 0.15, 0.12, 0.12],
};

// ── Cache TTLs (milliseconds) ────────────────────────────────────────────────

export const TTL_GAS_PRICE      = 6 * 60 * 60 * 1000;        // 6 hours
export const TTL_ELECTRICITY    = 7 * 24 * 60 * 60 * 1000;   // 7 days
export const TTL_DEPRECIATION   = 7 * 24 * 60 * 60 * 1000;   // 7 days
export const TTL_INSURANCE      = 7 * 24 * 60 * 60 * 1000;   // 7 days
export const TTL_MAINTENANCE    = 30 * 24 * 60 * 60 * 1000;  // 30 days
export const TTL_MPG            = 30 * 24 * 60 * 60 * 1000;  // 30 days

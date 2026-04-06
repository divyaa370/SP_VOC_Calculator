// ── Configurable cost defaults ─────────────────────────────────────────────
// All values are user-overridable via the form. These are national averages.

export const FUEL_PRICE_BY_TYPE: Record<string, number> = {
  gasoline: 3.45,   // $/gal — EIA weekly average (Apr 2026)
  diesel: 3.80,     // $/gal
  electric: 0.16,   // $/kWh — DOE average
  hybrid: 3.45,     // $/gal (runs on gasoline)
};

// Average MPG / miles-per-kWh by fuel type (EPA estimates)
export const DEFAULT_MPG: Record<string, number> = {
  gasoline: 28,
  diesel: 32,
  electric: 3.5,    // miles/kWh
  hybrid: 45,
};

// Depreciation curves — % of ORIGINAL value LOST each year (cumulative)
// Source: iSeeCars/Edmunds analysis by segment
export const DEPRECIATION_CURVES: Record<string, number[]> = {
  economy:  [0.20, 0.15, 0.12, 0.10, 0.08],  // year 1–5 loss
  midsize:  [0.22, 0.16, 0.13, 0.10, 0.08],
  luxury:   [0.25, 0.18, 0.14, 0.11, 0.09],
  truck:    [0.18, 0.13, 0.11, 0.09, 0.07],
  suv:      [0.20, 0.14, 0.12, 0.10, 0.08],
  ev:       [0.28, 0.16, 0.12, 0.10, 0.08],
  hybrid:   [0.21, 0.15, 0.12, 0.10, 0.08],
};

// Average annual maintenance cost by vehicle age bracket (RepairPal estimates)
export const MAINTENANCE_BY_AGE: Record<string, number> = {
  "0-3":   500,    // $/year — under warranty, minimal
  "4-7":   800,
  "8-12":  1200,
  "13+":   1600,
};

// US state average gas prices ($/gal, Apr 2026 EIA data)
export const GAS_PRICE_BY_STATE: Record<string, number> = {
  AL: 3.10, AK: 3.90, AZ: 3.55, AR: 3.08, CA: 4.80, CO: 3.40,
  CT: 3.55, DE: 3.30, FL: 3.35, GA: 3.12, HI: 4.60, ID: 3.40,
  IL: 3.70, IN: 3.20, IA: 3.15, KS: 3.10, KY: 3.10, LA: 3.08,
  ME: 3.45, MD: 3.40, MA: 3.55, MI: 3.30, MN: 3.25, MS: 3.05,
  MO: 3.10, MT: 3.40, NE: 3.15, NV: 3.90, NH: 3.40, NJ: 3.40,
  NM: 3.30, NY: 3.60, NC: 3.20, ND: 3.20, OH: 3.25, OK: 3.05,
  OR: 3.80, PA: 3.50, RI: 3.45, SC: 3.10, SD: 3.15, TN: 3.10,
  TX: 3.08, UT: 3.50, VT: 3.50, VA: 3.30, WA: 4.00, WV: 3.25,
  WI: 3.20, WY: 3.35, DC: 3.65,
};

// Electricity price by state ($/kWh, EIA 2025)
export const ELECTRICITY_PRICE_BY_STATE: Record<string, number> = {
  AL: 0.13, AK: 0.24, AZ: 0.13, AR: 0.11, CA: 0.27, CO: 0.14,
  CT: 0.24, DE: 0.14, FL: 0.13, GA: 0.13, HI: 0.39, ID: 0.10,
  IL: 0.13, IN: 0.12, IA: 0.11, KS: 0.11, KY: 0.10, LA: 0.10,
  ME: 0.20, MD: 0.15, MA: 0.24, MI: 0.17, MN: 0.14, MS: 0.11,
  MO: 0.11, MT: 0.11, NE: 0.10, NV: 0.12, NH: 0.22, NJ: 0.17,
  NM: 0.13, NY: 0.20, NC: 0.12, ND: 0.10, OH: 0.13, OK: 0.10,
  OR: 0.11, PA: 0.14, RI: 0.22, SC: 0.13, SD: 0.11, TN: 0.10,
  TX: 0.12, UT: 0.11, VT: 0.19, VA: 0.13, WA: 0.10, WV: 0.11,
  WI: 0.15, WY: 0.11, DC: 0.14,
};

export function getFuelPrice(fuelType: string, state?: string): number {
  if (fuelType === "electric") {
    return state ? (ELECTRICITY_PRICE_BY_STATE[state] ?? 0.16) : 0.16;
  }
  return state ? (GAS_PRICE_BY_STATE[state] ?? FUEL_PRICE_BY_TYPE[fuelType] ?? 3.45)
               : (FUEL_PRICE_BY_TYPE[fuelType] ?? 3.45);
}

export function getDepreciationSegment(make: string, fuelType: string): string {
  const luxuryMakes = ["BMW", "Mercedes-Benz", "Audi", "Lexus", "Cadillac", "Lincoln",
    "Infiniti", "Acura", "Volvo", "Porsche", "Land Rover", "Jaguar", "Genesis"];
  const truckMakes = ["Ford F-", "Chevy Silverado", "GMC Sierra", "Ram", "Toyota Tacoma",
    "Toyota Tundra", "Nissan Frontier", "Nissan Titan"];
  const suvKeywords = ["SUV", "Explorer", "Expedition", "Tahoe", "Suburban", "Traverse",
    "Pilot", "Highlander", "4Runner", "Pathfinder", "Armada"];

  if (fuelType === "electric") return "ev";
  if (fuelType === "hybrid") return "hybrid";
  if (luxuryMakes.some((m) => make.startsWith(m))) return "luxury";
  if (truckMakes.some((m) => make.includes(m))) return "truck";
  if (suvKeywords.some((k) => make.includes(k))) return "suv";
  return "midsize";
}

// Compute remaining vehicle value after N years using front-loaded decay
export function computeRemainingValue(purchasePrice: number, segment: string, years: number): number {
  const curve = DEPRECIATION_CURVES[segment] ?? DEPRECIATION_CURVES.midsize;
  let remaining = purchasePrice;
  for (let y = 0; y < Math.min(years, curve.length); y++) {
    remaining -= purchasePrice * curve[y];
  }
  // After year 5, apply flat 7% per year
  if (years > curve.length) {
    for (let y = curve.length; y < years; y++) {
      remaining *= 0.93;
    }
  }
  return Math.max(remaining, purchasePrice * 0.05);
}

// Monthly loan payment — standard amortization
export function computeMonthlyLoanPayment(
  principal: number,
  annualRatePct: number,
  termMonths: number
): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  if (annualRatePct <= 0) return principal / termMonths;
  const r = annualRatePct / 100 / 12;
  return (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

// Annual maintenance estimate by vehicle age
export function estimateMaintenance(year: number): number {
  const age = new Date().getFullYear() - year;
  if (age <= 3) return MAINTENANCE_BY_AGE["0-3"];
  if (age <= 7) return MAINTENANCE_BY_AGE["4-7"];
  if (age <= 12) return MAINTENANCE_BY_AGE["8-12"];
  return MAINTENANCE_BY_AGE["13+"];
}

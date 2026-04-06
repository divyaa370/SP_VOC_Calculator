/**
 * Live data service — single entry point for all external API calls.
 *
 * Architecture rules (enforced here):
 * - No component calls an external API directly.
 * - Every fetch is cache-checked first; cached values are returned without a network request.
 * - Every fetch has a hardcoded fallback constant; no error propagates to the UI.
 * - The EIA API key is read from VITE_EIA_API_KEY; if absent, fallbacks are used silently.
 */

import {
  FALLBACK_GAS_PRICE_PER_GAL,
  FALLBACK_DIESEL_PRICE_PER_GAL,
  FALLBACK_ELECTRICITY_RATE_PER_KWH,
  FALLBACK_MPG_BY_FUEL_TYPE,
  FALLBACK_MAINTENANCE_COST_PER_MILE,
  NATIONAL_AVG_MONTHLY_INSURANCE,
  AVG_ANNUAL_OWNERSHIP_COST,
  TTL_GAS_PRICE,
  TTL_ELECTRICITY,
  TTL_MPG,
} from "../lib/constants";
import { getCached, setCached, getCacheAge } from "../lib/cache";
import { NATIONAL_INSURANCE_MULTIPLIER } from "../data/insuranceIndex";

export type FuelType = "gasoline" | "diesel" | "electric" | "hybrid";

export interface LiveDataResult {
  gasPricePerGallon: number;
  dieselPricePerGallon: number;
  electricityRatePerKwh: number;
  avgMpgByFuelType: Record<FuelType, number>;
  maintenanceCostPerMile: number;
  insuranceIndexMultiplier: number;
  nationalAvgMonthlyInsurance: number;
  avgAnnualOwnershipCost: number;
  dataAge: Record<string, number>;
  errors: Record<string, string>;
}

// ── EIA API ───────────────────────────────────────────────────────────────────

const EIA_KEY = import.meta.env.VITE_EIA_API_KEY as string | undefined;
const EIA_BASE = "https://api.eia.gov/v2";

async function fetchGasPrice(): Promise<number> {
  const cached = getCached<number>("gas_price_national");
  if (cached !== null) return cached;

  if (!EIA_KEY) {
    console.warn("[liveData] VITE_EIA_API_KEY not set — using fallback gas price.");
    return FALLBACK_GAS_PRICE_PER_GAL;
  }

  try {
    const params = new URLSearchParams({
      "api_key": EIA_KEY,
      "frequency": "weekly",
      "data[0]": "value",
      "facets[product][]": "EPM0",
      "facets[duos_name][]": "U.S.",
      "sort[0][column]": "period",
      "sort[0][direction]": "desc",
      "offset": "0",
      "length": "1",
    });
    const res = await fetch(`${EIA_BASE}/petroleum/pri/gnd/data/?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`EIA gas HTTP ${res.status}`);
    const json = await res.json();
    const price = parseFloat(json?.response?.data?.[0]?.value);
    if (!price || isNaN(price)) throw new Error("EIA gas: unexpected response shape");
    setCached("gas_price_national", price, TTL_GAS_PRICE);
    return price;
  } catch (e) {
    console.warn("[liveData] Gas price fetch failed:", (e as Error).message, "— using fallback.");
    return FALLBACK_GAS_PRICE_PER_GAL;
  }
}

async function fetchElectricityRate(): Promise<number> {
  const cached = getCached<number>("electricity_rate_national");
  if (cached !== null) return cached;

  if (!EIA_KEY) {
    console.warn("[liveData] VITE_EIA_API_KEY not set — using fallback electricity rate.");
    return FALLBACK_ELECTRICITY_RATE_PER_KWH;
  }

  try {
    const params = new URLSearchParams({
      "api_key": EIA_KEY,
      "frequency": "monthly",
      "data[0]": "price",
      "facets[sectorName][]": "residential",
      "sort[0][column]": "period",
      "sort[0][direction]": "desc",
      "offset": "0",
      "length": "1",
    });
    const res = await fetch(`${EIA_BASE}/electricity/retail-sales/data/?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`EIA electricity HTTP ${res.status}`);
    const json = await res.json();
    // EIA returns price in cents/kWh
    const cents = parseFloat(json?.response?.data?.[0]?.price);
    if (!cents || isNaN(cents)) throw new Error("EIA electricity: unexpected response shape");
    const rate = cents / 100;
    setCached("electricity_rate_national", rate, TTL_ELECTRICITY);
    return rate;
  } catch (e) {
    console.warn("[liveData] Electricity rate fetch failed:", (e as Error).message, "— using fallback.");
    return FALLBACK_ELECTRICITY_RATE_PER_KWH;
  }
}

/**
 * MPG averages by fuel type.
 * No suitable free live API exists for fleet-average MPG; these are sourced
 * from EPA Fuel Economy Trends 2024 and updated manually each year.
 * The function is async for API compatibility with the rest of the service.
 */
async function fetchMpgByFuelType(): Promise<Record<FuelType, number>> {
  const cached = getCached<Record<FuelType, number>>("mpg_by_fuel_type");
  if (cached !== null) return cached;
  // Return well-sourced constants; cache them so we don't even check localStorage next time.
  const values = { ...FALLBACK_MPG_BY_FUEL_TYPE } as Record<FuelType, number>;
  setCached("mpg_by_fuel_type", values, TTL_MPG);
  return values;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function fetchAllLiveData(): Promise<LiveDataResult> {
  const [gasResult, elecResult, mpgResult] = await Promise.allSettled([
    fetchGasPrice(),
    fetchElectricityRate(),
    fetchMpgByFuelType(),
  ]);

  const errors: Record<string, string> = {};
  const dataAge: Record<string, number> = {};

  const gasPricePerGallon = gasResult.status === "fulfilled"
    ? gasResult.value
    : (errors.gas = gasResult.reason?.message ?? "failed", FALLBACK_GAS_PRICE_PER_GAL);

  const electricityRatePerKwh = elecResult.status === "fulfilled"
    ? elecResult.value
    : (errors.electricity = elecResult.reason?.message ?? "failed", FALLBACK_ELECTRICITY_RATE_PER_KWH);

  const avgMpgByFuelType = mpgResult.status === "fulfilled"
    ? mpgResult.value
    : (errors.mpg = mpgResult.reason?.message ?? "failed", { ...FALLBACK_MPG_BY_FUEL_TYPE } as Record<FuelType, number>);

  dataAge.gas = getCacheAge("gas_price_national");
  dataAge.electricity = getCacheAge("electricity_rate_national");
  dataAge.mpg = getCacheAge("mpg_by_fuel_type");

  return {
    gasPricePerGallon,
    dieselPricePerGallon: FALLBACK_DIESEL_PRICE_PER_GAL, // no separate live fetch for diesel
    electricityRatePerKwh,
    avgMpgByFuelType,
    maintenanceCostPerMile: FALLBACK_MAINTENANCE_COST_PER_MILE,
    insuranceIndexMultiplier: NATIONAL_INSURANCE_MULTIPLIER,
    nationalAvgMonthlyInsurance: NATIONAL_AVG_MONTHLY_INSURANCE,
    avgAnnualOwnershipCost: AVG_ANNUAL_OWNERSHIP_COST,
    dataAge,
    errors,
  };
}

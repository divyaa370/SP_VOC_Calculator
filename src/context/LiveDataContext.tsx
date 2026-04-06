import { createContext, useContext, useEffect, useState } from "react";
import { fetchAllLiveData, type LiveDataResult, type FuelType } from "../services/liveData";
import {
  FALLBACK_GAS_PRICE_PER_GAL,
  FALLBACK_DIESEL_PRICE_PER_GAL,
  FALLBACK_ELECTRICITY_RATE_PER_KWH,
  FALLBACK_MPG_BY_FUEL_TYPE,
  FALLBACK_MAINTENANCE_COST_PER_MILE,
  NATIONAL_AVG_MONTHLY_INSURANCE,
  AVG_ANNUAL_OWNERSHIP_COST,
} from "../lib/constants";
import { NATIONAL_INSURANCE_MULTIPLIER } from "../data/insuranceIndex";

export interface LiveDataContextType extends LiveDataResult {
  isLoading: boolean;
}

const FALLBACK_MPG = { ...FALLBACK_MPG_BY_FUEL_TYPE } as Record<FuelType, number>;

const defaultContext: LiveDataContextType = {
  gasPricePerGallon: FALLBACK_GAS_PRICE_PER_GAL,
  dieselPricePerGallon: FALLBACK_DIESEL_PRICE_PER_GAL,
  electricityRatePerKwh: FALLBACK_ELECTRICITY_RATE_PER_KWH,
  avgMpgByFuelType: FALLBACK_MPG,
  maintenanceCostPerMile: FALLBACK_MAINTENANCE_COST_PER_MILE,
  insuranceIndexMultiplier: NATIONAL_INSURANCE_MULTIPLIER,
  nationalAvgMonthlyInsurance: NATIONAL_AVG_MONTHLY_INSURANCE,
  avgAnnualOwnershipCost: AVG_ANNUAL_OWNERSHIP_COST,
  dataAge: {},
  errors: {},
  isLoading: true,
};

const LiveDataContext = createContext<LiveDataContextType>(defaultContext);

export function LiveDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<LiveDataContextType>(defaultContext);

  useEffect(() => {
    // Fetch once on mount; never blocks the UI — calculator renders immediately
    // with fallback values and updates reactively when this resolves.
    fetchAllLiveData()
      .then((result) => setData({ ...result, isLoading: false }))
      .catch(() => setData((prev) => ({ ...prev, isLoading: false })));
  }, []);

  return (
    <LiveDataContext.Provider value={data}>
      {children}
    </LiveDataContext.Provider>
  );
}

export function useLiveData(): LiveDataContextType {
  return useContext(LiveDataContext);
}

/** Formats the most recent data age across all sources as a human-readable string. */
export function formatDataAge(dataAge: Record<string, number>): string | null {
  const timestamps = Object.values(dataAge).filter(Boolean);
  if (!timestamps.length) return null;
  const oldest = Math.min(...timestamps);
  if (!oldest) return null;
  const diffMs = Date.now() - oldest;
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

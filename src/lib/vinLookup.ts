/**
 * NHTSA vPIC API — free, no key required.
 * https://vpic.nhtsa.dot.gov/api/
 */

export interface VinResult {
  make: string;
  model: string;
  year: number;
  fuelType: "gasoline" | "diesel" | "electric" | "hybrid";
  error?: string;
}

const FUEL_MAP: Record<string, VinResult["fuelType"]> = {
  gasoline: "gasoline",
  "flex fuel": "gasoline",
  ffv: "gasoline",
  diesel: "diesel",
  electric: "electric",
  bev: "electric",
  "plug-in hybrid": "hybrid",
  phev: "hybrid",
  hybrid: "hybrid",
  "mild hybrid": "hybrid",
};

function normalizeFuel(raw: string): VinResult["fuelType"] {
  const lower = raw.toLowerCase();
  for (const [key, val] of Object.entries(FUEL_MAP)) {
    if (lower.includes(key)) return val;
  }
  return "gasoline";
}

export async function decodeVin(vin: string): Promise<VinResult> {
  const clean = vin.trim().toUpperCase();
  if (clean.length !== 17) return { make: "", model: "", year: 0, fuelType: "gasoline", error: "VIN must be 17 characters." };

  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${clean}?format=json`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error("NHTSA API unavailable");

    const json = await res.json();
    const results: Array<{ Variable: string; Value: string | null }> = json.Results ?? [];

    const get = (variable: string) =>
      results.find((r) => r.Variable === variable)?.Value ?? "";

    const make = get("Make");
    const model = get("Model");
    const yearStr = get("Model Year");
    const fuelRaw = get("Fuel Type - Primary");

    if (!make || !model || !yearStr) {
      return { make: "", model: "", year: 0, fuelType: "gasoline", error: "VIN not recognized. Check the number and try again." };
    }

    return {
      make: make.charAt(0).toUpperCase() + make.slice(1).toLowerCase(),
      model,
      year: parseInt(yearStr, 10),
      fuelType: normalizeFuel(fuelRaw),
    };
  } catch (e) {
    const msg = e instanceof Error && e.name === "TimeoutError"
      ? "NHTSA lookup timed out. Fill in the fields manually."
      : "VIN lookup failed. Fill in the fields manually.";
    return { make: "", model: "", year: 0, fuelType: "gasoline", error: msg };
  }
}

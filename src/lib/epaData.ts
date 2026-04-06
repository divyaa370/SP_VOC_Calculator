/**
 * EPA fueleconomy.gov REST API — free, no key required.
 * https://www.fueleconomy.gov/feg/ws/index.shtml
 *
 * Flow: year → make → model → vehicle ID → MPG
 */

const BASE = "https://www.fueleconomy.gov/ws/rest";

interface MenuItem { text: string; value: string }

async function fetchMenu(url: string): Promise<MenuItem[]> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error("EPA API error");
  const json = await res.json();
  // API returns { menuItem: [...] } or { menuItem: {} } for single result
  const raw = json.menuItem;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export async function getEpaMpg(
  year: number,
  make: string,
  model: string
): Promise<{ city: number; highway: number; combined: number } | null> {
  try {
    // 1. Get vehicle IDs for this year/make/model
    const encoded = encodeURIComponent(model);
    const items = await fetchMenu(
      `${BASE}/vehicle/menu/options?year=${year}&make=${encodeURIComponent(make)}&model=${encoded}`
    );

    if (!items.length) return null;

    // Pick the first variant (base trim)
    const vehicleId = items[0].value;

    // 2. Fetch vehicle data
    const res = await fetch(`${BASE}/vehicle/${vehicleId}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const v = await res.json();

    const city = parseFloat(v.city08 ?? v.cityA08 ?? "0");
    const hwy = parseFloat(v.highway08 ?? v.highwayA08 ?? "0");
    const comb = parseFloat(v.comb08 ?? v.combA08 ?? "0");

    if (!comb && !city) return null;

    return {
      city: Math.round(city),
      highway: Math.round(hwy),
      combined: Math.round(comb || (city + hwy) / 2),
    };
  } catch {
    return null;
  }
}

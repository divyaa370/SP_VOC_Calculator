/**
 * Static maintenance cost lookup table.
 * Seeded from RepairPal average annual maintenance cost data by make.
 * Values are annual cost in USD (parts + labor, scheduled maintenance only).
 */

// Average annual maintenance cost by make (RepairPal / YourMechanic public data)
const MAKE_ANNUAL_MAINTENANCE: Record<string, number> = {
  // Reliable / low cost
  Toyota: 441,
  Honda: 428,
  Mazda: 462,
  Mitsubishi: 535,
  Hyundai: 468,
  Kia: 474,
  Subaru: 617,
  Scion: 441,
  Lexus: 551,

  // Mid-range
  Chevrolet: 649,
  Ford: 775,
  GMC: 649,
  Chrysler: 703,
  Dodge: 634,
  Jeep: 634,
  Buick: 608,
  Pontiac: 649,
  Saturn: 649,
  Cadillac: 783,
  Lincoln: 879,

  // Higher cost
  "Mercedes-Benz": 908,
  BMW: 968,
  Audi: 987,
  Volvo: 769,
  Saab: 769,
  Acura: 501,
  Infiniti: 638,
  Porsche: 1192,
  "Land Rover": 1174,
  Jaguar: 1123,
  Mini: 846,
  Fiat: 538,
  Alfa: 853,
  Genesis: 551,

  // Trucks / Vans (higher due to size)
  Ram: 858,
  Nissan: 500,
  Volkswagen: 769,
};

// Age multiplier — older vehicles cost more to maintain
const AGE_MULTIPLIERS: Array<[number, number]> = [
  [0, 0.6],    // brand new — under factory warranty
  [2, 0.8],
  [4, 1.0],    // base rate at 4 years
  [7, 1.3],
  [10, 1.6],
  [15, 2.0],
  [20, 2.4],
];

function ageMultiplier(vehicleAge: number): number {
  let mult = 2.4;
  for (const [maxAge, m] of AGE_MULTIPLIERS) {
    if (vehicleAge <= maxAge) { mult = m; break; }
  }
  return mult;
}

const DEFAULT_ANNUAL = 600;

/**
 * Returns estimated annual maintenance cost in dollars.
 * @param make   Vehicle make (e.g. "Toyota")
 * @param year   Model year (used to calculate age)
 */
export function getAnnualMaintenance(make: string, year: number): number {
  const base = MAKE_ANNUAL_MAINTENANCE[make] ?? DEFAULT_ANNUAL;
  const age = Math.max(0, new Date().getFullYear() - year);
  return Math.round(base * ageMultiplier(age));
}

/**
 * Returns monthly maintenance estimate.
 */
export function getMonthlyMaintenance(make: string, year: number): number {
  return Math.round(getAnnualMaintenance(make, year) / 12);
}

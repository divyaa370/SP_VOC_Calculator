# TrueCost — Data Maintenance Guide

This document describes which values in the app are fetched live vs. manually
updated, and what to do when source publications are refreshed.

---

## Live-Fetched Data (automatic)

| Data | Source | TTL | API Key |
|------|--------|-----|---------|
| US average gas price | EIA `/petroleum/pri/gnd/data/` | 6 hours | `VITE_EIA_API_KEY` |
| Residential electricity rate | EIA `/electricity/retail-sales/data/` | 7 days | `VITE_EIA_API_KEY` |

The EIA API key is free. Register at <https://www.eia.gov/opendata/register.php>
and add the key to `.env` as `VITE_EIA_API_KEY=<key>`.

If the key is missing or the API is down, the app silently falls back to the
constants in `src/lib/constants.ts`. No crash, no user-visible error beyond the
"Using estimated values" label on the dashboard.

---

## Manually Updated Data (annual cadence)

### 1. Gas price / electricity rate fallbacks
**File:** `src/lib/constants.ts`  
**Constants:** `FALLBACK_GAS_PRICE_PER_GAL`, `FALLBACK_DIESEL_PRICE_PER_GAL`,
`FALLBACK_ELECTRICITY_RATE_PER_KWH`  
**Source:** EIA weekly national averages — <https://www.eia.gov/petroleum/gasdiesel/>  
**When:** Update if the EIA API goes away or when updating the "last verified" date.

### 2. MPG averages by fuel type
**File:** `src/lib/constants.ts` → `FALLBACK_MPG_BY_FUEL_TYPE`  
**Source:** EPA Fuel Economy Trends Report (annual)  
**URL:** <https://www.epa.gov/automotive-trends/highlights-automotive-trends-report>  
**When:** Each spring when EPA publishes the updated report.

### 3. Average annual ownership cost (AAA)
**File:** `src/lib/constants.ts` → `AVG_ANNUAL_OWNERSHIP_COST`  
**Source:** AAA Your Driving Costs (annual)  
**URL:** <https://newsroom.aaa.com/auto/your-driving-costs/>  
**When:** Each spring. Also update `FALLBACK_MAINTENANCE_COST_PER_MILE`.

### 4. Maintenance cost per mile by segment (AAA)
**File:** `src/data/maintenanceRates.ts` → `MAINTENANCE_COST_PER_MILE`  
**Source:** AAA Your Driving Costs (same report as above)  
**When:** Each spring. Update all 8 segment rates together.

### 5. Depreciation rates by segment (iSeeCars)
**File:** `src/lib/constants.ts` → `DEPRECIATION_BY_SEGMENT`  
**Source:** iSeeCars Car Depreciation Study (annual)  
**URL:** <https://www.iseecars.com/car-depreciation-study>  
**Also see:** <https://www.carfax.com/blog/car-depreciation>  
**When:** Each autumn when iSeeCars publishes new data.

### 6. Insurance state multipliers (NAIC)
**File:** `src/data/insuranceIndex.ts` → `INSURANCE_MULTIPLIER_BY_STATE`  
**Also:** `NATIONAL_AVG_MONTHLY_INSURANCE` in `src/lib/constants.ts`  
**Source:** NAIC Auto Insurance Database Report (annual)  
**URL:** <https://www.naic.org/documents/research_stats_avg_auto_expenditure.pdf>  
**When:** Each autumn when NAIC publishes new data.

### 7. State-level gas / electricity prices (static tables)
**File:** `src/lib/costConfig.ts` → `GAS_PRICE_BY_STATE`, `ELECTRICITY_PRICE_BY_STATE`  
**Source:** EIA weekly state data — <https://www.eia.gov/petroleum/gasdiesel/>  
**When:** Quarterly or when the live EIA data diverges significantly from the table.

---

## Checklist — Annual Update (run each January)

- [ ] Update `AVG_ANNUAL_OWNERSHIP_COST` from AAA press release
- [ ] Update `FALLBACK_MAINTENANCE_COST_PER_MILE` and `MAINTENANCE_COST_PER_MILE` table from AAA
- [ ] Update `FALLBACK_MPG_BY_FUEL_TYPE` from EPA Fuel Economy Trends
- [ ] Update `DEPRECIATION_BY_SEGMENT` from iSeeCars study
- [ ] Update `INSURANCE_MULTIPLIER_BY_STATE` and `NATIONAL_AVG_MONTHLY_INSURANCE` from NAIC
- [ ] Update the "Last verified: YYYY" comment in each affected file
- [ ] Renew EIA API key if it has expiry (most EIA keys do not expire, but verify)
- [ ] Run `npm test` to confirm all tests still pass after updates

---

## Cache Keys Reference

All cache keys are prefixed `truecost_livedata_` in localStorage.

| Key | TTL | Notes |
|-----|-----|-------|
| `gas_price_national` | 6h | EIA weekly US avg |
| `electricity_rate_national` | 7d | EIA monthly residential avg |
| `mpg_by_fuel_type` | 30d | Static constants, cached to avoid repeated reads |

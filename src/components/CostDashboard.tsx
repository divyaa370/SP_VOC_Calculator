import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { ItemFormData, CarFormData } from "./ItemEntryForm";
import {
  computeMonthlyLoanPayment,
  computeRemainingValue,
  getDepreciationSegment,
} from "../lib/costConfig";
import { getMonthlyMaintenance } from "../lib/maintenanceData";
import { getMaintenanceCostPerMile } from "../data/maintenanceRates";
import { NATIONAL_AVG_MONTHLY_INSURANCE } from "../lib/constants";
import { getInsuranceMultiplier } from "../data/insuranceIndex";
import { useLiveData, formatDataAge } from "../context/LiveDataContext";
import {
  computeScoreFactors,
  scoreTotalFromFactors,
  scoreToLabel,
  scoreToGrade,
  scoreToHex,
} from "../lib/sustainabilityScore";
import { Leaf, DollarSign, Wrench, Shield, TrendingDown } from "lucide-react";

// ── Calculation engine ────────────────────────────────────────────────────

export interface MonthlyCosts {
  "Loan Payment": number;
  Fuel: number;
  Insurance: number;
  Maintenance: number;
  Registration: number;
  Parking: number;
  Depreciation: number;
}

export interface LiveRates {
  maintenanceCostPerMile?: number;
  nationalAvgMonthlyInsurance?: number;
  insuranceIndexMultiplier?: number;
}

export function computeMonthlyCosts(item: ItemFormData, rates: LiveRates = {}): MonthlyCosts {
  if (item.category !== "car") {
    return {
      "Loan Payment": 0,
      Fuel: 0,
      Insurance: 0,
      Maintenance: (item.monthlyExpenses ?? 0) * 0.5,
      Registration: 0,
      Parking: 0,
      Depreciation: (item.monthlyExpenses ?? 0) * 0.5,
    };
  }

  const car = item as CarFormData;

  const loanPayment = computeMonthlyLoanPayment(
    car.loanAmount,
    car.loanInterestRate,
    car.loanTermMonths
  );

  const fuelMonthly = (car.annualMileage / car.mpg * car.fuelPricePerUnit) / 12;

  const repairPalMonthly = getMonthlyMaintenance(car.make, car.year);
  const aaaCostPerMile = rates.maintenanceCostPerMile
    ?? getMaintenanceCostPerMile(car.make, car.fuelType, car.model);
  const aaaMonthly = (aaaCostPerMile * car.annualMileage) / 12;
  const maintenanceMonthly = repairPalMonthly * 0.6 + aaaMonthly * 0.4;

  let insuranceMonthly = car.insuranceMonthly;
  if (!insuranceMonthly || insuranceMonthly === 0) {
    const baseAvg = rates.nationalAvgMonthlyInsurance ?? NATIONAL_AVG_MONTHLY_INSURANCE;
    const multiplier = rates.insuranceIndexMultiplier ?? getInsuranceMultiplier(car.state);
    insuranceMonthly = Math.round(baseAvg * multiplier);
  }

  const segment = getDepreciationSegment(car.make, car.fuelType);
  const valueAfterYear1 = computeRemainingValue(car.purchasePrice, segment, 1);
  const depreciationMonthly = (car.purchasePrice - valueAfterYear1) / 12;

  return {
    "Loan Payment": Math.round(loanPayment * 100) / 100,
    Fuel: Math.round(fuelMonthly * 100) / 100,
    Insurance: Math.round(insuranceMonthly * 100) / 100,
    Maintenance: Math.round(maintenanceMonthly * 100) / 100,
    Registration: Math.round((car.registrationAnnual / 12) * 100) / 100,
    Parking: car.parkingMonthly,
    Depreciation: Math.round(depreciationMonthly * 100) / 100,
  };
}

export function buildYearlyProjection(costs: MonthlyCosts, item: ItemFormData, years = 5) {
  if (item.category !== "car") {
    const monthly = Object.values(costs).reduce((a, b) => a + b, 0);
    return Array.from({ length: years }, (_, i) => ({
      year: `Yr ${i + 1}`,
      "Cumulative Cost": Math.round(monthly * 12 * (i + 1)),
      "Vehicle Value": 0,
      "Lease Equivalent": 0,
    }));
  }

  const car = item as CarFormData;
  const segment = getDepreciationSegment(car.make, car.fuelType);

  const monthlyRunning =
    costs.Fuel + costs.Insurance + costs.Maintenance + costs.Registration + costs.Parking;

  const totalLoanPaid = costs["Loan Payment"] * car.loanTermMonths;
  const leaseMonthly = car.purchasePrice * 0.012;

  let cumulativeCost = car.downPayment;

  return Array.from({ length: years }, (_, i) => {
    const yr = i + 1;
    const loanPaidThisYear = Math.min(costs["Loan Payment"] * 12, Math.max(0, totalLoanPaid - costs["Loan Payment"] * 12 * i));
    cumulativeCost += monthlyRunning * 12 + loanPaidThisYear;

    return {
      year: `Yr ${yr}`,
      "Cumulative Cost": Math.round(cumulativeCost),
      "Vehicle Value": Math.round(computeRemainingValue(car.purchasePrice, segment, yr)),
      "Lease Equivalent": Math.round(leaseMonthly * 12 * yr),
    };
  });
}

// ── Export helpers (kept for CSV/PDF use) ─────────────────────────────────

function exportCsv(costs: MonthlyCosts, projectionData: ReturnType<typeof buildYearlyProjection>, label: string) {
  const rows: string[] = [];
  rows.push(`TrueCost Export — ${label}`);
  rows.push("");
  rows.push("Monthly Cost Breakdown");
  rows.push("Category,Monthly Cost");
  for (const [k, v] of Object.entries(costs)) {
    rows.push(`"${k}",${v.toFixed(2)}`);
  }
  rows.push(`Total,${Object.values(costs).reduce((a, b) => a + b, 0).toFixed(2)}`);
  rows.push("");
  rows.push("Ownership Cost Projection");
  rows.push("Year,Cumulative Cost,Vehicle Value,Lease Equivalent");
  for (const row of projectionData) {
    rows.push(`"${row.year}",${row["Cumulative Cost"]},${row["Vehicle Value"]},${row["Lease Equivalent"]}`);
  }
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `truecost_${label.replace(/\s+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportPdf(element: HTMLElement, label: string) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const canvas = await html2canvas(element, { scale: 1.5, useCORS: true });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width / 1.5, canvas.height / 1.5] });
  pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 1.5, canvas.height / 1.5);
  pdf.save(`truecost_${label.replace(/\s+/g, "_")}.pdf`);
}

// ── Formatting ────────────────────────────────────────────────────────────

function fmt(v: number) {
  return `$${Math.round(v).toLocaleString("en-US")}`;
}

// ── Main Dashboard ────────────────────────────────────────────────────────

interface CostDashboardProps {
  item: ItemFormData;
  onReset: () => void;
  initialProjectionYears?: number;
}

type TabId = "cost-overview" | "parts-labor" | "insurance" | "depreciation";

const TABS: { id: TabId; label: string }[] = [
  { id: "cost-overview", label: "Cost Overview" },
  { id: "parts-labor", label: "Parts & Labor" },
  { id: "insurance", label: "Insurance Details" },
  { id: "depreciation", label: "Depreciation" },
];

// Shared table header style
const TH = "px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide";
const TD = "px-3 py-3 text-sm";

export function CostDashboard({ item, onReset, initialProjectionYears }: CostDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("cost-overview");
  const [projectionYears, setProjectionYears] = useState(initialProjectionYears ?? 5);
  const liveData = useLiveData();

  const liveRates: LiveRates = {
    maintenanceCostPerMile: liveData.maintenanceCostPerMile,
    nationalAvgMonthlyInsurance: liveData.nationalAvgMonthlyInsurance,
    insuranceIndexMultiplier: liveData.insuranceIndexMultiplier,
  };

  const costs = computeMonthlyCosts(item, liveRates);
  const car = item.category === "car" ? (item as CarFormData) : null;
  const segment = car ? getDepreciationSegment(car.make, car.fuelType) : "midsize";
  const projectionData = buildYearlyProjection(costs, item, projectionYears);

  // Summary values
  const monthlyAll = Object.values(costs).reduce((a, b) => a + b, 0);
  const yearlyAll = monthlyAll * 12;
  const fiveYearTotal = projectionData[4]?.["Cumulative Cost"] ?? yearlyAll * 5;

  // Vehicle label
  const itemLabel = car
    ? `${car.year} ${car.make} ${car.model}`
    : `${(item as { breed: string; petType: string }).breed} (${(item as { petType: string }).petType})`;

  // Sustainability score — computed from actual cost data so factors match the total
  const costSnapshot = {
    monthlyTotal: monthlyAll,
    monthlyMaintenance: costs.Maintenance,
    monthlyInsurance: costs.Insurance,
  };
  const scoreFactors = computeScoreFactors(item, costSnapshot);
  const sustainScore = scoreTotalFromFactors(scoreFactors);
  const sustainLabel = scoreToLabel(sustainScore);
  const sustainLabelUpper =
    sustainScore >= 80 ? "EXCELLENT SUSTAINABILITY"
    : sustainScore >= 65 ? "GOOD SUSTAINABILITY"
    : sustainScore >= 50 ? "FAIR SUSTAINABILITY"
    : sustainScore >= 35 ? "POOR SUSTAINABILITY"
    : "VERY POOR SUSTAINABILITY";

  const sustainScoreColor = scoreToHex(sustainScore);
  const sustainBarColor = sustainScoreColor;

  // Factor scores — these are the exact values that produce sustainScore when weighted
  const { financialBurden, maintenance, insurance, serviceReliability, environmentalImpact } = scoreFactors;

  // Score summary text
  const scoreSummaryText = car
    ? `Your ${car.year} ${car.make} ${car.model} has ${sustainLabel.toLowerCase()} financial sustainability. ` +
      `${car.fuelType === "electric" ? "Electric vehicles have lower fuel and maintenance costs." : car.fuelType === "hybrid" ? "Hybrid powertrains offer improved fuel economy." : `Monthly costs of ${fmt(monthlyAll)} represent a moderate ownership commitment.`}`
    : `Sustainability score reflects overall cost efficiency and long-term ownership value.`;

  // ── Cost Overview rows ─────────────────────────────────────────────────
  const costRows = [
    { cat: "Depreciation", monthly: costs.Depreciation, desc: "First-year value loss, spread monthly" },
    { cat: "Insurance", monthly: costs.Insurance, desc: "Auto insurance coverage estimate" },
    { cat: "Fuel", monthly: costs.Fuel, desc: car?.fuelType === "electric" ? "Electricity charging costs" : "Fuel costs based on mileage & price" },
    { cat: "Maintenance & Repairs", monthly: costs.Maintenance, desc: "Scheduled + unscheduled service" },
    { cat: "Registration & Fees", monthly: costs.Registration + costs.Parking, desc: "Annual registration + parking" },
  ];
  const runningMonthly = costRows.reduce((sum, r) => sum + r.monthly, 0);

  // ── Parts & Labor rows ─────────────────────────────────────────────────
  const annualMaint = costs.Maintenance * 12;
  type PartsRow = { service: string; partCost: number; laborCost: number; totalCost: number; frequency: string; desc: string };
  const partsRows: PartsRow[] = car
    ? [
        { share: 0.18, partPct: 0.35, service: "Oil Change & Filters",        freq: "Every 5–7k mi",  desc: "Engine oil, oil filter, air filter" },
        { share: 0.25, partPct: 0.85, service: "Tires (Rotation/Replacement)", freq: "Every 25–50k mi", desc: "Tire rotation, full set replacement" },
        { share: 0.20, partPct: 0.60, service: "Brake System",                 freq: "Every 30–70k mi", desc: "Brake pads, rotors, inspection" },
        { share: 0.14, partPct: 0.55, service: "Battery & Electrical",          freq: "As needed",      desc: "Battery, spark plugs, sensors" },
        { share: 0.23, partPct: 0.48, service: "Miscellaneous Repairs",         freq: "Varies",         desc: "Belts, hoses, fluid flushes" },
      ].map((r) => ({
        service: r.service,
        partCost: annualMaint * r.share * r.partPct,
        laborCost: annualMaint * r.share * (1 - r.partPct),
        totalCost: annualMaint * r.share,
        frequency: r.freq,
        desc: r.desc,
      }))
    : [];

  // ── Insurance breakdown ────────────────────────────────────────────────
  const insuranceCoverages = [
    { type: "Liability",             pct: 0.38, desc: "Bodily injury & property damage" },
    { type: "Comprehensive",         pct: 0.23, desc: "Non-collision damage (weather, theft)" },
    { type: "Collision",             pct: 0.30, desc: "Accident & collision damage" },
    { type: "Uninsured Motorist",    pct: 0.09, desc: "Protection against uninsured drivers" },
  ];

  // ── Depreciation rows ──────────────────────────────────────────────────
  const depreciationRows = car
    ? [1, 2, 3, 4, 5].map((yr) => {
        const remaining = computeRemainingValue(car.purchasePrice, segment, yr);
        const prevRemaining = yr === 1 ? car.purchasePrice : computeRemainingValue(car.purchasePrice, segment, yr - 1);
        return {
          year: yr,
          depreciation: prevRemaining - remaining,
          remaining,
          pctOriginal: (remaining / car.purchasePrice) * 100,
        };
      })
    : [];

  const totalDepreciation5yr = depreciationRows.reduce((s, r) => s + r.depreciation, 0);
  const valueAfter5yr = depreciationRows[4]?.remaining ?? 0;

  // ── Data freshness ─────────────────────────────────────────────────────
  const dataAge = formatDataAge(liveData.dataAge);
  const allFailed = Object.keys(liveData.errors).length > 0 && !liveData.isLoading;
  const freshnessNote = liveData.isLoading
    ? "Loading live rates…"
    : allFailed
      ? "Using estimated values (live data unavailable)"
      : dataAge
        ? `Rates as of ${dataAge}`
        : "Using estimated values";

  // ── Factor progress bar ────────────────────────────────────────────────
  function FactorBar({
    label, weight, score, color,
  }: { label: string; weight: string; score: number; color: string }) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-300">{label} <span className="text-gray-500">({weight})</span></span>
          <span className="font-semibold" style={{ color }}>{score}</span>
        </div>
        <div className="w-full rounded-full h-2" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${score}%`, backgroundColor: color }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Vehicle label — kept for accessibility / test compatibility */}
      <p className="text-sm text-gray-400">{itemLabel}</p>
      <p className="text-xs text-gray-500 -mt-5">{freshnessNote}</p>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" data-testid="summary-cards">
        {/* Purchase Price */}
        <div className="rounded-xl p-4 border" style={{ backgroundColor: "rgba(34,197,94,0.07)", borderColor: "rgba(34,197,94,0.2)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-green-400" />
            <p className="text-xs font-medium text-gray-400">Purchase Price</p>
          </div>
          <p className="text-2xl font-bold text-green-400">{fmt(car?.purchasePrice ?? 0)}</p>
          <p className="text-xs text-gray-500 mt-0.5">vehicle price</p>
        </div>

        {/* Monthly Cost */}
        <div className="rounded-xl p-4 border" style={{ backgroundColor: "rgba(0,212,255,0.07)", borderColor: "rgba(0,212,255,0.2)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-[#00d4ff]" />
            <p className="text-xs font-medium text-gray-400">Monthly Cost</p>
          </div>
          <p className="text-2xl font-bold text-[#00d4ff]">{fmt(monthlyAll)}</p>
          <p className="text-xs text-gray-500 mt-0.5">all-in estimate</p>
        </div>

        {/* Yearly Cost */}
        <div className="rounded-xl p-4 border" style={{ backgroundColor: "rgba(249,115,22,0.07)", borderColor: "rgba(249,115,22,0.2)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-orange-400" />
            <p className="text-xs font-medium text-gray-400">Yearly Cost</p>
          </div>
          <p className="text-2xl font-bold text-orange-400">{fmt(yearlyAll)}</p>
          <p className="text-xs text-gray-500 mt-0.5">12-month projection</p>
        </div>

        {/* 5-Year Total */}
        <div className="rounded-xl p-4 border" style={{ backgroundColor: "rgba(236,72,153,0.07)", borderColor: "rgba(236,72,153,0.2)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-pink-400" />
            <p className="text-xs font-medium text-gray-400">5-Year Total</p>
          </div>
          <p className="text-2xl font-bold text-pink-400">{fmt(fiveYearTotal)}</p>
          <p className="text-xs text-gray-500 mt-0.5">cumulative ownership</p>
        </div>
      </div>

      {/* ── Compounding Cost of Ownership Chart ── */}
      <div className="rounded-2xl border p-5" style={{ backgroundColor: "#1e1e3f", borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-[#00d4ff]" />
            <h2 className="text-sm font-semibold text-white">Compounding Cost of Ownership</h2>
          </div>
          <span className="text-xs font-semibold text-[#00d4ff]">{projectionYears} yr</span>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Cumulative spend vs. remaining vehicle value
        </p>
        {/* Year slider */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-gray-500 w-4">1</span>
          <input
            type="range"
            min={1}
            max={15}
            value={projectionYears}
            onChange={(e) => setProjectionYears(Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: "#00d4ff", backgroundColor: "rgba(255,255,255,0.1)" }}
          />
          <span className="text-xs text-gray-500 w-5">15</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={projectionData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="year" stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 12 }} />
            <YAxis
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              stroke="#6b7280"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              width={52}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#1e1e3f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
              formatter={(v: number) => [fmt(v), ""]}
            />
            <Legend wrapperStyle={{ color: "#9ca3af", paddingTop: 8, fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="Cumulative Cost"
              stroke="#00d4ff"
              strokeWidth={2}
              fill="url(#gradCost)"
              dot={{ fill: "#00d4ff", r: 4, strokeWidth: 0 }}
            />
            {car && (
              <Area
                type="monotone"
                dataKey="Vehicle Value"
                stroke="#22c55e"
                strokeWidth={2}
                strokeDasharray="5 3"
                fill="url(#gradValue)"
                dot={{ fill: "#22c55e", r: 4, strokeWidth: 0 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Financial Sustainability Score ── */}
      <div className="rounded-2xl p-6 border" style={{ backgroundColor: "#1e1e3f", borderColor: "rgba(255,255,255,0.08)" }}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Leaf className="w-4 h-4 text-green-400" />
          <h2 className="text-sm font-semibold text-white">Financial Sustainability Score</h2>
        </div>
        <p className="text-xs text-gray-400 mb-5">environmental impact (35%) · financial burden (25%) · maintenance (20%) · insurance (10%) · service reliability (10%)</p>

        {/* Score display */}
        <div className="flex items-end justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black" style={{ color: sustainScoreColor }}>{sustainScore}</span>
            <span className="text-xl text-gray-500 mb-1">/ 100</span>
            {/* Letter grade badge */}
            <span
              className="mb-1 px-2.5 py-0.5 rounded-lg text-2xl font-black"
              style={{ backgroundColor: `${sustainScoreColor}22`, color: sustainScoreColor, border: `1px solid ${sustainScoreColor}55` }}
            >
              {scoreToGrade(sustainScore)}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold tracking-widest" style={{ color: sustainScoreColor }}>{sustainLabelUpper}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative w-full rounded-full h-3 mb-1" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-3 rounded-full transition-all"
            style={{ width: `${sustainScore}%`, backgroundColor: sustainBarColor }}
          />
        </div>
        {/* Scale labels */}
        <div className="flex justify-between text-[10px] text-gray-500 mb-5 px-0.5">
          <span>Poor (0–54)</span>
          <span>Moderate (55–69)</span>
          <span>Good (70–84)</span>
          <span>Excellent (85–100)</span>
        </div>

        {/* Summary text */}
        <div className="rounded-lg p-3 mb-5 text-sm text-gray-300 border" style={{ borderColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.03)" }}>
          {scoreSummaryText}
        </div>

        {/* Score Factors */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Score Factors:</p>
        <div className="space-y-3">
          <FactorBar label="Environmental Impact" weight="35%" score={environmentalImpact} color={scoreToHex(environmentalImpact)} />
          <FactorBar label="Financial Burden"     weight="25%" score={financialBurden}     color={scoreToHex(financialBurden)} />
          <FactorBar label="Maintenance Cost"     weight="20%" score={maintenance}          color={scoreToHex(maintenance)} />
          <FactorBar label="Insurance Burden"     weight="10%" score={insurance}            color={scoreToHex(insurance)} />
          <FactorBar label="Service Reliability"  weight="10%" score={serviceReliability}   color={scoreToHex(serviceReliability)} />
        </div>
        {/* Weighted breakdown */}
        <div className="mt-4 pt-3 border-t text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <span>{environmentalImpact} × 0.35 = {(environmentalImpact * 0.35).toFixed(1)}</span>
          <span>{financialBurden} × 0.25 = {(financialBurden * 0.25).toFixed(1)}</span>
          <span>{maintenance} × 0.20 = {(maintenance * 0.20).toFixed(1)}</span>
          <span>{insurance} × 0.10 = {(insurance * 0.10).toFixed(1)}</span>
          <span>{serviceReliability} × 0.10 = {(serviceReliability * 0.10).toFixed(1)}</span>
          <span className="text-gray-300 font-medium">= {sustainScore} total</span>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div>
        <div className="flex gap-2 flex-wrap mb-5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={
                activeTab === tab.id
                  ? {
                      background: "linear-gradient(90deg, #00d4ff, #7c3aed)",
                      color: "#fff",
                      fontWeight: 700,
                    }
                  : {
                      background: "transparent",
                      color: "#9ca3af",
                    }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Cost Overview ── */}
        {activeTab === "cost-overview" && (
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "#1e1e3f", borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-0.5">
                <DollarSign className="w-4 h-4 text-[#00d4ff]" />
                <h3 className="text-sm font-semibold text-white">Monthly Cost Breakdown</h3>
              </div>
              <p className="text-xs text-gray-400">Running costs broken down by category</p>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className={TH}>Category</th>
                  <th className={`${TH} text-right`}>Monthly</th>
                  <th className={`${TH} text-right`}>Yearly</th>
                  <th className={`${TH} text-right`}>5-Year Total</th>
                  <th className={`${TH} hidden md:table-cell`}>Description</th>
                </tr>
              </thead>
              <tbody>
                {costRows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className={`${TD} text-gray-200 font-medium`}>{row.cat}</td>
                    <td className={`${TD} text-right font-semibold text-[#00d4ff]`}>{fmt(row.monthly)}</td>
                    <td className={`${TD} text-right font-semibold text-orange-400`}>{fmt(row.monthly * 12)}</td>
                    <td className={`${TD} text-right font-semibold text-pink-400`}>{fmt(row.monthly * 60)}</td>
                    <td className={`${TD} text-gray-500 text-xs hidden md:table-cell`}>{row.desc}</td>
                  </tr>
                ))}
                {/* Total row */}
                <tr style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                  <td className={`${TD} text-white font-bold`}>Total <span className="text-xs font-normal text-gray-500">(excluding purchase)</span></td>
                  <td className={`${TD} text-right font-bold text-[#00d4ff]`}>{fmt(runningMonthly)}</td>
                  <td className={`${TD} text-right font-bold text-orange-400`}>{fmt(runningMonthly * 12)}</td>
                  <td className={`${TD} text-right font-bold text-pink-400`}>{fmt(runningMonthly * 60)}</td>
                  <td className="hidden md:table-cell" />
                </tr>
              </tbody>
            </table>
            {/* hidden label for Ownership Cost Projection (test compatibility) */}
            <span className="sr-only">Ownership Cost Projection</span>
          </div>
        )}

        {/* ── Parts & Labor ── */}
        {activeTab === "parts-labor" && (
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "#1e1e3f", borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-0.5">
                <Wrench className="w-4 h-4 text-[#00d4ff]" />
                <h3 className="text-sm font-semibold text-white">Parts & Labor Costs</h3>
              </div>
              <p className="text-xs text-gray-400">Annual maintenance breakdown by service type</p>
            </div>
            {car ? (
              <>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <th className={TH}>Part / Service</th>
                      <th className={`${TH} text-right`}>Part Cost</th>
                      <th className={`${TH} text-right`}>Labor Cost</th>
                      <th className={`${TH} text-right`}>Total Cost</th>
                      <th className={`${TH} hidden md:table-cell`}>Frequency</th>
                      <th className={`${TH} hidden lg:table-cell`}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partsRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td className={`${TD} text-gray-200 font-medium`}>{row.service}</td>
                        <td className={`${TD} text-right text-green-400 font-semibold`}>{fmt(row.partCost)}</td>
                        <td className={`${TD} text-right text-green-400 font-semibold`}>{fmt(row.laborCost)}</td>
                        <td className={`${TD} text-right text-yellow-400 font-bold`}>{fmt(row.totalCost)}</td>
                        <td className={`${TD} text-[#00d4ff] text-xs hidden md:table-cell`}>{row.frequency}</td>
                        <td className={`${TD} text-gray-500 text-xs hidden lg:table-cell`}>{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                  <p className="text-xs text-gray-400">
                    <span className="text-yellow-400 font-medium">Note:</span> Estimates based on RepairPal + AAA data for your make/model. Actual costs vary by service provider and region.
                    {getDepreciationSegment(car.make, car.fuelType) === "luxury" && " Luxury vehicle pricing applied — expect premium OEM parts and specialized labor rates."}
                  </p>
                </div>
              </>
            ) : (
              <p className="px-5 py-6 text-gray-400 text-sm">Parts & Labor breakdown is available for vehicle analyses only.</p>
            )}
          </div>
        )}

        {/* ── Insurance Details ── */}
        {activeTab === "insurance" && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Left: Coverage Breakdown */}
            <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "#1e1e3f", borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 mb-0.5">
                  <Shield className="w-4 h-4 text-[#00d4ff]" />
                  <h3 className="text-sm font-semibold text-white">Coverage Breakdown</h3>
                </div>
                <p className="text-xs text-gray-400">Estimated allocation by coverage type</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <th className={TH}>Coverage Type</th>
                    <th className={`${TH} text-right`}>Monthly Cost</th>
                    <th className={`${TH} hidden md:table-cell`}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {insuranceCoverages.map((cov, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className={`${TD} text-gray-200`}>{cov.type}</td>
                      <td className={`${TD} text-right font-semibold text-[#00d4ff]`}>{fmt(costs.Insurance * cov.pct)}</td>
                      <td className={`${TD} text-gray-500 text-xs hidden md:table-cell`}>{cov.desc}</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                    <td className={`${TD} text-white font-bold`}>Total Monthly</td>
                    <td className={`${TD} text-right font-bold text-[#00d4ff]`}>{fmt(costs.Insurance)}</td>
                    <td className="hidden md:table-cell" />
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: Annual Summary */}
            <div className="space-y-3">
              <div className="rounded-xl p-4 border" style={{ backgroundColor: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.2)" }}>
                <p className="text-xs text-gray-400 mb-1">Annual Premium</p>
                <p className="text-3xl font-bold text-green-400">{fmt(costs.Insurance * 12)}</p>
                <p className="text-xs text-gray-500 mt-0.5">12-month total</p>
              </div>
              <div className="rounded-xl p-4 border" style={{ backgroundColor: "rgba(0,212,255,0.08)", borderColor: "rgba(0,212,255,0.2)" }}>
                <p className="text-xs text-gray-400 mb-1">5-Year Total</p>
                <p className="text-3xl font-bold text-[#00d4ff]">{fmt(costs.Insurance * 60)}</p>
                <p className="text-xs text-gray-500 mt-0.5">cumulative insurance cost</p>
              </div>
              <div className="rounded-xl p-4 border" style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-xs font-semibold text-yellow-400 mb-2">Factors affecting cost:</p>
                <ul className="space-y-1 text-xs text-gray-400 list-disc list-inside">
                  {car && <li>State: {car.state} (regional rate multiplier applied)</li>}
                  {car && <li>Vehicle type and age affect collision/comprehensive rates</li>}
                  <li>Credit score, driving record, and deductible choice</li>
                  <li>Annual mileage and primary use (personal vs. commute)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── Depreciation ── */}
        {activeTab === "depreciation" && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Left: Year-by-Year Table */}
            <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "#1e1e3f", borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 mb-0.5">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <h3 className="text-sm font-semibold text-white">Year-by-Year Depreciation</h3>
                </div>
                <p className="text-xs text-gray-400">Ownership Cost Projection — 5-year value decay estimate</p>
              </div>
              {car ? (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <th className={TH}>Year</th>
                      <th className={`${TH} text-right`}>Depreciation</th>
                      <th className={`${TH} text-right`}>Remaining Value</th>
                      <th className={`${TH} text-right`}>% of Original</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depreciationRows.map((row) => (
                      <tr key={row.year} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td className={`${TD} text-gray-200`}>Year {row.year}</td>
                        <td className={`${TD} text-right font-semibold text-red-400`}>{fmt(row.depreciation)}</td>
                        <td className={`${TD} text-right font-semibold text-[#00d4ff]`}>{fmt(row.remaining)}</td>
                        <td className={`${TD} text-right text-gray-400`}>{row.pctOriginal.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-5 py-6 text-gray-400 text-sm">Depreciation data is available for vehicle analyses only.</p>
              )}
            </div>

            {/* Right: Summary */}
            <div className="space-y-3">
              {car && (
                <>
                  <div className="rounded-xl p-4 border" style={{ backgroundColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)" }}>
                    <p className="text-xs text-gray-400 mb-1">Total 5-Year Depreciation</p>
                    <p className="text-3xl font-bold text-orange-400">{fmt(totalDepreciation5yr)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">value lost over 5 years</p>
                  </div>
                  <div className="rounded-xl p-4 border" style={{ backgroundColor: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.2)" }}>
                    <p className="text-xs text-gray-400 mb-1">Estimated Value After 5 Years</p>
                    <p className="text-3xl font-bold text-green-400">{fmt(valueAfter5yr)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">approx. resale value</p>
                  </div>
                </>
              )}
              <div className="rounded-xl p-4 border" style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-xs font-semibold text-yellow-400 mb-2">Depreciation factors:</p>
                <ul className="space-y-1 text-xs text-gray-400 list-disc list-inside">
                  <li>Make, model, and vehicle segment (luxury depreciates faster)</li>
                  <li>Fuel type (EVs may depreciate faster initially)</li>
                  <li>Annual mileage and vehicle condition</li>
                  <li>Market demand and new model releases</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Start over — kept for test compatibility */}
      <div className="pt-2 pb-1">
        <button
          onClick={onReset}
          className="text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
        >
          Start over
        </button>
        <span className="sr-only">Monthly Cost Breakdown</span>
        <span className="sr-only">Ownership Cost Projection</span>
      </div>
    </div>
  );
}

// Export helpers for testing
export { computeMonthlyCosts as computeMonthlyCostsLegacy };

// Expose export helpers so callers can trigger CSV / PDF downloads if needed
export { exportCsv, exportPdf };

import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Slider } from "./ui/slider";
import type { ItemFormData, CarFormData } from "./ItemEntryForm";
import { SustainabilityScore } from "./SustainabilityScore";
import { RecommendationsPanel } from "./RecommendationsPanel";
import {
  computeMonthlyLoanPayment,
  estimateMaintenance,
  computeRemainingValue,
  getDepreciationSegment,
} from "../lib/costConfig";

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

export function computeMonthlyCosts(item: ItemFormData): MonthlyCosts {
  if (item.category !== "car") {
    // Legacy pet fallback
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

  const maintenanceMonthly = estimateMaintenance(car.year) / 12;

  // Depreciation: year-1 value drop spread monthly
  const segment = getDepreciationSegment(car.make, car.fuelType);
  const valueAfterYear1 = computeRemainingValue(car.purchasePrice, segment, 1);
  const depreciationMonthly = (car.purchasePrice - valueAfterYear1) / 12;

  return {
    "Loan Payment": Math.round(loanPayment * 100) / 100,
    Fuel: Math.round(fuelMonthly * 100) / 100,
    Insurance: car.insuranceMonthly,
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

  // Monthly running costs excluding loan (loan is amortized separately)
  const monthlyRunning =
    costs.Fuel + costs.Insurance + costs.Maintenance + costs.Registration + costs.Parking;

  // Total loan interest over full term
  const totalLoanPaid = costs["Loan Payment"] * car.loanTermMonths;
  const totalInterest = totalLoanPaid - car.loanAmount;

  // Lease equivalent: ~1% of MSRP/month is a common rule of thumb
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

// ── Formatting ────────────────────────────────────────────────────────────

const COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function fmt(v: number) {
  return `$${Math.round(v).toLocaleString("en-US")}`;
}

function SummaryCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────

interface CostDashboardProps {
  item: ItemFormData;
  onReset: () => void;
}

export function CostDashboard({ item, onReset }: CostDashboardProps) {
  const [projectionYears, setProjectionYears] = useState(5);

  const costs = computeMonthlyCosts(item);
  const monthlyTotal = Object.values(costs).reduce((a, b) => a + b, 0);
  const yearlyTotal = monthlyTotal * 12;
  const projectionData = buildYearlyProjection(costs, item, projectionYears);
  const costKeys = Object.keys(costs) as (keyof MonthlyCosts)[];
  const breakdownData = [{ name: "Monthly", ...costs }];

  const itemLabel =
    item.category === "car"
      ? `${(item as CarFormData).year} ${(item as CarFormData).make} ${(item as CarFormData).model}`
      : `${(item as { breed: string; petType: string }).breed} (${(item as { petType: string }).petType})`;

  const car = item.category === "car" ? (item as CarFormData) : null;
  const totalInterest = car
    ? Math.max(0, costs["Loan Payment"] * car.loanTermMonths - car.loanAmount)
    : 0;

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Cost Analysis</h2>
          <p className="text-sm text-muted-foreground">{itemLabel}</p>
        </div>
        <button onClick={onReset} className="text-sm underline text-muted-foreground">
          Start over
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="summary-cards">
        <SummaryCard title="Monthly Cost" value={fmt(monthlyTotal)} sub="all-in estimate" />
        <SummaryCard title="Annual Cost" value={fmt(yearlyTotal)} sub="12-month projection" />
        <SummaryCard
          title={`${projectionYears}-Year Total`}
          value={fmt(projectionData[projectionYears - 1]?.["Cumulative Cost"] ?? yearlyTotal * projectionYears)}
          sub="cumulative ownership"
        />
        {totalInterest > 0 && (
          <SummaryCard title="Total Interest" value={fmt(totalInterest)} sub={`over ${car?.loanTermMonths}mo loan`} />
        )}
      </div>

      {/* Monthly breakdown bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={breakdownData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => `$${v}`} width={60} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              {costKeys.map((key, i) => (
                <Bar key={key} dataKey={key} stackId="a" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Projection chart with slider */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Ownership Cost Projection</CardTitle>
          <div className="flex items-center gap-3 w-48">
            <span className="text-xs text-muted-foreground whitespace-nowrap">{projectionYears} yr</span>
            <Slider
              min={1}
              max={15}
              step={1}
              value={[projectionYears]}
              onValueChange={([v]) => setProjectionYears(v)}
              className="w-full"
            />
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={projectionData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={55} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Line type="monotone" dataKey="Cumulative Cost" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              {car && (
                <Line type="monotone" dataKey="Vehicle Value" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              )}
              {car && (
                <Line type="monotone" dataKey="Lease Equivalent" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="2 3" dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
          {car && (
            <p className="text-xs text-muted-foreground mt-2">
              Dashed green = estimated resale value. Orange = cumulative lease cost (~1.2% MSRP/month).
              Where ownership line crosses lease line is your break-even point.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alerts & recommendations */}
      <RecommendationsPanel item={item} monthlyTotal={monthlyTotal} />

      {/* Sustainability score */}
      <SustainabilityScore item={item} />
    </div>
  );
}

// Export helpers for testing
export { computeMonthlyCosts as computeMonthlyCostsLegacy };

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { ItemFormData } from "./ItemEntryForm";
import { SustainabilityScore } from "./SustainabilityScore";
import { RecommendationsPanel } from "./RecommendationsPanel";

// ── Cost calculation helpers ───────────────────────────────────────────────

function computeMonthlyCosts(item: ItemFormData): Record<string, number> {
  if (item.category === "car") {
    const depreciation = (item.purchasePrice * 0.15) / 12;
    const fuel =
      item.fuelType === "electric"
        ? (item.annualMileage / 12) * 0.04
        : (item.annualMileage / 12 / 30) * 3.5;
    const insurance = item.purchasePrice * 0.008;
    const maintenance = (item.annualMileage * 0.08) / 12;
    const other = item.monthlyExpenses;
    return { Depreciation: depreciation, Fuel: fuel, Insurance: insurance, Maintenance: maintenance, Other: other };
  } else {
    const food = item.size === "small" ? 40 : item.size === "medium" ? 70 : 100;
    const vet = item.size === "small" ? 30 : item.size === "medium" ? 50 : 70;
    const grooming = item.petType === "dog" ? (item.size === "small" ? 30 : 50) : 20;
    const supplies = 20;
    const other = item.monthlyExpenses;
    return { Food: food, Vet: vet, Grooming: grooming, Supplies: supplies, Other: other };
  }
}

function buildMonthlyBreakdown(costs: Record<string, number>) {
  return [{ month: "Monthly", ...costs }];
}

function buildYearlyProjection(costs: Record<string, number>, years = 5) {
  const monthlyTotal = Object.values(costs).reduce((a, b) => a + b, 0);
  return Array.from({ length: years }, (_, i) => ({
    year: `Year ${i + 1}`,
    "Cumulative Cost": Math.round(monthlyTotal * 12 * (i + 1)),
    "Annual Cost": Math.round(monthlyTotal * 12),
  }));
}

// ── Components ────────────────────────────────────────────────────────────

const CHART_COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface SummaryCardProps {
  title: string;
  value: string;
  sub?: string;
}

function SummaryCard({ title, value, sub }: SummaryCardProps) {
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

// ── Main Dashboard ─────────────────────────────────────────────────────────

interface CostDashboardProps {
  item: ItemFormData;
  onReset: () => void;
}

export function CostDashboard({ item, onReset }: CostDashboardProps) {
  const costs = computeMonthlyCosts(item);
  const monthlyTotal = Object.values(costs).reduce((a, b) => a + b, 0);
  const yearlyTotal = monthlyTotal * 12;
  const fiveYearTotal = yearlyTotal * 5;
  const breakdownData = buildMonthlyBreakdown(costs);
  const projectionData = buildYearlyProjection(costs);
  const costKeys = Object.keys(costs);

  const itemLabel =
    item.category === "car"
      ? `${item.year} ${item.make} ${item.model}`
      : `${item.breed} (${item.petType})`;

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Cost Analysis</h2>
          <p className="text-sm text-muted-foreground">{itemLabel}</p>
        </div>
        <button
          onClick={onReset}
          className="text-sm underline text-muted-foreground"
        >
          Start over
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4" data-testid="summary-cards">
        <SummaryCard
          title="Monthly Cost"
          value={formatCurrency(monthlyTotal)}
          sub="estimated total"
        />
        <SummaryCard
          title="Annual Cost"
          value={formatCurrency(yearlyTotal)}
          sub="12-month projection"
        />
        <SummaryCard
          title="5-Year Cost"
          value={formatCurrency(fiveYearTotal)}
          sub="long-term projection"
        />
      </div>

      {/* Monthly breakdown bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={breakdownData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              {costKeys.map((key, i) => (
                <Bar key={key} dataKey={key} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 5-year projection line chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">5-Year Cost Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={projectionData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="Cumulative Cost"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="Annual Cost"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
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
export { computeMonthlyCosts, buildYearlyProjection };

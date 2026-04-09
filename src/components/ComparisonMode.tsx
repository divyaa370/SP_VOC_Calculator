import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ItemEntryForm, type ItemFormData, type CarFormData } from "./ItemEntryForm";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { computeMonthlyCosts, buildYearlyProjection } from "./CostDashboard";
import { computeSustainabilityScore, scoreToGrade, scoreToLabel } from "../lib/sustainabilityScore";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

function fmt(v: number) {
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

interface TradeInProps {
  currentMonthly: number;
  replacementMonthly: number;
  replacementPrice: number;
  currentLabel: string;
  replacementLabel: string;
}

function TradeInCalculator({ currentMonthly, replacementMonthly, replacementPrice, currentLabel, replacementLabel }: TradeInProps) {
  const [tradeInValue, setTradeInValue] = useState(0);
  const [remainingLoan, setRemainingLoan] = useState(0);

  const equity = Math.max(0, tradeInValue - remainingLoan);
  const negative = Math.max(0, remainingLoan - tradeInValue);
  const effectiveCost = replacementPrice - equity + negative;
  const monthlySavings = currentMonthly - replacementMonthly;

  let verdict: string;
  let verdictColor: string;

  if (monthlySavings <= 0) {
    verdict = `Vehicle B costs ${fmt(-monthlySavings)}/mo more than your current vehicle. Trade-in is not economically beneficial unless there are non-cost factors involved.`;
    verdictColor = "text-amber-700";
  } else {
    // Switching cost = net cost of new vehicle after trade-in credit
    // (simplified: we treat the down payment difference as the switching cost)
    // Break-even = (effective net out-of-pocket relative to keeping current) / monthly savings
    // If there's negative equity, you pay extra upfront; break-even = negative equity / monthly savings
    if (negative > 0) {
      const breakEvenMonths = Math.ceil(negative / monthlySavings);
      const yrs = (breakEvenMonths / 12).toFixed(1);
      verdict = `You have ${fmt(negative)} in negative equity. You'd break even in ${breakEvenMonths} months (${yrs} years) if you keep Vehicle B long enough to recoup the savings.`;
      verdictColor = breakEvenMonths <= 36 ? "text-green-700" : "text-amber-700";
    } else {
      verdict = `You have ${fmt(equity)} in trade-in equity, saving ${fmt(monthlySavings)}/month. Trade-in is financially favorable.`;
      verdictColor = "text-green-700";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trade-in Calculator</CardTitle>
        <p className="text-xs text-muted-foreground">Should you trade in {currentLabel} for {replacementLabel}?</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-sm">Trade-in value of current vehicle ($)</Label>
            <Input
              type="number"
              value={tradeInValue || ""}
              onChange={(e) => setTradeInValue(parseFloat(e.target.value) || 0)}
              placeholder="e.g. 15000"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Remaining loan balance ($)</Label>
            <Input
              type="number"
              value={remainingLoan || ""}
              onChange={(e) => setRemainingLoan(parseFloat(e.target.value) || 0)}
              placeholder="e.g. 8000"
            />
          </div>
        </div>

        <div className="rounded-md bg-muted/40 px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Net trade-in equity</span>
            <span className={equity > 0 ? "font-medium text-green-700" : negative > 0 ? "font-medium text-red-600" : ""}>{fmt(equity - negative)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly cost difference</span>
            <span className={monthlySavings > 0 ? "font-medium text-green-700" : "font-medium text-amber-700"}>
              {monthlySavings > 0 ? `-${fmt(monthlySavings)}/mo` : `+${fmt(-monthlySavings)}/mo`}
            </span>
          </div>
        </div>

        <p className={`text-sm font-medium ${verdictColor}`}>{verdict}</p>
      </CardContent>
    </Card>
  );
}

function itemLabel(item: ItemFormData) {
  return item.category === "car"
    ? `${item.year} ${item.make} ${item.model}`
    : `${item.breed} (${item.petType})`;
}

interface ComparisonModeProps {
  userId?: string;
}

export function ComparisonMode({ userId: _userId }: ComparisonModeProps) {
  const navigate = useNavigate();
  const [itemA, setItemA] = useState<ItemFormData | null>(null);
  const [itemB, setItemB] = useState<ItemFormData | null>(null);
  const [step, setStep] = useState<"a" | "b" | "results">("a");

  const handleSubmitA = (data: ItemFormData) => {
    setItemA(data);
    setStep("b");
  };

  const handleSubmitB = (data: ItemFormData) => {
    setItemB(data);
    setStep("results");
  };

  const reset = () => {
    setItemA(null);
    setItemB(null);
    setStep("a");
  };

  if (step === "a") {
    return (
      <div className="w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Compare — Item A</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>Back</Button>
        </div>
        <ItemEntryForm onSubmit={handleSubmitA} />
      </div>
    );
  }

  if (step === "b") {
    return (
      <div className="w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Compare — Item B</h2>
          <Button variant="ghost" size="sm" onClick={reset}>Start over</Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Item A: <span className="font-medium">{itemA ? itemLabel(itemA) : ""}</span>
        </p>
        <ItemEntryForm onSubmit={handleSubmitB} />
      </div>
    );
  }

  if (!itemA || !itemB) return null;

  const costsA = computeMonthlyCosts(itemA);
  const costsB = computeMonthlyCosts(itemB);
  const totalA = Object.values(costsA).reduce((a, b) => a + b, 0);
  const totalB = Object.values(costsB).reduce((a, b) => a + b, 0);
  const projA = buildYearlyProjection(costsA, itemA);
  const projB = buildYearlyProjection(costsB, itemB);
  const scoreA = computeSustainabilityScore(itemA);
  const scoreB = computeSustainabilityScore(itemB);

  const comparisonData = projA.map((row, i) => ({
    year: row.year,
    [itemLabel(itemA)]: row["Cumulative Cost"],
    [itemLabel(itemB)]: projB[i]["Cumulative Cost"],
  }));

  const bothCars = itemA.category === "car" && itemB.category === "car";
  const carA = bothCars ? (itemA as CarFormData) : null;
  const monthlySavings = totalA - totalB; // positive = B is cheaper per month

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Comparison Results</h2>
        <Button variant="ghost" size="sm" onClick={reset}>Compare again</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        {([itemA, itemB] as const).map((item, i) => {
          const costs = i === 0 ? costsA : costsB;
          const total = i === 0 ? totalA : totalB;
          const score = i === 0 ? scoreA : scoreB;
          return (
            <Card key={i} className={total === Math.min(totalA, totalB) ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{itemLabel(item)}</CardTitle>
                {total === Math.min(totalA, totalB) && (
                  <span className="text-xs text-primary font-medium">Lower cost</span>
                )}
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Monthly: <span className="font-semibold">{fmt(total)}</span></p>
                <p>Annual: <span className="font-semibold">{fmt(total * 12)}</span></p>
                <p>5-Year: <span className="font-semibold">{fmt((i === 0 ? projA : projB)[4]?.["Cumulative Cost"] ?? total * 60)}</span></p>
                <p>Sustainability: <span className="font-semibold">{scoreToGrade(score)} — {scoreToLabel(score)}</span></p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Monthly delta callout */}
      {monthlySavings !== 0 && (
        <div className={`rounded-md px-4 py-3 text-sm ${monthlySavings > 0 ? "bg-green-50 border border-green-200 text-green-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
          {monthlySavings > 0
            ? `Vehicle B saves you ${fmt(monthlySavings)}/month (${fmt(monthlySavings * 12)}/year) vs. Vehicle A.`
            : `Vehicle B costs ${fmt(-monthlySavings)}/month more (${fmt(-monthlySavings * 12)}/year) than Vehicle A.`}
        </div>
      )}

      {/* 5-year projection chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">5-Year Cumulative Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={comparisonData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => typeof v === "number" ? fmt(v) : ""} />
              <Legend />
              <Bar dataKey={itemLabel(itemA)} fill="#6366f1" />
              <Bar dataKey={itemLabel(itemB)} fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Trade-in calculator */}
      {bothCars && carA && (
        <TradeInCalculator
          currentMonthly={totalA}
          replacementMonthly={totalB}
          replacementPrice={(itemB as CarFormData).purchasePrice}
          currentLabel={itemLabel(itemA)}
          replacementLabel={itemLabel(itemB)}
        />
      )}
    </div>
  );
}

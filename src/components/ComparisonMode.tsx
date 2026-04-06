import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ItemEntryForm, type ItemFormData } from "./ItemEntryForm";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { computeMonthlyCosts, buildYearlyProjection } from "./CostDashboard";
import { computeSustainabilityScore, scoreToGrade, scoreToLabel } from "../lib/sustainabilityScore";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

function fmt(v: number) {
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
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
  const projA = buildYearlyProjection(costsA);
  const projB = buildYearlyProjection(costsB);
  const scoreA = computeSustainabilityScore(itemA);
  const scoreB = computeSustainabilityScore(itemB);

  const comparisonData = projA.map((row, i) => ({
    year: row.year,
    [itemLabel(itemA)]: row["Cumulative Cost"],
    [itemLabel(itemB)]: projB[i]["Cumulative Cost"],
  }));

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
                <p>5-Year: <span className="font-semibold">{fmt(total * 60)}</span></p>
                <p>Sustainability: <span className="font-semibold">{scoreToGrade(score)} — {scoreToLabel(score)}</span></p>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey={itemLabel(itemA)} fill="#6366f1" />
              <Bar dataKey={itemLabel(itemB)} fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ItemEntryForm, type ItemFormData, type CarFormData } from "./ItemEntryForm";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { computeMonthlyCosts, buildYearlyProjection } from "./CostDashboard";
import { computeSustainabilityScore, scoreToGrade, scoreToLabel } from "../lib/sustainabilityScore";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const CARD = { backgroundColor: "#1e1e3f", borderColor: "rgba(255,255,255,0.08)" };
const inputCls = "bg-[#2a2a5a] border-white/15 text-white placeholder:text-gray-500 focus-visible:ring-[#00d4ff]";

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

function TradeInCalculator({ currentMonthly, replacementMonthly, replacementPrice: _replacementPrice, currentLabel, replacementLabel }: TradeInProps) {
  const [tradeInValue, setTradeInValue] = useState(0);
  const [remainingLoan, setRemainingLoan] = useState(0);

  const equity = Math.max(0, tradeInValue - remainingLoan);
  const negative = Math.max(0, remainingLoan - tradeInValue);
  const monthlySavings = currentMonthly - replacementMonthly;

  let verdict: string;
  let verdictColor: string;

  if (monthlySavings <= 0) {
    verdict = `Vehicle B costs ${fmt(-monthlySavings)}/mo more than your current vehicle. Trade-in is not economically beneficial unless there are non-cost factors involved.`;
    verdictColor = "text-amber-400";
  } else {
    if (negative > 0) {
      const breakEvenMonths = Math.ceil(negative / monthlySavings);
      const yrs = (breakEvenMonths / 12).toFixed(1);
      verdict = `You have ${fmt(negative)} in negative equity. You'd break even in ${breakEvenMonths} months (${yrs} years) if you keep Vehicle B long enough to recoup the savings.`;
      verdictColor = breakEvenMonths <= 36 ? "text-green-400" : "text-amber-400";
    } else {
      verdict = `You have ${fmt(equity)} in trade-in equity, saving ${fmt(monthlySavings)}/month. Trade-in is financially favorable.`;
      verdictColor = "text-green-400";
    }
  }

  return (
    <div className="rounded-2xl border p-5 space-y-4" style={CARD}>
      <div>
        <h3 className="text-sm font-semibold text-white">Trade-in Calculator</h3>
        <p className="text-xs text-gray-400 mt-0.5">Should you trade in {currentLabel} for {replacementLabel}?</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-sm text-gray-300">Trade-in value of current vehicle ($)</Label>
          <Input
            type="number"
            value={tradeInValue || ""}
            onChange={(e) => setTradeInValue(parseFloat(e.target.value) || 0)}
            placeholder="e.g. 15000"
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-sm text-gray-300">Remaining loan balance ($)</Label>
          <Input
            type="number"
            value={remainingLoan || ""}
            onChange={(e) => setRemainingLoan(parseFloat(e.target.value) || 0)}
            placeholder="e.g. 8000"
            className={inputCls}
          />
        </div>
      </div>

      <div className="rounded-lg px-4 py-3 space-y-1.5 text-sm border" style={{ backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex justify-between">
          <span className="text-gray-400">Net trade-in equity</span>
          <span className={`font-semibold ${equity > 0 ? "text-green-400" : negative > 0 ? "text-red-400" : "text-gray-300"}`}>
            {fmt(equity - negative)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Monthly cost difference</span>
          <span className={`font-semibold ${monthlySavings > 0 ? "text-green-400" : "text-amber-400"}`}>
            {monthlySavings > 0 ? `-${fmt(monthlySavings)}/mo` : `+${fmt(-monthlySavings)}/mo`}
          </span>
        </div>
      </div>

      <p className={`text-sm font-medium ${verdictColor}`}>{verdict}</p>
    </div>
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

  const handleSubmitA = (data: ItemFormData) => { setItemA(data); setStep("b"); };
  const handleSubmitB = (data: ItemFormData) => { setItemB(data); setStep("results"); };
  const reset = () => { setItemA(null); setItemB(null); setStep("a"); };

  if (step === "a") {
    return (
      <div className="w-full max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Compare — Vehicle A</h2>
          <button className="text-sm text-gray-400 hover:text-[#00d4ff] transition-colors" onClick={() => navigate("/")}>Back</button>
        </div>
        <ItemEntryForm onSubmit={handleSubmitA} />
      </div>
    );
  }

  if (step === "b") {
    return (
      <div className="w-full max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Compare — Vehicle B</h2>
          <button className="text-sm text-gray-400 hover:text-[#00d4ff] transition-colors" onClick={reset}>Start over</button>
        </div>
        <p className="text-sm text-gray-400">
          Vehicle A: <span className="font-medium text-white">{itemA ? itemLabel(itemA) : ""}</span>
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
  const monthlySavings = totalA - totalB;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Comparison Results</h2>
        <button className="text-sm text-gray-400 hover:text-[#00d4ff] transition-colors" onClick={reset}>Compare again</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        {([itemA, itemB] as const).map((item, i) => {
          const total = i === 0 ? totalA : totalB;
          const score = i === 0 ? scoreA : scoreB;
          const isLower = total === Math.min(totalA, totalB);
          return (
            <div key={i} className="rounded-2xl border p-5 space-y-2" style={{
              ...CARD,
              borderColor: isLower ? "rgba(0,212,255,0.4)" : "rgba(255,255,255,0.08)",
            }}>
              <div>
                <p className="text-sm font-semibold text-white">{itemLabel(item)}</p>
                {isLower && <span className="text-xs text-[#00d4ff] font-medium">Lower cost</span>}
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-gray-400">Monthly: <span className="font-semibold text-[#00d4ff]">{fmt(total)}</span></p>
                <p className="text-gray-400">Annual: <span className="font-semibold text-orange-400">{fmt(total * 12)}</span></p>
                <p className="text-gray-400">5-Year: <span className="font-semibold text-pink-400">{fmt((i === 0 ? projA : projB)[4]?.["Cumulative Cost"] ?? total * 60)}</span></p>
                <p className="text-gray-400">Sustainability: <span className="font-semibold text-green-400">{scoreToGrade(score)} — {scoreToLabel(score)}</span></p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly delta callout */}
      {monthlySavings !== 0 && (
        <div className={`rounded-xl px-4 py-3 text-sm border ${
          monthlySavings > 0
            ? "border-green-500/30 text-green-300"
            : "border-amber-500/30 text-amber-300"
        }`} style={{ backgroundColor: monthlySavings > 0 ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)" }}>
          {monthlySavings > 0
            ? `Vehicle B saves you ${fmt(monthlySavings)}/month (${fmt(monthlySavings * 12)}/year) vs. Vehicle A.`
            : `Vehicle B costs ${fmt(-monthlySavings)}/month more (${fmt(-monthlySavings * 12)}/year) than Vehicle A.`}
        </div>
      )}

      {/* 5-year projection chart */}
      <div className="rounded-2xl border p-5" style={CARD}>
        <h3 className="text-sm font-semibold text-white mb-4">5-Year Cumulative Cost</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={comparisonData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="year" stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1e1e3f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
              formatter={(v) => typeof v === "number" ? fmt(v) : ""}
            />
            <Legend wrapperStyle={{ color: "#9ca3af" }} />
            <Bar dataKey={itemLabel(itemA)} fill="#00d4ff" />
            <Bar dataKey={itemLabel(itemB)} fill="#7c3aed" />
          </BarChart>
        </ResponsiveContainer>
      </div>

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

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { ItemFormData } from "./ItemEntryForm";

// ── Score calculation ──────────────────────────────────────────────────────

export function computeSustainabilityScore(item: ItemFormData): number {
  if (item.category === "car") {
    const baseByFuel: Record<string, number> = {
      electric: 85,
      hybrid: 70,
      diesel: 45,
      gasoline: 35,
    };
    const base = baseByFuel[item.fuelType] ?? 35;
    const mileageAdjust = Math.round((10000 - item.annualMileage) / 1000);
    return Math.min(100, Math.max(0, base + mileageAdjust));
  } else {
    const baseBySize: Record<string, number> = { small: 75, medium: 60, large: 45 };
    const bonusByType: Record<string, number> = { bird: 10, cat: 5, other: 5, dog: 0 };
    const base = baseBySize[item.size] ?? 60;
    const bonus = bonusByType[item.petType] ?? 0;
    return Math.min(100, Math.max(0, base + bonus));
  }
}

function scoreToGrade(score: number): string {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

function scoreToLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 35) return "Poor";
  return "Very Poor";
}

function scoreToColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 65) return "bg-lime-500";
  if (score >= 50) return "bg-yellow-500";
  if (score >= 35) return "bg-orange-500";
  return "bg-red-500";
}

// ── Component ──────────────────────────────────────────────────────────────

interface SustainabilityScoreProps {
  item: ItemFormData;
}

export function SustainabilityScore({ item }: SustainabilityScoreProps) {
  const score = computeSustainabilityScore(item);
  const grade = scoreToGrade(score);
  const label = scoreToLabel(score);
  const barColor = scoreToColor(score);

  return (
    <Card data-testid="sustainability-score">
      <CardHeader>
        <CardTitle className="text-base">Sustainability Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-4xl font-bold" data-testid="sustainability-grade">
            {grade}
          </span>
          <div className="text-right">
            <p className="text-lg font-semibold" data-testid="sustainability-value">
              {score}/100
            </p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${barColor}`}
            style={{ width: `${score}%` }}
            data-testid="sustainability-bar"
          />
        </div>
        {item.category === "car" && item.fuelType === "electric" && (
          <p className="text-xs text-muted-foreground">Zero direct emissions.</p>
        )}
        {item.category === "car" && item.fuelType === "gasoline" && (
          <p className="text-xs text-muted-foreground">
            Consider reducing mileage or switching to a hybrid or electric vehicle to improve your score.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  computeSustainabilityScore,
  scoreToGrade,
  scoreToLabel,
  scoreToColor,
} from "../lib/sustainabilityScore";
import type { ItemFormData } from "./ItemEntryForm";

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

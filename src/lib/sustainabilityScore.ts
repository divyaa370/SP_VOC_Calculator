import type { ItemFormData } from "../components/ItemEntryForm";

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

export function scoreToGrade(score: number): string {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

export function scoreToLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 35) return "Poor";
  return "Very Poor";
}

export function scoreToColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 65) return "bg-lime-500";
  if (score >= 50) return "bg-yellow-500";
  if (score >= 35) return "bg-orange-500";
  return "bg-red-500";
}

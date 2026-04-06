import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { ItemFormData, CarFormData } from "./ItemEntryForm";
import { AVG_ANNUAL_OWNERSHIP_COST } from "../lib/constants";

interface Alert {
  type: "warning" | "info";
  message: string;
}

export function buildRecommendations(
  item: ItemFormData,
  monthlyTotal: number,
  avgAnnualOwnershipCost = AVG_ANNUAL_OWNERSHIP_COST
): Alert[] {
  const alerts: Alert[] = [];
  const annualCost = monthlyTotal * 12;
  // High-cost threshold: 25% above the current national average (AAA data).
  const highCostThreshold = Math.round(avgAnnualOwnershipCost * 1.25);

  if (item.category === "car") {
    const car = item as CarFormData;

    if (annualCost > highCostThreshold) {
      alerts.push({ type: "warning", message: `Annual ownership cost exceeds $${highCostThreshold.toLocaleString()} (125% of the national average). Review your budget to ensure this is sustainable.` });
    }
    if (car.purchasePrice > 40000) {
      alerts.push({ type: "warning", message: "High purchase price means steep depreciation. Expect to lose significant value in the first 3 years." });
    }
    if (car.loanInterestRate > 8) {
      alerts.push({ type: "warning", message: `Your interest rate of ${car.loanInterestRate}% APR is above average. Consider refinancing if your credit score has improved since purchase.` });
    }
    if (car.fuelType === "gasoline" && car.annualMileage > 15000) {
      alerts.push({ type: "warning", message: "High mileage on a gasoline vehicle significantly increases fuel costs and emissions." });
    }
    if (car.fuelType === "gasoline" || car.fuelType === "diesel") {
      alerts.push({ type: "info", message: "Switching to a hybrid or electric vehicle could reduce your annual fuel costs by 40–60%." });
    }
    if (car.annualMileage > 15000) {
      alerts.push({ type: "info", message: "Reducing annual mileage through carpooling or remote work could lower fuel and maintenance costs." });
    }
    if ((car.insuranceMonthly ?? 0) < 50) {
      alerts.push({ type: "info", message: "Insurance looks low. Ensure you have adequate coverage — comprehensive and collision are recommended for financed vehicles." });
    }
    if (car.loanTermMonths >= 72) {
      alerts.push({ type: "warning", message: "Loan terms over 6 years mean you may owe more than the car is worth (negative equity). Consider a shorter term if possible." });
    }
  } else {
    if (annualCost > 5000) {
      alerts.push({ type: "warning", message: `Annual cost exceeds $5,000. Pet ownership at this level is a significant financial commitment.` });
    }
    const pet = item as { size?: string; petType?: string; monthlyExpenses?: number };
    if (pet.size === "large" && pet.petType === "dog") {
      alerts.push({ type: "info", message: "Large dogs have higher vet and food costs. Consider pet insurance to manage unexpected expenses." });
    }
    if (pet.petType === "dog" || pet.petType === "cat") {
      alerts.push({ type: "info", message: "Preventive vet visits and vaccinations are cheaper than emergency care. Budget at least $300/year for routine checkups." });
    }
  }

  return alerts;
}

interface RecommendationsPanelProps {
  item: ItemFormData;
  monthlyTotal: number;
  avgAnnualOwnershipCost?: number;
}

export function RecommendationsPanel({ item, monthlyTotal, avgAnnualOwnershipCost }: RecommendationsPanelProps) {
  const alerts = buildRecommendations(item, monthlyTotal, avgAnnualOwnershipCost);

  if (alerts.length === 0) return null;

  return (
    <Card data-testid="recommendations-panel">
      <CardHeader>
        <CardTitle className="text-base">Alerts & Recommendations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={`flex gap-2 rounded-md px-3 py-2 text-sm ${
              alert.type === "warning"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            }`}
            data-testid={`alert-${alert.type}`}
          >
            <span className="mt-0.5 shrink-0">{alert.type === "warning" ? "⚠" : "ℹ"}</span>
            <span>{alert.message}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

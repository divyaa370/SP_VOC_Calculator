import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { ItemFormData } from "./ItemEntryForm";

interface Alert {
  type: "warning" | "info";
  message: string;
}

export function buildRecommendations(item: ItemFormData, monthlyTotal: number): Alert[] {
  const alerts: Alert[] = [];
  const annualCost = monthlyTotal * 12;

  if (item.category === "car") {
    if (annualCost > 12000) {
      alerts.push({
        type: "warning",
        message: `Annual cost exceeds $12,000. Review your budget to ensure this is sustainable.`,
      });
    }
    if (item.purchasePrice > 40000) {
      alerts.push({
        type: "warning",
        message: "High purchase price means steep depreciation. Expect to lose significant value in the first 3 years.",
      });
    }
    if (item.fuelType === "gasoline" && item.annualMileage > 15000) {
      alerts.push({
        type: "warning",
        message: "High mileage on a gasoline vehicle significantly increases fuel costs and emissions.",
      });
    }
    if (item.fuelType === "gasoline" || item.fuelType === "diesel") {
      alerts.push({
        type: "info",
        message: "Switching to a hybrid or electric vehicle could reduce your annual fuel costs by 40–60%.",
      });
    }
    if (item.annualMileage > 15000) {
      alerts.push({
        type: "info",
        message: "Reducing annual mileage through carpooling or remote work days could lower both fuel and maintenance costs.",
      });
    }
    if (item.monthlyExpenses < 100 && item.fuelType !== "electric") {
      alerts.push({
        type: "info",
        message: "Your monthly expenses look low. Ensure your budget includes routine maintenance (oil changes, tires, etc.).",
      });
    }
  } else {
    if (annualCost > 5000) {
      alerts.push({
        type: "warning",
        message: `Annual cost exceeds $5,000. Pet ownership at this level is a significant financial commitment.`,
      });
    }
    if (item.size === "large" && item.petType === "dog") {
      alerts.push({
        type: "info",
        message: "Large dogs have higher vet and food costs. Consider pet insurance to manage unexpected expenses.",
      });
    }
    if (item.petType === "dog" || item.petType === "cat") {
      alerts.push({
        type: "info",
        message: "Preventive vet visits and vaccinations are cheaper than emergency care. Budget at least $300/year for routine checkups.",
      });
    }
    if (item.monthlyExpenses < 50) {
      alerts.push({
        type: "info",
        message: "Your monthly expenses look low. Ensure your budget covers food, grooming, and routine vet care.",
      });
    }
  }

  return alerts;
}

interface RecommendationsPanelProps {
  item: ItemFormData;
  monthlyTotal: number;
}

export function RecommendationsPanel({ item, monthlyTotal }: RecommendationsPanelProps) {
  const alerts = buildRecommendations(item, monthlyTotal);

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

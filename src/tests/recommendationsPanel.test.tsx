import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecommendationsPanel, buildRecommendations } from "../components/RecommendationsPanel";
import type { ItemFormData } from "../components/ItemEntryForm";

const baseCarFields = {
  state: "TX", mpg: 28, fuelPricePerUnit: 3.45,
  downPayment: 5000, loanAmount: 20000, loanInterestRate: 6.5, loanTermMonths: 60,
  insuranceMonthly: 150, registrationAnnual: 250, parkingMonthly: 0,
};

const gasCar: ItemFormData = {
  category: "car", make: "Toyota", model: "Camry", year: 2022,
  fuelType: "gasoline", annualMileage: 12000, purchasePrice: 25000, ...baseCarFields,
};

const electricCar: ItemFormData = {
  category: "car", make: "Tesla", model: "Model 3", year: 2023,
  fuelType: "electric", annualMileage: 10000, purchasePrice: 35000,
  ...baseCarFields, mpg: 3.5, fuelPricePerUnit: 0.16,
};

const expensiveCar: ItemFormData = {
  ...gasCar, purchasePrice: 55000, annualMileage: 20000,
};

const largeDog: ItemFormData = {
  category: "pet", petType: "dog", breed: "Labrador",
  ageYears: 3, size: "large", purchasePrice: 1200, monthlyExpenses: 200,
};

describe("buildRecommendations", () => {
  it("warns when annual car cost exceeds 125% of the national average", () => {
    // monthlyTotal=1100 → annualCost=$13,200 > threshold ($15,228 at default AAA avg)
    // Use a higher monthly to ensure we exceed the dynamic 125% threshold
    const alerts = buildRecommendations(gasCar, 1300);
    expect(alerts.some((a) => a.type === "warning" && /national average/i.test(a.message))).toBe(true);
  });

  it("warns on high purchase price", () => {
    const alerts = buildRecommendations(expensiveCar, 800);
    expect(alerts.some((a) => a.type === "warning" && /depreciation/i.test(a.message))).toBe(true);
  });

  it("warns on high mileage gasoline car", () => {
    const alerts = buildRecommendations(expensiveCar, 800);
    expect(alerts.some((a) => a.type === "warning" && /mileage/i.test(a.message))).toBe(true);
  });

  it("recommends EV for gasoline car", () => {
    const alerts = buildRecommendations(gasCar, 500);
    expect(alerts.some((a) => a.type === "info" && /hybrid or electric/i.test(a.message))).toBe(true);
  });

  it("does not recommend EV for electric car", () => {
    const alerts = buildRecommendations(electricCar, 500);
    expect(alerts.some((a) => /hybrid or electric/i.test(a.message))).toBe(false);
  });

  it("recommends pet insurance for large dog", () => {
    const alerts = buildRecommendations(largeDog, 400);
    expect(alerts.some((a) => /pet insurance/i.test(a.message))).toBe(true);
  });

  it("warns when annual pet cost exceeds $5k", () => {
    const alerts = buildRecommendations(largeDog, 500);
    expect(alerts.some((a) => a.type === "warning" && /5,000/.test(a.message))).toBe(true);
  });
});

describe("RecommendationsPanel component", () => {
  it("renders panel with alerts for a gasoline car", () => {
    render(<RecommendationsPanel item={gasCar} monthlyTotal={500} />);
    expect(screen.getByTestId("recommendations-panel")).toBeDefined();
  });

  it("renders warning and info alert types", () => {
    render(<RecommendationsPanel item={expensiveCar} monthlyTotal={1200} />);
    expect(screen.getAllByTestId("alert-warning").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("alert-info").length).toBeGreaterThan(0);
  });
});

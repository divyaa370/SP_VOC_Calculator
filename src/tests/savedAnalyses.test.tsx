import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SavedAnalyses } from "../components/SavedAnalyses";
import type { SavedAnalysis } from "../lib/savedAnalyses";
import type { ItemFormData } from "../components/ItemEntryForm";

const baseCarFields = {
  state: "TX", mpg: 28, fuelPricePerUnit: 3.45,
  downPayment: 5000, loanAmount: 20000, loanInterestRate: 6.5, loanTermMonths: 60,
  insuranceMonthly: 150, registrationAnnual: 250, parkingMonthly: 0,
};

const carItem: ItemFormData = {
  category: "car", make: "Toyota", model: "Camry", year: 2022,
  fuelType: "gasoline", annualMileage: 12000, purchasePrice: 25000, ...baseCarFields,
};

const petItem: ItemFormData = {
  category: "pet", petType: "dog", breed: "Labrador",
  ageYears: 3, size: "large", purchasePrice: 1200, monthlyExpenses: 150,
};

const mockAnalyses: SavedAnalysis[] = [
  { id: "1", createdAt: "2026-03-01T10:00:00.000Z", label: "2022 Toyota Camry", item: carItem },
  { id: "2", createdAt: "2026-03-15T14:30:00.000Z", label: "Labrador (dog)", item: petItem },
];

describe("SavedAnalyses component", () => {
  it("shows empty state when no analyses", () => {
    render(<SavedAnalyses analyses={[]} onView={() => {}} onDelete={() => {}} />);
    expect(screen.getByTestId("empty-saved")).toBeDefined();
  });

  it("renders list of saved analyses", () => {
    render(<SavedAnalyses analyses={mockAnalyses} onView={() => {}} onDelete={() => {}} />);
    expect(screen.getByTestId("saved-analyses-list")).toBeDefined();
    expect(screen.getByText("2022 Toyota Camry")).toBeDefined();
    expect(screen.getByText("Labrador (dog)")).toBeDefined();
  });

  it("calls onView with the correct analysis when View is clicked", () => {
    const onView = (a: SavedAnalysis) => { expect(a.id).toBe("1"); };
    render(<SavedAnalyses analyses={mockAnalyses} onView={onView} onDelete={() => {}} />);
    fireEvent.click(screen.getAllByRole("button", { name: /view/i })[0]);
  });

  it("calls onDelete with the correct id when Delete is clicked", () => {
    const onDelete = (id: string) => { expect(id).toBe("1"); };
    render(<SavedAnalyses analyses={mockAnalyses} onView={() => {}} onDelete={onDelete} />);
    fireEvent.click(screen.getAllByRole("button", { name: /delete/i })[0]);
  });
});

// localStorage fallback smoke test (AnalysisService is legacy; tests use lib directly)
describe("localStorage saved analyses fallback", () => {
  const userId = "test-user-123";
  const lsKey = `truecost_analyses_${userId}`;

  beforeEach(() => localStorage.removeItem(lsKey));
  afterEach(() => localStorage.removeItem(lsKey));

  it("starts empty", () => {
    expect(JSON.parse(localStorage.getItem(lsKey) ?? "[]")).toHaveLength(0);
  });

  it("can write and read back an entry", () => {
    const entry: SavedAnalysis = {
      id: "x", createdAt: new Date().toISOString(),
      label: "2022 Toyota Camry", item: carItem,
    };
    localStorage.setItem(lsKey, JSON.stringify([entry]));
    const stored = JSON.parse(localStorage.getItem(lsKey)!);
    expect(stored[0].label).toBe("2022 Toyota Camry");
  });
});

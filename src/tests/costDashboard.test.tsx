import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CostDashboard, computeMonthlyCosts, buildYearlyProjection } from "../components/CostDashboard";
import type { ItemFormData } from "../components/ItemEntryForm";

// Recharts uses ResizeObserver + SVG sizing — stub it for jsdom
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// ── Test fixtures ─────────────────────────────────────────────────────────

const carItem: ItemFormData = {
  category: "car",
  make: "Toyota",
  model: "Camry",
  year: 2022,
  fuelType: "gasoline",
  annualMileage: 12000,
  purchasePrice: 25000,
  monthlyExpenses: 200,
};

const petItem: ItemFormData = {
  category: "pet",
  petType: "dog",
  breed: "Labrador",
  ageYears: 3,
  size: "large",
  purchasePrice: 1500,
  monthlyExpenses: 150,
};

// ── computeMonthlyCosts ───────────────────────────────────────────────────

describe("computeMonthlyCosts – car", () => {
  it("returns positive values for all cost categories", () => {
    const costs = computeMonthlyCosts(carItem);
    Object.values(costs).forEach((v) => expect(v).toBeGreaterThan(0));
  });

  it("includes Depreciation, Fuel, Insurance, Maintenance, Other", () => {
    const costs = computeMonthlyCosts(carItem);
    expect(costs).toHaveProperty("Depreciation");
    expect(costs).toHaveProperty("Fuel");
    expect(costs).toHaveProperty("Insurance");
    expect(costs).toHaveProperty("Maintenance");
    expect(costs).toHaveProperty("Other");
  });

  it("Other equals monthlyExpenses input", () => {
    const costs = computeMonthlyCosts(carItem);
    expect(costs.Other).toBe(carItem.monthlyExpenses);
  });

  it("electric car has lower fuel cost than gasoline at same mileage", () => {
    const electricCar: ItemFormData = { ...carItem, fuelType: "electric" };
    const gasCosts = computeMonthlyCosts(carItem);
    const elCosts = computeMonthlyCosts(electricCar);
    expect(elCosts.Fuel).toBeLessThan(gasCosts.Fuel);
  });
});

describe("computeMonthlyCosts – pet", () => {
  it("returns positive values for all cost categories", () => {
    const costs = computeMonthlyCosts(petItem);
    Object.values(costs).forEach((v) => expect(v).toBeGreaterThan(0));
  });

  it("includes Food, Vet, Grooming, Supplies, Other", () => {
    const costs = computeMonthlyCosts(petItem);
    expect(costs).toHaveProperty("Food");
    expect(costs).toHaveProperty("Vet");
    expect(costs).toHaveProperty("Grooming");
    expect(costs).toHaveProperty("Supplies");
    expect(costs).toHaveProperty("Other");
  });

  it("large pet has higher food cost than small pet", () => {
    const smallPet: ItemFormData = { ...petItem, size: "small" };
    const largeCosts = computeMonthlyCosts(petItem);
    const smallCosts = computeMonthlyCosts(smallPet);
    expect(largeCosts.Food).toBeGreaterThan(smallCosts.Food);
  });

  it("Other equals monthlyExpenses input", () => {
    const costs = computeMonthlyCosts(petItem);
    expect(costs.Other).toBe(petItem.monthlyExpenses);
  });
});

// ── buildYearlyProjection ─────────────────────────────────────────────────

describe("buildYearlyProjection", () => {
  it("returns 5 data points by default", () => {
    const data = buildYearlyProjection({ A: 100, B: 200 });
    expect(data).toHaveLength(5);
  });

  it("cumulative cost grows each year", () => {
    const data = buildYearlyProjection({ A: 100, B: 200 });
    for (let i = 1; i < data.length; i++) {
      expect(data[i]["Cumulative Cost"]).toBeGreaterThan(data[i - 1]["Cumulative Cost"]);
    }
  });

  it("annual cost is constant across all years", () => {
    const data = buildYearlyProjection({ A: 100, B: 200 });
    const annualCost = data[0]["Annual Cost"];
    data.forEach((d) => expect(d["Annual Cost"]).toBe(annualCost));
  });

  it("year 1 cumulative equals annual cost", () => {
    const data = buildYearlyProjection({ A: 100, B: 200 });
    expect(data[0]["Cumulative Cost"]).toBe(data[0]["Annual Cost"]);
  });

  it("respects custom year count", () => {
    const data = buildYearlyProjection({ A: 100 }, 3);
    expect(data).toHaveLength(3);
  });
});

// ── CostDashboard rendering ───────────────────────────────────────────────

describe("CostDashboard – rendering", () => {
  it("shows item label for car", () => {
    render(<CostDashboard item={carItem} onReset={vi.fn()} />);
    expect(screen.getByText(/2022 Toyota Camry/i)).toBeDefined();
  });

  it("shows item label for pet", () => {
    render(<CostDashboard item={petItem} onReset={vi.fn()} />);
    expect(screen.getByText(/labrador.*dog/i)).toBeDefined();
  });

  it("renders summary cards section", () => {
    render(<CostDashboard item={carItem} onReset={vi.fn()} />);
    const cards = screen.getByTestId("summary-cards");
    expect(cards).toBeDefined();
    expect(within(cards).getByText(/monthly cost/i)).toBeDefined();
    expect(within(cards).getByText(/annual cost/i)).toBeDefined();
    expect(within(cards).getByText(/5-year cost/i)).toBeDefined();
  });

  it("displays dollar amounts in summary cards", () => {
    render(<CostDashboard item={carItem} onReset={vi.fn()} />);
    const dollarValues = screen.getAllByText(/^\$[\d,]+$/);
    expect(dollarValues.length).toBeGreaterThanOrEqual(3);
  });

  it("shows monthly breakdown chart title", () => {
    render(<CostDashboard item={carItem} onReset={vi.fn()} />);
    expect(screen.getByText(/monthly cost breakdown/i)).toBeDefined();
  });

  it("shows 5-year projection chart title", () => {
    render(<CostDashboard item={carItem} onReset={vi.fn()} />);
    expect(screen.getByText(/5-year cost projection/i)).toBeDefined();
  });

  it("calls onReset when Start over is clicked", async () => {
    const onReset = vi.fn();
    render(<CostDashboard item={carItem} onReset={onReset} />);
    await userEvent.click(screen.getByText(/start over/i));
    expect(onReset).toHaveBeenCalledOnce();
  });
});

// ── Summary card values ───────────────────────────────────────────────────

describe("CostDashboard – summary values", () => {
  it("annual cost is 12x monthly cost", () => {
    const costs = computeMonthlyCosts(carItem);
    const monthly = Object.values(costs).reduce((a, b) => a + b, 0);
    const annual = monthly * 12;
    const projection = buildYearlyProjection(costs);
    expect(projection[0]["Annual Cost"]).toBe(Math.round(annual));
  });

  it("5-year cumulative is 5x annual cost", () => {
    const costs = computeMonthlyCosts(carItem);
    const projection = buildYearlyProjection(costs);
    expect(projection[4]["Cumulative Cost"]).toBe(projection[0]["Annual Cost"] * 5);
  });
});

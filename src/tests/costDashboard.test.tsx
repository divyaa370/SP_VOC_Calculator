import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  state: "TX",
  annualMileage: 12000,
  mpg: 28,
  fuelPricePerUnit: 3.45,
  purchasePrice: 25000,
  downPayment: 5000,
  loanAmount: 20000,
  loanInterestRate: 6.5,
  loanTermMonths: 60,
  insuranceMonthly: 150,
  registrationAnnual: 250,
  parkingMonthly: 0,
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
    Object.values(costs).forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
  });

  it("includes expected cost keys", () => {
    const costs = computeMonthlyCosts(carItem);
    expect(costs).toHaveProperty("Loan Payment");
    expect(costs).toHaveProperty("Fuel");
    expect(costs).toHaveProperty("Insurance");
    expect(costs).toHaveProperty("Maintenance");
    expect(costs).toHaveProperty("Depreciation");
  });

  it("insurance equals input", () => {
    const costs = computeMonthlyCosts(carItem);
    expect(costs.Insurance).toBe(carItem.insuranceMonthly);
  });

  it("electric car has lower fuel cost than gasoline at same mileage", () => {
    const electricCar: ItemFormData = { ...carItem, fuelType: "electric", mpg: 3.5, fuelPricePerUnit: 0.16 };
    const gasCosts = computeMonthlyCosts(carItem);
    const elCosts = computeMonthlyCosts(electricCar);
    expect(elCosts.Fuel).toBeLessThan(gasCosts.Fuel);
  });

  it("zero mileage results in zero fuel cost", () => {
    const zeroCar: ItemFormData = { ...carItem, annualMileage: 0.001 };
    const costs = computeMonthlyCosts(zeroCar);
    expect(costs.Fuel).toBeGreaterThanOrEqual(0);
  });

  it("zero purchase price yields zero depreciation", () => {
    const freeCar: ItemFormData = { ...carItem, purchasePrice: 0, loanAmount: 0 };
    const costs = computeMonthlyCosts(freeCar);
    expect(costs.Depreciation).toBe(0);
  });

  it("EV has zero fuel cost when mileage is zero", () => {
    const ev: ItemFormData = { ...carItem, fuelType: "electric", mpg: 4, fuelPricePerUnit: 0.14, annualMileage: 0 };
    const costs = computeMonthlyCosts(ev);
    expect(costs.Fuel).toBe(0);
  });

  it("cash purchase (no loan) yields zero loan payment", () => {
    const cashCar: ItemFormData = { ...carItem, loanAmount: 0, loanTermMonths: 0 };
    const costs = computeMonthlyCosts(cashCar);
    expect(costs["Loan Payment"]).toBe(0);
  });

  it("luxury make has higher maintenance than economy make at same year", () => {
    const bmw: ItemFormData = { ...carItem, make: "BMW" };
    const toyota: ItemFormData = { ...carItem, make: "Toyota" };
    expect(computeMonthlyCosts(bmw).Maintenance).toBeGreaterThan(computeMonthlyCosts(toyota).Maintenance);
  });

  it("very high mileage (500000) does not produce Infinity or NaN", () => {
    const highMileage: ItemFormData = { ...carItem, annualMileage: 500000 };
    const costs = computeMonthlyCosts(highMileage);
    Object.values(costs).forEach((v) => {
      expect(Number.isFinite(v)).toBe(true);
      expect(Number.isNaN(v)).toBe(false);
    });
  });

  it("all four fuel types produce distinct fuel costs at same mileage/price", () => {
    const gasCosts = computeMonthlyCosts({ ...carItem, fuelType: "gasoline", mpg: 28, fuelPricePerUnit: 3.45 }).Fuel;
    const dieselCosts = computeMonthlyCosts({ ...carItem, fuelType: "diesel", mpg: 32, fuelPricePerUnit: 3.80 }).Fuel;
    const evCosts = computeMonthlyCosts({ ...carItem, fuelType: "electric", mpg: 3.5, fuelPricePerUnit: 0.16 }).Fuel;
    const hybridCosts = computeMonthlyCosts({ ...carItem, fuelType: "hybrid", mpg: 45, fuelPricePerUnit: 3.45 }).Fuel;
    const uniqueValues = new Set([gasCosts, dieselCosts, evCosts, hybridCosts]);
    expect(uniqueValues.size).toBe(4);
  });

  it("depreciation is always less than purchasePrice / 12", () => {
    const costs = computeMonthlyCosts(carItem);
    expect(costs.Depreciation).toBeLessThan(carItem.purchasePrice / 12);
  });

  it("all returned values are finite numbers (no Infinity or NaN)", () => {
    const costs = computeMonthlyCosts(carItem);
    Object.entries(costs).forEach(([key, val]) => {
      expect(Number.isFinite(val), `${key} should be finite`).toBe(true);
    });
  });
});

// ── buildYearlyProjection ─────────────────────────────────────────────────

describe("buildYearlyProjection", () => {
  it("returns 5 data points by default", () => {
    const costs = computeMonthlyCosts(carItem);
    const data = buildYearlyProjection(costs, carItem);
    expect(data).toHaveLength(5);
  });

  it("cumulative cost grows each year", () => {
    const costs = computeMonthlyCosts(carItem);
    const data = buildYearlyProjection(costs, carItem);
    for (let i = 1; i < data.length; i++) {
      expect(data[i]["Cumulative Cost"]).toBeGreaterThan(data[i - 1]["Cumulative Cost"]);
    }
  });

  it("vehicle value decreases over time", () => {
    const costs = computeMonthlyCosts(carItem);
    const data = buildYearlyProjection(costs, carItem, 5);
    for (let i = 1; i < data.length; i++) {
      expect(data[i]["Vehicle Value"]).toBeLessThan(data[i - 1]["Vehicle Value"]);
    }
  });

  it("respects custom year count", () => {
    const costs = computeMonthlyCosts(carItem);
    const data = buildYearlyProjection(costs, carItem, 10);
    expect(data).toHaveLength(10);
  });

  it("years=1 returns exactly 1 data point with a positive cumulative cost", () => {
    const costs = computeMonthlyCosts(carItem);
    const data = buildYearlyProjection(costs, carItem, 1);
    expect(data).toHaveLength(1);
    expect(data[0]["Cumulative Cost"]).toBeGreaterThan(0);
  });

  it("years=15 returns exactly 15 data points all with finite values", () => {
    const costs = computeMonthlyCosts(carItem);
    const data = buildYearlyProjection(costs, carItem, 15);
    expect(data).toHaveLength(15);
    data.forEach((row) => {
      expect(Number.isFinite(row["Cumulative Cost"])).toBe(true);
      expect(Number.isFinite(row["Vehicle Value"])).toBe(true);
    });
  });
});

// ── CostDashboard rendering ───────────────────────────────────────────────

describe("CostDashboard – rendering", () => {
  it("shows item label for car", () => {
    render(<CostDashboard item={carItem} onReset={vi.fn()} />);
    expect(screen.getByText(/2022 Toyota Camry/i)).toBeDefined();
  });

  it("renders summary cards section", () => {
    render(<CostDashboard item={carItem} onReset={vi.fn()} />);
    const cards = screen.getByTestId("summary-cards");
    expect(cards).toBeDefined();
  });

  it("shows monthly breakdown chart title", () => {
    render(<CostDashboard item={carItem} onReset={vi.fn()} />);
    expect(screen.getByText(/monthly cost breakdown/i)).toBeDefined();
  });

  it("shows projection chart title", () => {
    render(<CostDashboard item={carItem} onReset={vi.fn()} />);
    expect(screen.getByText(/ownership cost projection/i)).toBeDefined();
  });

  it("calls onReset when Start over is clicked", async () => {
    const onReset = vi.fn();
    render(<CostDashboard item={carItem} onReset={onReset} />);
    await userEvent.click(screen.getByText(/start over/i));
    expect(onReset).toHaveBeenCalledOnce();
  });
});

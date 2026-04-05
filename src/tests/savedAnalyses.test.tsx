import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SavedAnalyses } from "../components/SavedAnalyses";
import { AnalysisService } from "../services/analysisService";
import type { SavedAnalysis } from "../services/analysisService";
import type { ItemFormData } from "../components/ItemEntryForm";

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
  purchasePrice: 1200,
  monthlyExpenses: 150,
};

const mockAnalyses: SavedAnalysis[] = [
  { id: "1", createdAt: "2026-03-01T10:00:00.000Z", item: carItem },
  { id: "2", createdAt: "2026-03-15T14:30:00.000Z", item: petItem },
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
    const onView = (a: SavedAnalysis) => {
      expect(a.id).toBe("1");
    };
    render(<SavedAnalyses analyses={mockAnalyses} onView={onView} onDelete={() => {}} />);
    const viewButtons = screen.getAllByRole("button", { name: /view/i });
    fireEvent.click(viewButtons[0]);
  });

  it("calls onDelete with the correct id when Delete is clicked", () => {
    const onDelete = (id: string) => {
      expect(id).toBe("1");
    };
    render(<SavedAnalyses analyses={mockAnalyses} onView={() => {}} onDelete={onDelete} />);
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
  });
});

describe("AnalysisService", () => {
  const userId = "test-user-123";

  beforeEach(() => localStorage.removeItem(`truecost_analyses_${userId}`));
  afterEach(() => localStorage.removeItem(`truecost_analyses_${userId}`));

  it("returns empty array when no analyses stored", () => {
    expect(AnalysisService.getAll(userId)).toEqual([]);
  });

  it("saves and retrieves an analysis", () => {
    AnalysisService.save(userId, carItem);
    const results = AnalysisService.getAll(userId);
    expect(results).toHaveLength(1);
    expect(results[0].item).toEqual(carItem);
    expect(results[0].id).toBeDefined();
    expect(results[0].createdAt).toBeDefined();
  });

  it("prepends new analyses (most recent first)", () => {
    AnalysisService.save(userId, carItem);
    AnalysisService.save(userId, petItem);
    const results = AnalysisService.getAll(userId);
    expect(results[0].item.category).toBe("pet");
    expect(results[1].item.category).toBe("car");
  });

  it("deletes an analysis by id", () => {
    const saved = AnalysisService.save(userId, carItem);
    AnalysisService.save(userId, petItem);
    AnalysisService.delete(userId, saved.id);
    const results = AnalysisService.getAll(userId);
    expect(results).toHaveLength(1);
    expect(results[0].item.category).toBe("pet");
  });

  it("is isolated per userId", () => {
    AnalysisService.save("user-a", carItem);
    expect(AnalysisService.getAll("user-b")).toHaveLength(0);
    localStorage.removeItem("truecost_analyses_user-a");
  });
});

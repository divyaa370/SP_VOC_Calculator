/**
 * Integration smoke test — authenticated happy path.
 *
 * Renders the full app with a mocked Supabase session and walks through the
 * core user flow: fill car form → view dashboard → save analysis → start over.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../../services/authService", () => ({
  AuthService: {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn().mockResolvedValue({
      user: { id: "test-user-id", email: "test@example.com" },
      access_token: "fake-token",
    } as Session),
    onAuthStateChange: vi.fn().mockImplementation((cb: (s: Session) => void) => {
      cb({
        user: { id: "test-user-id", email: "test@example.com" },
        access_token: "fake-token",
      } as Session);
      return () => {};
    }),
  },
}));

vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      refreshSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

vi.mock("../../lib/savedAnalyses", () => ({
  saveAnalysis: vi.fn(),
  getSavedAnalyses: vi.fn().mockResolvedValue([]),
  getAnalysisById: vi.fn().mockResolvedValue(null),
  deleteAnalysis: vi.fn(),
}));

vi.mock("../../lib/searchHistory", () => ({
  addSearchHistory: vi.fn(),
  getSearchHistory: vi.fn().mockReturnValue([]),
  clearSearchHistory: vi.fn(),
}));

vi.mock("../../services/liveData", () => ({
  fetchAllLiveData: vi.fn().mockResolvedValue({
    gasPricePerGallon: 3.45,
    dieselPricePerGallon: 3.80,
    electricityRatePerKwh: 0.16,
    avgMpgByFuelType: { gasoline: 28, diesel: 32, electric: 3.5, hybrid: 45 },
    maintenanceCostPerMile: 0.068,
    insuranceIndexMultiplier: 1.0,
    nationalAvgMonthlyInsurance: 137,
    avgAnnualOwnershipCost: 12182,
    dataAge: {},
    errors: {},
  }),
}));

vi.mock("tempo-routes", () => ({ default: [] }));

vi.mock("../../lib/vinLookup", () => ({
  decodeVin: vi.fn().mockResolvedValue({ error: "No VIN provided" }),
}));

vi.mock("../../lib/epaData", () => ({
  getEpaMpg: vi.fn().mockResolvedValue(null),
}));

// ResizeObserver stub required for Recharts in jsdom
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// URL.createObjectURL stub for CSV export
global.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock");
global.URL.revokeObjectURL = vi.fn();

import { saveAnalysis } from "../../lib/savedAnalyses";
import App from "../../App";

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Happy path — car form → dashboard → save → reset", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the car entry form for an authenticated user", async () => {
    renderApp();
    await waitFor(() => {
      expect(screen.getByText(/vehicle cost calculator/i)).toBeDefined();
    });
  });

  it("fills form, submits, and shows cost dashboard with summary cards", async () => {
    renderApp();
    await waitFor(() => screen.getByText(/vehicle cost calculator/i));

    // Select make
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /make/i }) ?? screen.getAllByRole("combobox")[0],
      "Toyota"
    );

    // Select model (waits for make to populate models)
    await waitFor(() => {
      const modelSelect = screen.getAllByRole("combobox")[1];
      expect(modelSelect).toBeDefined();
    });
    await userEvent.selectOptions(screen.getAllByRole("combobox")[1], "Camry");

    // Set year
    const yearInput = screen.getByPlaceholderText("2022");
    await userEvent.clear(yearInput);
    await userEvent.type(yearInput, "2022");

    // Set purchase price (still on Vehicle tab)
    const priceInput = screen.getByPlaceholderText("30000");
    await userEvent.clear(priceInput);
    await userEvent.type(priceInput, "25000");

    // Navigate to Financing tab
    await userEvent.click(screen.getByRole("button", { name: /next/i }));

    // Navigate to Running Costs tab
    await userEvent.click(screen.getByRole("button", { name: /next/i }));

    // Submit
    await userEvent.click(screen.getByRole("button", { name: /calculate costs/i }));

    // Dashboard should appear with summary cards
    await waitFor(() => {
      expect(screen.getByTestId("summary-cards")).toBeDefined();
    });

    // Should show dollar amounts in at least one card
    await waitFor(() => {
      const cards = screen.getByTestId("summary-cards");
      expect(cards.textContent).toMatch(/\$[\d,]+/);
    });
  });

  it("calls saveAnalysis when 'Save analysis' is clicked", async () => {
    renderApp();
    await waitFor(() => screen.getByText(/vehicle cost calculator/i));

    // Quick path: select Toyota Camry and submit through tabs
    await userEvent.selectOptions(screen.getAllByRole("combobox")[0], "Toyota");
    await waitFor(() => screen.getAllByRole("combobox")[1]);
    await userEvent.selectOptions(screen.getAllByRole("combobox")[1], "Camry");
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await userEvent.click(screen.getByRole("button", { name: /calculate costs/i }));

    await waitFor(() => screen.getByTestId("summary-cards"));

    await userEvent.click(screen.getByRole("button", { name: /save analysis/i }));

    expect(saveAnalysis).toHaveBeenCalledWith(
      "test-user-id",
      expect.objectContaining({ category: "car", make: "Toyota", model: "Camry" })
    );
  });

  it("returns to entry form when 'Start over' is clicked", async () => {
    renderApp();
    await waitFor(() => screen.getByText(/vehicle cost calculator/i));

    await userEvent.selectOptions(screen.getAllByRole("combobox")[0], "Toyota");
    await waitFor(() => screen.getAllByRole("combobox")[1]);
    await userEvent.selectOptions(screen.getAllByRole("combobox")[1], "Camry");
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await userEvent.click(screen.getByRole("button", { name: /calculate costs/i }));

    await waitFor(() => screen.getByTestId("summary-cards"));

    await userEvent.click(screen.getByRole("button", { name: /start over/i }));

    await waitFor(() => {
      expect(screen.getByText(/vehicle cost calculator/i)).toBeDefined();
    });
  });
});

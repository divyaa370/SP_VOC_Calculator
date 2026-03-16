import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItemEntryForm } from "../components/ItemEntryForm";

function renderForm(onSubmit = vi.fn()) {
  return { onSubmit, ...render(<ItemEntryForm onSubmit={onSubmit} />) };
}

// ── Rendering ────────────────────────────────────────────────────────────

describe("ItemEntryForm – rendering", () => {
  it("renders category selector", () => {
    renderForm();
    expect(screen.getByLabelText(/category/i)).toBeDefined();
  });

  it("shows car fields by default", () => {
    renderForm();
    expect(screen.getByLabelText(/make/i)).toBeDefined();
    expect(screen.getByLabelText(/model/i)).toBeDefined();
    expect(screen.getByLabelText(/year/i)).toBeDefined();
    expect(screen.getByLabelText(/fuel type/i)).toBeDefined();
    expect(screen.getByLabelText(/annual mileage/i)).toBeDefined();
  });

  it("shows shared cost fields for car", () => {
    renderForm();
    expect(screen.getByLabelText(/purchase price/i)).toBeDefined();
    expect(screen.getByLabelText(/monthly expenses/i)).toBeDefined();
  });

  it("switches to pet fields when category changes to pet", async () => {
    renderForm();
    await userEvent.selectOptions(screen.getByLabelText(/category/i), "pet");
    expect(screen.getByLabelText(/pet type/i)).toBeDefined();
    expect(screen.getByLabelText(/breed/i)).toBeDefined();
    expect(screen.getByLabelText(/age/i)).toBeDefined();
    expect(screen.getByLabelText(/size/i)).toBeDefined();
  });

  it("hides car fields when pet is selected", async () => {
    renderForm();
    await userEvent.selectOptions(screen.getByLabelText(/category/i), "pet");
    expect(screen.queryByLabelText(/make/i)).toBeNull();
    expect(screen.queryByLabelText(/model/i)).toBeNull();
  });

  it("shows shared cost fields for pet", async () => {
    renderForm();
    await userEvent.selectOptions(screen.getByLabelText(/category/i), "pet");
    expect(screen.getByLabelText(/purchase price/i)).toBeDefined();
    expect(screen.getByLabelText(/monthly expenses/i)).toBeDefined();
  });
});

// ── Car validation ───────────────────────────────────────────────────────

describe("ItemEntryForm – car validation", () => {
  it("shows error when make is empty", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: /calculate/i }));
    await waitFor(() => {
      expect(screen.getByText(/make is required/i)).toBeDefined();
    });
  });

  it("shows error when model is empty", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: /calculate/i }));
    await waitFor(() => {
      expect(screen.getByText(/model is required/i)).toBeDefined();
    });
  });

  it("shows error for invalid year", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/year/i), "1800");
    await userEvent.click(screen.getByRole("button", { name: /calculate/i }));
    await waitFor(() => {
      expect(screen.getByText(/1886 or later/i)).toBeDefined();
    });
  });

  it("does not call onSubmit when car form is invalid", async () => {
    const { onSubmit } = renderForm();
    await userEvent.click(screen.getByRole("button", { name: /calculate/i }));
    await waitFor(() => screen.getByText(/make is required/i));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with correct car data when form is valid", async () => {
    const { onSubmit } = renderForm();

    await userEvent.type(screen.getByLabelText(/make/i), "Toyota");
    await userEvent.type(screen.getByLabelText(/model/i), "Camry");
    await userEvent.clear(screen.getByLabelText(/year/i));
    await userEvent.type(screen.getByLabelText(/year/i), "2022");
    await userEvent.selectOptions(screen.getByLabelText(/fuel type/i), "gasoline");
    await userEvent.type(screen.getByLabelText(/annual mileage/i), "12000");
    await userEvent.type(screen.getByLabelText(/purchase price/i), "25000");
    await userEvent.type(screen.getByLabelText(/monthly expenses/i), "400");
    await userEvent.click(screen.getByRole("button", { name: /calculate/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        category: "car",
        make: "Toyota",
        model: "Camry",
        year: 2022,
        fuelType: "gasoline",
        annualMileage: 12000,
        purchasePrice: 25000,
        monthlyExpenses: 400,
      })
    );
  });
});

// ── Pet validation ───────────────────────────────────────────────────────

describe("ItemEntryForm – pet validation", () => {
  async function switchToPet() {
    await userEvent.selectOptions(screen.getByLabelText(/category/i), "pet");
  }

  it("shows error when breed is empty", async () => {
    renderForm();
    await switchToPet();
    await userEvent.click(screen.getByRole("button", { name: /calculate/i }));
    await waitFor(() => {
      expect(screen.getByText(/breed is required/i)).toBeDefined();
    });
  });

  it("does not call onSubmit when pet form is invalid", async () => {
    const { onSubmit } = renderForm();
    await switchToPet();
    await userEvent.click(screen.getByRole("button", { name: /calculate/i }));
    await waitFor(() => screen.getByText(/breed is required/i));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with correct pet data when form is valid", async () => {
    const { onSubmit } = renderForm();
    await switchToPet();

    await userEvent.selectOptions(screen.getByLabelText(/pet type/i), "dog");
    await userEvent.type(screen.getByLabelText(/breed/i), "Labrador");
    await userEvent.type(screen.getByLabelText(/age/i), "3");
    await userEvent.selectOptions(screen.getByLabelText(/size/i), "large");
    await userEvent.type(screen.getByLabelText(/purchase price/i), "1500");
    await userEvent.type(screen.getByLabelText(/monthly expenses/i), "200");
    await userEvent.click(screen.getByRole("button", { name: /calculate/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        category: "pet",
        petType: "dog",
        breed: "Labrador",
        ageYears: 3,
        size: "large",
        purchasePrice: 1500,
        monthlyExpenses: 200,
      })
    );
  });
});

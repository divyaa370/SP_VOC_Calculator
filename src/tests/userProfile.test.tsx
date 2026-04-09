/**
 * Tests for the UserProfile form component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProfileForm } from "../components/auth/UserProfile";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user-123", email: "test@example.com" } }),
}));

vi.mock("../lib/auth", () => ({
  getUserProfile: vi.fn(() => null),
  saveUserProfile: vi.fn(),
}));

import { getUserProfile, saveUserProfile } from "../lib/auth";

beforeEach(() => {
  vi.clearAllMocks();
  (getUserProfile as ReturnType<typeof vi.fn>).mockReturnValue(null);
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe("UserProfileForm — rendering", () => {
  it("renders all section headings", () => {
    render(<UserProfileForm />);
    expect(screen.getByText(/identity/i)).toBeDefined();
    expect(screen.getByText(/commute/i)).toBeDefined();
    expect(screen.getByText(/fuel/i)).toBeDefined();
    expect(screen.getByText(/insurance/i)).toBeDefined();
    expect(screen.getByText(/vehicle defaults/i)).toBeDefined();
  });

  it("renders Save profile button", () => {
    render(<UserProfileForm />);
    expect(screen.getByRole("button", { name: /save profile/i })).toBeDefined();
  });
});

// ── Optional field submission ─────────────────────────────────────────────────

describe("UserProfileForm — optional fields", () => {
  it("submits without error when all fields are empty", async () => {
    render(<UserProfileForm />);
    await userEvent.click(screen.getByRole("button", { name: /save profile/i }));
    // saveUserProfile should be called even with all-empty optional fields
    await waitFor(() => {
      expect(saveUserProfile).toHaveBeenCalled();
    });
  });

  it("shows 'Profile saved' confirmation after save", async () => {
    render(<UserProfileForm />);
    await userEvent.click(screen.getByRole("button", { name: /save profile/i }));
    await waitFor(() => {
      expect(screen.getByText(/profile saved/i)).toBeDefined();
    });
  });
});

// ── Validation ────────────────────────────────────────────────────────────────

describe("UserProfileForm — field validation", () => {
  it("rejects commuteDaysPerWeek outside 1–7", async () => {
    render(<UserProfileForm />);
    const input = screen.getByLabelText(/commute days per week/i);
    await userEvent.clear(input);
    await userEvent.type(input, "8");
    await userEvent.click(screen.getByRole("button", { name: /save profile/i }));
    // zod rejects; saveUserProfile should not be called
    await waitFor(() => {
      expect(saveUserProfile).not.toHaveBeenCalled();
    });
  });

  it("rejects negative annualIncome", async () => {
    render(<UserProfileForm />);
    const input = screen.getByLabelText(/annual gross income/i);
    await userEvent.clear(input);
    await userEvent.type(input, "-500");
    await userEvent.click(screen.getByRole("button", { name: /save profile/i }));
    await waitFor(() => {
      expect(saveUserProfile).not.toHaveBeenCalled();
    });
  });

  it("rejects ownershipHorizonYears outside 1–15", async () => {
    render(<UserProfileForm />);
    const input = screen.getByLabelText(/ownership horizon/i);
    await userEvent.clear(input);
    await userEvent.type(input, "20");
    await userEvent.click(screen.getByRole("button", { name: /save profile/i }));
    await waitFor(() => {
      expect(saveUserProfile).not.toHaveBeenCalled();
    });
  });
});

// ── Profile pre-population ────────────────────────────────────────────────────

describe("UserProfileForm — pre-population from saved profile", () => {
  it("pre-fills display name from existing profile", () => {
    (getUserProfile as ReturnType<typeof vi.fn>).mockReturnValue({
      id: "test-user-123",
      email: "test@example.com",
      displayName: "Jane Smith",
    });
    render(<UserProfileForm />);
    const input = screen.getByPlaceholderText(/jane smith/i) as HTMLInputElement;
    expect(input.value).toBe("Jane Smith");
  });

  it("pre-fills ownership horizon from existing profile", () => {
    (getUserProfile as ReturnType<typeof vi.fn>).mockReturnValue({
      id: "test-user-123",
      email: "test@example.com",
      ownershipHorizonYears: 7,
    });
    render(<UserProfileForm />);
    const input = screen.getByPlaceholderText("5") as HTMLInputElement;
    expect(input.value).toBe("7");
  });
});

// ── Commute distance edge case ────────────────────────────────────────────────

describe("UserProfileForm — commute distance of 0", () => {
  it("accepts 0 commute distance without error", async () => {
    render(<UserProfileForm />);
    const input = screen.getByLabelText(/one-way commute distance/i);
    await userEvent.clear(input);
    await userEvent.type(input, "0");
    await userEvent.click(screen.getByRole("button", { name: /save profile/i }));
    await waitFor(() => {
      expect(saveUserProfile).toHaveBeenCalled();
    });
  });
});

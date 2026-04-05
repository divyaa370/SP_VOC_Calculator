import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { AccountSettings } from "../components/auth/AccountSettings";

const { mockSignOut } = vi.hoisted(() => ({
  mockSignOut: vi.fn().mockResolvedValue({}),
}));

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signOut: mockSignOut,
    },
  },
}));

vi.mock("../services/authService", () => ({
  AuthService: {
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    updatePassword: vi.fn(),
    getSession: vi.fn().mockResolvedValue({
      user: { id: "1", email: "user@example.com" },
      access_token: "token",
    }),
    onAuthStateChange: vi.fn().mockImplementation((cb) => {
      cb({ user: { id: "1", email: "user@example.com" }, access_token: "token" });
      return () => {};
    }),
  },
}));

import { AuthService } from "../services/authService";

function renderSettings() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AccountSettings />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("AccountSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders all three password fields", async () => {
    renderSettings();
    await waitFor(() => {
      expect(screen.getByLabelText(/current password/i)).toBeDefined();
      expect(screen.getByLabelText(/^new password$/i)).toBeDefined();
      expect(screen.getByLabelText(/confirm new password/i)).toBeDefined();
    });
  });

  it("shows validation error when new password is too short", async () => {
    renderSettings();
    await waitFor(() => screen.getByLabelText(/current password/i));

    await userEvent.type(screen.getByLabelText(/current password/i), "OldPass1");
    await userEvent.type(screen.getByLabelText(/^new password$/i),"short");
    await userEvent.type(screen.getByLabelText(/confirm new password/i),"short");
    await userEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeDefined();
    });
  });

  it("shows validation error when new password lacks uppercase", async () => {
    renderSettings();
    await waitFor(() => screen.getByLabelText(/current password/i));

    await userEvent.type(screen.getByLabelText(/current password/i), "OldPass1");
    await userEvent.type(screen.getByLabelText(/^new password$/i),"nouppercase1");
    await userEvent.type(screen.getByLabelText(/confirm new password/i),"nouppercase1");
    await userEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/uppercase/i)).toBeDefined();
    });
  });

  it("shows validation error when new password lacks a number", async () => {
    renderSettings();
    await waitFor(() => screen.getByLabelText(/current password/i));

    await userEvent.type(screen.getByLabelText(/current password/i), "OldPass1");
    await userEvent.type(screen.getByLabelText(/^new password$/i),"NoNumbers!");
    await userEvent.type(screen.getByLabelText(/confirm new password/i),"NoNumbers!");
    await userEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/number/i)).toBeDefined();
    });
  });

  it("shows error when passwords do not match", async () => {
    renderSettings();
    await waitFor(() => screen.getByLabelText(/current password/i));

    await userEvent.type(screen.getByLabelText(/current password/i), "OldPass1");
    await userEvent.type(screen.getByLabelText(/^new password$/i),"NewPass1");
    await userEvent.type(screen.getByLabelText(/confirm new password/i),"NewPass2");
    await userEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/do not match/i)).toBeDefined();
    });
  });

  it("shows error when current password is wrong", async () => {
    vi.mocked(AuthService.signIn).mockRejectedValueOnce(new Error("Invalid login credentials"));
    renderSettings();
    await waitFor(() => screen.getByLabelText(/current password/i));

    await userEvent.type(screen.getByLabelText(/current password/i), "WrongPass1");
    await userEvent.type(screen.getByLabelText(/^new password$/i),"NewPass1");
    await userEvent.type(screen.getByLabelText(/confirm new password/i),"NewPass1");
    await userEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/current password is incorrect/i)).toBeDefined();
    });
  });

  it("shows success message after successful password update", async () => {
    vi.mocked(AuthService.signIn).mockResolvedValueOnce({ user: { id: "1" }, session: {} } as never);
    vi.mocked(AuthService.updatePassword).mockResolvedValueOnce(undefined);
    renderSettings();
    await waitFor(() => screen.getByLabelText(/current password/i));

    await userEvent.type(screen.getByLabelText(/current password/i), "OldPass1");
    await userEvent.type(screen.getByLabelText(/^new password$/i),"NewPass1");
    await userEvent.type(screen.getByLabelText(/confirm new password/i),"NewPass1");
    await userEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/password updated successfully/i)).toBeDefined();
    });
  });

  it("shows error when updatePassword call fails", async () => {
    vi.mocked(AuthService.signIn).mockResolvedValueOnce({ user: { id: "1" }, session: {} } as never);
    vi.mocked(AuthService.updatePassword).mockRejectedValueOnce(new Error("Update failed"));
    renderSettings();
    await waitFor(() => screen.getByLabelText(/current password/i));

    await userEvent.type(screen.getByLabelText(/current password/i), "OldPass1");
    await userEvent.type(screen.getByLabelText(/^new password$/i),"NewPass1");
    await userEvent.type(screen.getByLabelText(/confirm new password/i),"NewPass1");
    await userEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/update failed/i)).toBeDefined();
    });
  });

  it("disables button and shows loading text while submitting", async () => {
    let resolveSignIn!: () => void;
    vi.mocked(AuthService.signIn).mockReturnValueOnce(
      new Promise<never>((resolve) => {
        resolveSignIn = resolve as () => void;
      })
    );
    renderSettings();
    await waitFor(() => screen.getByLabelText(/current password/i));

    await userEvent.type(screen.getByLabelText(/current password/i), "OldPass1");
    await userEvent.type(screen.getByLabelText(/^new password$/i),"NewPass1");
    await userEvent.type(screen.getByLabelText(/confirm new password/i),"NewPass1");
    await userEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /updating/i })).toBeDefined();
    });

    resolveSignIn();
  });

  it("invalidates other sessions after successful password update", async () => {
    vi.mocked(AuthService.signIn).mockResolvedValueOnce({ user: { id: "1" }, session: {} } as never);
    vi.mocked(AuthService.updatePassword).mockResolvedValueOnce(undefined);
    renderSettings();
    await waitFor(() => screen.getByLabelText(/current password/i));

    await userEvent.type(screen.getByLabelText(/current password/i), "OldPass1");
    await userEvent.type(screen.getByLabelText(/^new password$/i),"NewPass1");
    await userEvent.type(screen.getByLabelText(/confirm new password/i),"NewPass1");
    await userEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ scope: "others" });
    });
  });
});

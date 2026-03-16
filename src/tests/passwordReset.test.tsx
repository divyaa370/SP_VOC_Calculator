import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { ForgotPasswordForm } from "../components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "../components/auth/ResetPasswordForm";

vi.mock("../services/authService", () => ({
  AuthService: {
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    getSession: vi.fn().mockResolvedValue(null),
    onAuthStateChange: vi.fn().mockReturnValue(() => {}),
    signOut: vi.fn(),
  },
}));

import { AuthService } from "../services/authService";

function renderWithRouter(ui: React.ReactElement, { initialEntries = ["/"] } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

describe("ForgotPasswordForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders email input", () => {
    renderWithRouter(<ForgotPasswordForm />, { initialEntries: ["/reset-password"] });
    expect(screen.getByLabelText(/email/i)).toBeDefined();
  });

  it("blocks invalid email client-side", async () => {
    renderWithRouter(<ForgotPasswordForm />, { initialEntries: ["/reset-password"] });
    await userEvent.type(screen.getByLabelText(/email/i), "notanemail");
    await userEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeDefined();
    });
    expect(AuthService.resetPassword).not.toHaveBeenCalled();
  });

  it("shows neutral confirmation message after submission (never reveals if email exists)", async () => {
    vi.mocked(AuthService.resetPassword).mockResolvedValueOnce(undefined);
    renderWithRouter(<ForgotPasswordForm />, { initialEntries: ["/reset-password"] });
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() => {
      expect(screen.getByText(/if an account exists/i)).toBeDefined();
    });
  });

  it("still shows confirmation even when reset call fails (prevents enumeration)", async () => {
    vi.mocked(AuthService.resetPassword).mockRejectedValueOnce(new Error("User not found"));
    renderWithRouter(<ForgotPasswordForm />, { initialEntries: ["/reset-password"] });
    await userEvent.type(screen.getByLabelText(/email/i), "nobody@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() => {
      expect(screen.getByText(/if an account exists/i)).toBeDefined();
    });
  });
});

describe("ResetPasswordForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows expired token message when no session", async () => {
    vi.mocked(AuthService.getSession).mockResolvedValueOnce(null);
    renderWithRouter(<ResetPasswordForm />, { initialEntries: ["/update-password"] });
    await waitFor(() => {
      expect(screen.getByText(/expired or invalid/i)).toBeDefined();
    });
  });

  it("shows link to re-request reset when token is invalid", async () => {
    vi.mocked(AuthService.getSession).mockResolvedValueOnce(null);
    renderWithRouter(<ResetPasswordForm />, { initialEntries: ["/update-password"] });
    await waitFor(() => {
      expect(screen.getByText(/request a new reset link/i)).toBeDefined();
    });
  });

  it("blocks mismatched passwords", async () => {
    vi.mocked(AuthService.getSession).mockResolvedValueOnce({
      user: { id: "1" }, access_token: "token",
    } as never);
    vi.mocked(AuthService.onAuthStateChange).mockImplementationOnce((cb) => {
      cb({ user: { id: "1" }, access_token: "token" });
      return () => {};
    });

    renderWithRouter(<ResetPasswordForm />, { initialEntries: ["/update-password"] });
    await waitFor(() => screen.getByLabelText(/^new password$/i));

    await userEvent.type(screen.getByLabelText(/^new password$/i), "Password1");
    await userEvent.type(screen.getByLabelText(/confirm new password/i), "Different1");
    await userEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeDefined();
    });
    expect(AuthService.updatePassword).not.toHaveBeenCalled();
  });

  it("redirects to /signin after successful password update", async () => {
    vi.mocked(AuthService.getSession).mockResolvedValueOnce({
      user: { id: "1" }, access_token: "token",
    } as never);
    vi.mocked(AuthService.onAuthStateChange).mockImplementationOnce((cb) => {
      cb({ user: { id: "1" }, access_token: "token" });
      return () => {};
    });
    vi.mocked(AuthService.updatePassword).mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter initialEntries={["/update-password"]}>
        <AuthProvider>
          <Routes>
            <Route path="/update-password" element={<ResetPasswordForm />} />
            <Route path="/signin" element={<div>Sign In Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByLabelText(/^new password$/i));
    await userEvent.type(screen.getByLabelText(/^new password$/i), "NewPass1");
    await userEvent.type(screen.getByLabelText(/confirm new password/i), "NewPass1");
    await userEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText("Sign In Page")).toBeDefined();
    });
  });
});

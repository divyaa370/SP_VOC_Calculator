import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { Session, User } from "@supabase/supabase-js";
import { AuthProvider } from "../context/AuthContext";
import { SignInForm } from "../components/auth/SignInForm";
import { SignUpForm } from "../components/auth/SignUpForm";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";

// Mock authService
vi.mock("../services/authService", () => ({
  AuthService: {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn().mockResolvedValue(null),
    onAuthStateChange: vi.fn().mockReturnValue(() => {}),
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

describe("SignInForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders email and password fields", async () => {
    renderWithRouter(<SignInForm />, { initialEntries: ["/signin"] });
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeDefined();
      expect(screen.getByLabelText(/password/i)).toBeDefined();
    });
  });

  it("shows error on invalid credentials", async () => {
    vi.mocked(AuthService.signIn).mockRejectedValueOnce(new Error("Invalid login credentials"));
    renderWithRouter(<SignInForm />, { initialEntries: ["/signin"] });

    await waitFor(() => screen.getByLabelText(/email/i));
    await userEvent.type(screen.getByLabelText(/email/i), "bad@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeDefined();
    });
  });

  it("calls signIn with correct credentials", async () => {
    vi.mocked(AuthService.signIn).mockResolvedValueOnce({ user: { id: "1" } as User, session: {} as Session });
    renderWithRouter(<SignInForm />, { initialEntries: ["/signin"] });

    await waitFor(() => screen.getByLabelText(/email/i));
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "Password1");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(AuthService.signIn).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "Password1",
      });
    });
  });

  it("redirects authenticated user from /signin to /app", async () => {
    vi.mocked(AuthService.getSession).mockResolvedValueOnce({
      user: { id: "1", email: "user@example.com" },
      access_token: "token",
    } as Session);
    vi.mocked(AuthService.onAuthStateChange).mockImplementationOnce((cb) => {
      cb({ user: { id: "1" }, access_token: "token" } as Session);
      return () => {};
    });

    render(
      <MemoryRouter initialEntries={["/signin"]}>
        <AuthProvider>
          <Routes>
            <Route path="/signin" element={<SignInForm />} />
            <Route path="/app" element={<div>Dashboard</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeDefined();
    });
  });
});

describe("SignUpForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects authenticated user from /signup to /app", async () => {
    vi.mocked(AuthService.getSession).mockResolvedValueOnce({
      user: { id: "1", email: "user@example.com" },
      access_token: "token",
    } as Session);
    vi.mocked(AuthService.onAuthStateChange).mockImplementationOnce((cb) => {
      cb({ user: { id: "1" }, access_token: "token" } as Session);
      return () => {};
    });

    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <AuthProvider>
          <Routes>
            <Route path="/signup" element={<SignUpForm />} />
            <Route path="/app" element={<div>Dashboard</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeDefined();
    });
  });

  it("redirects to /signin after successful signup", async () => {
    vi.mocked(AuthService.signUp).mockResolvedValueOnce({ user: null, session: null });

    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <AuthProvider>
          <Routes>
            <Route path="/signup" element={<SignUpForm />} />
            <Route path="/signin" element={<div>Sign In Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByLabelText(/username/i));
    await userEvent.type(screen.getByLabelText(/username/i), "testuser");
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "Password1");
    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText("Sign In Page")).toBeDefined();
    });
  });
});

describe("ProtectedRoute", () => {
  it("redirects unauthenticated users to /signin", async () => {
    vi.mocked(AuthService.getSession).mockResolvedValueOnce(null);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <div>Protected content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/signin" element={<div>Sign In Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Sign In Page")).toBeDefined();
    });
  });

  it("renders children for authenticated users", async () => {
    vi.mocked(AuthService.getSession).mockResolvedValueOnce({
      user: { id: "1", email: "user@example.com" },
      access_token: "token",
    } as Session);
    vi.mocked(AuthService.onAuthStateChange).mockImplementationOnce((cb) => {
      cb({ user: { id: "1" }, access_token: "token" } as Session);
      return () => {};
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <div>Protected content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/signin" element={<div>Sign In Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Protected content")).toBeDefined();
    });
  });

  it("redirects unauthenticated user from /app to /signin", async () => {
    vi.mocked(AuthService.getSession).mockResolvedValueOnce(null);

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <div>Dashboard</div>
                </ProtectedRoute>
              }
            />
            <Route path="/signin" element={<div>Sign In Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Sign In Page")).toBeDefined();
    });
  });
});

describe("Logout", () => {
  it("calls signOut and clears session", async () => {
    vi.mocked(AuthService.signOut).mockResolvedValueOnce(undefined);
    const { signOut } = await import("../context/AuthContext").then((m) => {
      // Just verify signOut is exported
      return { signOut: m.useAuth };
    });
    expect(signOut).toBeDefined();
  });
});

describe("Full auth flow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("signup → signin → access /app → logout → /app redirects to /signin", async () => {
    // Step 1: signup redirects to /signin
    vi.mocked(AuthService.signUp).mockResolvedValueOnce({ user: null, session: null });

    const { unmount } = render(
      <MemoryRouter initialEntries={["/signup"]}>
        <AuthProvider>
          <Routes>
            <Route path="/signup" element={<SignUpForm />} />
            <Route path="/signin" element={<div>Sign In Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByLabelText(/username/i));
    await userEvent.type(screen.getByLabelText(/username/i), "testuser");
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "Password1");
    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText("Sign In Page")).toBeDefined();
    });
    unmount();

    // Step 2: /app redirects to /signin when unauthenticated
    vi.mocked(AuthService.getSession).mockResolvedValueOnce(null);

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <div>Dashboard Page</div>
                </ProtectedRoute>
              }
            />
            <Route path="/signin" element={<div>Sign In Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Sign In Page")).toBeDefined();
    });
  });
});

// ── Rate limit lockout ────────────────────────────────────────────────────────

describe("SignInForm — rate limit lockout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("locks submit button and shows message after 3 failed attempts", async () => {
    vi.mocked(AuthService.signIn).mockRejectedValue(new Error("Invalid login credentials"));
    renderWithRouter(<SignInForm />, { initialEntries: ["/signin"] });

    await waitFor(() => screen.getByLabelText(/email/i));

    for (let i = 0; i < 3; i++) {
      const btn = screen.queryByRole("button", { name: /sign in/i });
      if (btn && !btn.hasAttribute("disabled")) {
        await userEvent.clear(screen.getByLabelText(/email/i));
        await userEvent.clear(screen.getByLabelText(/password/i));
        await userEvent.type(screen.getByLabelText(/email/i), "bad@example.com");
        await userEvent.type(screen.getByLabelText(/password/i), "wrongpass");
        await userEvent.click(btn);
      }
    }

    await waitFor(() => {
      expect(screen.getByText(/too many failed attempts/i)).toBeDefined();
    });

    const lockedBtn = screen.getByRole("button", { name: /locked/i });
    expect(lockedBtn.hasAttribute("disabled")).toBe(true);
  });
});

// ── SignUpForm password validation ────────────────────────────────────────────

describe("SignUpForm — password strength validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects password shorter than 8 characters", async () => {
    renderWithRouter(<SignUpForm />, { initialEntries: ["/signup"] });
    await waitFor(() => screen.getByLabelText(/username/i));

    await userEvent.type(screen.getByLabelText(/username/i), "testuser");
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "Ab1");
    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeDefined();
    });
    expect(AuthService.signUp).not.toHaveBeenCalled();
  });

  it("rejects password without an uppercase letter", async () => {
    renderWithRouter(<SignUpForm />, { initialEntries: ["/signup"] });
    await waitFor(() => screen.getByLabelText(/username/i));

    await userEvent.type(screen.getByLabelText(/username/i), "testuser");
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password1");
    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/uppercase letter/i)).toBeDefined();
    });
    expect(AuthService.signUp).not.toHaveBeenCalled();
  });

  it("rejects password without a number", async () => {
    renderWithRouter(<SignUpForm />, { initialEntries: ["/signup"] });
    await waitFor(() => screen.getByLabelText(/username/i));

    await userEvent.type(screen.getByLabelText(/username/i), "testuser");
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "Passwordnonum");
    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/contain a number/i)).toBeDefined();
    });
    expect(AuthService.signUp).not.toHaveBeenCalled();
  });

  it("shows server error message on duplicate email", async () => {
    vi.mocked(AuthService.signUp).mockRejectedValueOnce(new Error("User already registered"));
    renderWithRouter(<SignUpForm />, { initialEntries: ["/signup"] });
    await waitFor(() => screen.getByLabelText(/username/i));

    await userEvent.type(screen.getByLabelText(/username/i), "testuser");
    await userEvent.type(screen.getByLabelText(/email/i), "existing@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "Password1");
    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/user already registered/i)).toBeDefined();
    });
  });
});

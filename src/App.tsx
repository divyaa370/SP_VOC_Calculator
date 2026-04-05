import { Suspense } from "react";
import { useRoutes, Routes, Route, Navigate } from "react-router-dom";
import { SignInForm } from "./components/auth/SignInForm";
import { SignUpForm } from "./components/auth/SignUpForm";
import { ForgotPasswordForm } from "./components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "./components/auth/ResetPasswordForm";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Dashboard } from "./components/Dashboard";
import { AccountSettings } from "./components/auth/AccountSettings";
import { AuthProvider } from "./context/AuthContext";
import routes from "tempo-routes";

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<p>Loading...</p>}>
        <>
          <Routes>
            <Route path="/signin" element={<SignInForm />} />
            <Route path="/signup" element={<SignUpForm />} />
            <Route path="/reset-password" element={<ForgotPasswordForm />} />
            <Route path="/update-password" element={<ResetPasswordForm />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/settings"
              element={
                <ProtectedRoute>
                  <div className="w-screen min-h-screen flex flex-col">
                    <header className="flex items-center justify-between px-6 py-4 border-b">
                      <span className="font-semibold">TrueCost</span>
                      <a href="/app" className="text-sm text-muted-foreground underline">
                        Back to dashboard
                      </a>
                    </header>
                    <main className="flex-1 p-6 flex items-center justify-center">
                      <AccountSettings />
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/app" replace />} />
          </Routes>
          {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
        </>
      </Suspense>
    </AuthProvider>
  );
}

export default App;

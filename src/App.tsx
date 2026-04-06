import { Suspense, useState, useEffect } from "react";
import { useRoutes, Routes, Route, Navigate } from "react-router-dom";
import { SignInForm } from "./components/auth/SignInForm";
import { SignUpForm } from "./components/auth/SignUpForm";
import { ForgotPasswordForm } from "./components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "./components/auth/ResetPasswordForm";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AccountSettings } from "./components/auth/AccountSettings";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ComparisonMode } from "./components/ComparisonMode";
import { SavedAnalysisDetail } from "./components/SavedAnalysisDetail";
import { SearchHistoryPage } from "./components/SearchHistoryPage";
import { LogoutButton } from "./components/auth/LogoutButton";
import { ItemEntryForm, type ItemFormData } from "./components/ItemEntryForm";
import { ResultsDashboard } from "./components/ResultsDashboard";
import { getSavedAnalyses, deleteAnalysis } from "./lib/savedAnalyses";
import { SavedAnalyses } from "./components/SavedAnalyses";
import type { SavedAnalysis } from "./lib/savedAnalyses";
import routes from "tempo-routes";

// ── Home page ──────────────────────────────────────────────────────────────

function HomePage() {
  const { user } = useAuth();
  const [itemData, setItemData] = useState<ItemFormData | null>(null);

  // Pick up pre-fill from search history re-run
  useEffect(() => {
    const raw = sessionStorage.getItem("truecost_prefill");
    if (raw) {
      try { setItemData(JSON.parse(raw)); } catch { /* ignore */ }
      sessionStorage.removeItem("truecost_prefill");
    }
  }, []);

  return (
    <div className="w-screen min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <span className="font-semibold">TrueCost</span>
        <div className="flex items-center gap-4">
          <a href="/saved-analyses" className="text-sm text-muted-foreground hover:underline">Saved</a>
          <a href="/search-history" className="text-sm text-muted-foreground hover:underline">History</a>
          <a href="/compare" className="text-sm text-muted-foreground hover:underline">Compare</a>
          <a href="/app/settings" className="text-sm text-muted-foreground hover:underline">Settings</a>
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-6 flex justify-center">
        {!itemData ? (
          <ItemEntryForm onSubmit={setItemData} />
        ) : (
          <ResultsDashboard item={itemData} onReset={() => setItemData(null)} />
        )}
      </main>
    </div>
  );
}

// ── Saved analyses page ────────────────────────────────────────────────────

function SavedAnalysesPage() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>(() =>
    getSavedAnalyses(user?.id ?? "")
  );

  const refresh = () => setAnalyses(getSavedAnalyses(user?.id ?? ""));

  return (
    <div className="w-screen min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <span className="font-semibold">
          <a href="/">TrueCost</a>
        </span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-6 flex flex-col items-center">
        <div className="w-full max-w-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Saved Analyses</h1>
            <a href="/" className="text-sm underline text-muted-foreground">Back to calculator</a>
          </div>
          <SavedAnalyses
            analyses={analyses}
            onView={(a) => { window.location.href = `/saved-analyses/${a.id}`; }}
            onDelete={(id) => {
              deleteAnalysis(user?.id ?? "", id);
              refresh();
            }}
          />
        </div>
      </main>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<p>Loading…</p>}>
        <>
          <Routes>
            {/* Auth routes */}
            <Route path="/signin" element={<SignInForm />} />
            <Route path="/signup" element={<SignUpForm />} />
            <Route path="/reset-password" element={<ForgotPasswordForm />} />
            <Route path="/update-password" element={<ResetPasswordForm />} />

            {/* Settings */}
            <Route
              path="/app/settings"
              element={
                <ProtectedRoute>
                  <div className="w-screen min-h-screen flex flex-col">
                    <header className="flex items-center justify-between px-6 py-4 border-b">
                      <a href="/" className="font-semibold">TrueCost</a>
                      <a href="/" className="text-sm text-muted-foreground underline">Back</a>
                    </header>
                    <main className="flex-1 p-6 flex items-center justify-center">
                      <AccountSettings />
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />

            {/* Main app routes */}
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/compare" element={<ProtectedRoute><ComparisonModeWrapper /></ProtectedRoute>} />
            <Route path="/saved-analyses" element={<ProtectedRoute><SavedAnalysesPage /></ProtectedRoute>} />
            <Route path="/saved-analyses/:id" element={<ProtectedRoute><SavedAnalysisDetail /></ProtectedRoute>} />
            <Route path="/search-history" element={<ProtectedRoute><SearchHistoryPage /></ProtectedRoute>} />

            {/* Legacy /app redirect */}
            <Route path="/app" element={<Navigate to="/" replace />} />
          </Routes>
          {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
        </>
      </Suspense>
    </AuthProvider>
  );
}

function ComparisonModeWrapper() {
  const { user } = useAuth();
  return (
    <div className="w-screen min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <a href="/" className="font-semibold">TrueCost</a>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-6 flex justify-center">
        <ComparisonMode userId={user?.id} />
      </main>
    </div>
  );
}

export default App;

import { Suspense, useState, useEffect, useCallback } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Spinner } from "./components/ui/Spinner";
import { useRoutes, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { SignInForm } from "./components/auth/SignInForm";
import { SignUpForm } from "./components/auth/SignUpForm";
import { ForgotPasswordForm } from "./components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "./components/auth/ResetPasswordForm";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AccountSettings } from "./components/auth/AccountSettings";
import { UserProfileForm } from "./components/auth/UserProfile";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ComparisonMode } from "./components/ComparisonMode";
import { SavedAnalysisDetail } from "./components/SavedAnalysisDetail";
import { SearchHistoryPage } from "./components/SearchHistoryPage";
import { ExpenseLogPage } from "./components/ExpenseLogPage";
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
        <span className="font-semibold text-white">TrueCost</span>
        <div className="flex items-center gap-4">
          <Link to="/saved-analyses" className="text-sm text-muted-foreground hover:underline">Saved</Link>
          <Link to="/expenses" className="text-sm text-muted-foreground hover:underline">Expenses</Link>
          <Link to="/search-history" className="text-sm text-muted-foreground hover:underline">History</Link>
          <Link to="/compare" className="text-sm text-muted-foreground hover:underline">Compare</Link>
          <Link to="/app/settings" className="text-sm text-muted-foreground hover:underline">Settings</Link>
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-6">
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
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);

  const refresh = useCallback(async () => {
    setAnalyses(await getSavedAnalyses(user?.id ?? ""));
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="w-screen min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <Link to="/" className="font-semibold text-white">TrueCost</Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-6">
        <div className="w-full max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white">Saved Analyses</h1>
            <Link to="/" className="text-sm underline text-muted-foreground">Back to calculator</Link>
          </div>
          <SavedAnalyses
            analyses={analyses}
            onView={(a) => { navigate(`/saved-analyses/${a.id}`); }}
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
      <ErrorBoundary>
      <Suspense fallback={<Spinner />}>
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
                      <Link to="/" className="font-semibold text-white">TrueCost</Link>
                      <Link to="/" className="text-sm text-muted-foreground underline">Back</Link>
                    </header>
                    <main className="flex-1 p-6">
                      <div className="w-full max-w-xl mx-auto space-y-4">
                        <h1 className="text-xl font-semibold text-white">Settings</h1>
                        <Tabs defaultValue="account" className="w-full">
                          <TabsList className="mb-4 bg-transparent border border-white/10 p-1 rounded-xl gap-1">
                            <TabsTrigger
                              value="account"
                              className="rounded-lg text-sm font-medium text-gray-400 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:[background:linear-gradient(90deg,#00d4ff,#7c3aed)]"
                            >
                              Account
                            </TabsTrigger>
                            <TabsTrigger
                              value="profile"
                              className="rounded-lg text-sm font-medium text-gray-400 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:[background:linear-gradient(90deg,#00d4ff,#7c3aed)]"
                            >
                              Profile
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="account">
                            <AccountSettings />
                          </TabsContent>
                          <TabsContent value="profile">
                            <UserProfileForm />
                          </TabsContent>
                        </Tabs>
                      </div>
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
            <Route path="/expenses" element={<ProtectedRoute><ExpenseLogPage /></ProtectedRoute>} />

            {/* Legacy /app redirect */}
            <Route path="/app" element={<Navigate to="/" replace />} />
          </Routes>
          {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
        </>
      </Suspense>
      </ErrorBoundary>
    </AuthProvider>
  );
}

function ComparisonModeWrapper() {
  const { user } = useAuth();
  return (
    <div className="w-screen min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <Link to="/" className="font-semibold text-white">TrueCost</Link>
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

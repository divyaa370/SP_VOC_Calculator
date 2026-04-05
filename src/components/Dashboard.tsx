import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogoutButton } from "./auth/LogoutButton";
import { ItemEntryForm, type ItemFormData } from "./ItemEntryForm";
import { CostDashboard } from "./CostDashboard";
import { SavedAnalyses } from "./SavedAnalyses";
import { AnalysisService, type SavedAnalysis } from "../services/analysisService";
import { Button } from "./ui/button";

type Tab = "new" | "saved";

export function Dashboard() {
  const { user, isGuest } = useAuth();
  const userId = user?.id ?? "";

  const [tab, setTab] = useState<Tab>("new");
  const [itemData, setItemData] = useState<ItemFormData | null>(null);
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>(() =>
    AnalysisService.getAll(userId)
  );
  const [savedConfirm, setSavedConfirm] = useState(false);

  const refreshAnalyses = useCallback(() => {
    setAnalyses(AnalysisService.getAll(userId));
  }, [userId]);

  const handleSave = () => {
    if (!itemData) return;
    AnalysisService.save(userId, itemData);
    refreshAnalyses();
    setSavedConfirm(true);
    setTimeout(() => setSavedConfirm(false), 2500);
  };

  const handleDelete = (id: string) => {
    AnalysisService.delete(userId, id);
    refreshAnalyses();
  };

  const handleViewSaved = (analysis: SavedAnalysis) => {
    setItemData(analysis.item);
    setTab("new");
  };

  const handleReset = () => {
    setItemData(null);
    setSavedConfirm(false);
  };

  const handleSwitchTab = (next: Tab) => {
    setTab(next);
    if (next === "new") setItemData(null);
    setSavedConfirm(false);
  };

  return (
    <div className="w-screen min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <span className="font-semibold">TrueCost</span>
        <div className="flex items-center gap-4">
          {isGuest ? (
            <Link to="/signin" className="text-sm underline">
              Sign in to save analyses
            </Link>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Link to="/app/settings" className="text-sm text-muted-foreground underline">
                Settings
              </Link>
              <LogoutButton />
            </>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4">
        <button
          onClick={() => handleSwitchTab("new")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "new"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-new"
        >
          New Analysis
        </button>
        {!isGuest && (
          <button
            onClick={() => handleSwitchTab("saved")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "saved"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-saved"
          >
            Saved ({analyses.length})
          </button>
        )}
      </div>

      <main className="flex-1 p-6 flex items-start justify-center">
        {tab === "saved" ? (
          <SavedAnalyses
            analyses={analyses}
            onView={handleViewSaved}
            onDelete={handleDelete}
          />
        ) : itemData === null ? (
          <ItemEntryForm onSubmit={setItemData} />
        ) : (
          <div className="w-full max-w-4xl space-y-4">
            {!isGuest && (
              <div className="flex items-center justify-between">
                <Button size="sm" onClick={handleSave} disabled={savedConfirm}>
                  {savedConfirm ? "Saved!" : "Save analysis"}
                </Button>
              </div>
            )}
            <CostDashboard item={itemData} onReset={handleReset} />
          </div>
        )}
      </main>
    </div>
  );
}

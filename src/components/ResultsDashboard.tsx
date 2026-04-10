import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CostDashboard } from "./CostDashboard";
import { ErrorBoundary } from "./ErrorBoundary";
import { Button } from "./ui/button";
import { saveAnalysis } from "../lib/savedAnalyses";
import { addSearchHistory } from "../lib/searchHistory";
import type { ItemFormData } from "./ItemEntryForm";
import { useState, useEffect, useRef } from "react";

interface ResultsDashboardProps {
  item: ItemFormData;
  onReset: () => void;
  initialProjectionYears?: number;
}

export function ResultsDashboard({ item, onReset, initialProjectionYears }: ResultsDashboardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [savedConfirm, setSavedConfirm] = useState(false);
  const recorded = useRef(false);

  // Record search history once per result view, even if user loads after mount
  useEffect(() => {
    if (user?.id && !recorded.current) {
      addSearchHistory(user.id, item);
      recorded.current = true;
    }
  }, [user?.id, item]);

  const handleSave = () => {
    if (!user?.id) return;
    saveAnalysis(user.id, item);
    setSavedConfirm(true);
    setTimeout(() => setSavedConfirm(false), 2500);
  };

  return (
    <div className="w-full max-w-4xl space-y-4">
      <div className="flex items-center gap-3">
        {user && (
          <Button size="sm" variant="outline" onClick={handleSave} disabled={savedConfirm}>
            {savedConfirm ? "Saved!" : "Save analysis"}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => navigate("/saved-analyses")}>
          View saved
        </Button>
        <Button size="sm" variant="ghost" onClick={() => navigate("/compare")}>
          Compare
        </Button>
      </div>
      <ErrorBoundary>
        <CostDashboard item={item} onReset={onReset} initialProjectionYears={initialProjectionYears} />
      </ErrorBoundary>
    </div>
  );
}

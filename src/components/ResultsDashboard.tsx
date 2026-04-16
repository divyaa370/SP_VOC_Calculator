import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CostDashboard } from "./CostDashboard";
import { ErrorBoundary } from "./ErrorBoundary";
import { saveAnalysis } from "../lib/savedAnalyses";
import { addSearchHistory } from "../lib/searchHistory";
import type { ItemFormData, CarFormData } from "./ItemEntryForm";
import { getDepreciationSegment } from "../lib/costConfig";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Crown, Save } from "lucide-react";

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

  const car = item.category === "car" ? (item as CarFormData) : null;
  const itemLabel = car
    ? `${car.year} ${car.make} ${car.model}`
    : `${(item as { breed: string; petType: string }).breed} (${(item as { petType: string }).petType})`;

  const segment = car ? getDepreciationSegment(car.make, car.fuelType) : null;
  const segmentLabel =
    segment === "luxury" ? "Luxury Vehicle"
    : segment === "ev" ? "Electric Vehicle"
    : segment === "hybrid" ? "Hybrid Vehicle"
    : segment === "truck" ? "Truck / SUV"
    : "Vehicle";

  return (
    <div className="w-full max-w-5xl space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between py-2">
        {/* Left: Back to Search */}
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#00d4ff] transition-colors px-3 py-2 rounded-lg border border-white/10 hover:border-[#00d4ff]/40"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Search
        </button>

        {/* Center: Crown + Vehicle Name */}
        <div className="flex flex-col items-center text-center px-4">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-[#00d4ff]" />
            <h1
              className="text-xl font-bold"
              style={{
                background: "linear-gradient(90deg, #00d4ff, #ff69b4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {itemLabel}
            </h1>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            ✦ {segmentLabel} Total Cost of Ownership Analysis
          </p>
        </div>

        {/* Right: Save Analysis */}
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={handleSave}
              disabled={savedConfirm}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-60"
              style={{
                backgroundColor: savedConfirm ? "#059669" : "#00d4ff",
                color: "#0d0d2b",
              }}
            >
              <Save className="w-4 h-4" />
              {savedConfirm ? "Saved!" : "Save Analysis"}
            </button>
          )}
          <button
            onClick={() => navigate("/saved-analyses")}
            className="text-xs text-gray-400 hover:text-[#00d4ff] transition-colors underline"
          >
            View saved
          </button>
        </div>
      </div>

      <ErrorBoundary>
        <CostDashboard item={item} onReset={onReset} initialProjectionYears={initialProjectionYears} />
      </ErrorBoundary>
    </div>
  );
}

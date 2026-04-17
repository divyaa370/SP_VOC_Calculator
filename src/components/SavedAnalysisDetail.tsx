import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAnalysisById } from "../lib/savedAnalyses";
import { CostDashboard } from "./CostDashboard";
import { useState, useEffect } from "react";
import type { SavedAnalysis } from "../lib/savedAnalyses";

export function SavedAnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<SavedAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user?.id) { setLoading(false); return; }
    getAnalysisById(user.id, id).then((a) => {
      setAnalysis(a ?? null);
      setLoading(false);
    });
  }, [id, user?.id]);

  if (loading) return <div className="flex items-center justify-center min-h-[40vh]"><p className="text-gray-400">Loading…</p></div>;

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-gray-400">Analysis not found.</p>
        <button
          onClick={() => navigate("/saved-analyses")}
          className="text-sm text-white hover:text-[#00d4ff] transition-colors border border-white/20 hover:border-[#00d4ff]/40 px-3 py-1.5 rounded-lg"
        >
          Back to saved
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/saved-analyses")}
          className="text-sm text-white hover:text-[#00d4ff] transition-colors"
        >
          ← Back to saved
        </button>
        <span className="text-sm text-gray-400">
          Saved {new Date(analysis.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>
      <CostDashboard item={analysis.item} onReset={() => navigate("/")} />
    </div>
  );
}

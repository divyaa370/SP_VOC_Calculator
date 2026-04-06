import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAnalysisById } from "../lib/savedAnalyses";
import { CostDashboard } from "./CostDashboard";
import { Button } from "./ui/button";

export function SavedAnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const analysis = id && user?.id ? getAnalysisById(user.id, id) : undefined;

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-muted-foreground">Analysis not found.</p>
        <Button variant="outline" onClick={() => navigate("/saved-analyses")}>
          Back to saved
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/saved-analyses")}>
          ← Back to saved
        </Button>
        <span className="text-sm text-muted-foreground">
          Saved {new Date(analysis.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>
      <CostDashboard item={analysis.item} onReset={() => navigate("/")} />
    </div>
  );
}

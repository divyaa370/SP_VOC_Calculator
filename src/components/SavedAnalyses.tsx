import type { SavedAnalysis } from "../lib/savedAnalyses";
import type { ItemFormData } from "./ItemEntryForm";

const CARD = { backgroundColor: "#1e1e3f", borderColor: "rgba(255,255,255,0.08)" };

function itemLabel(item: ItemFormData): string {
  return item.category === "car"
    ? `${item.year} ${item.make} ${item.model}`
    : `${(item as { breed: string }).breed} (${(item as { petType: string }).petType})`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

interface SavedAnalysesProps {
  analyses: SavedAnalysis[];
  onView: (analysis: SavedAnalysis) => void;
  onDelete: (id: string) => void;
}

export function SavedAnalyses({ analyses, onView, onDelete }: SavedAnalysesProps) {
  if (analyses.length === 0) {
    return (
      <div className="text-center text-gray-400 py-16" data-testid="empty-saved">
        No saved analyses yet. Run a calculation and save it to see it here.
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-3" data-testid="saved-analyses-list">
      {analyses.map((analysis) => (
        <div
          key={analysis.id}
          className="rounded-2xl border p-4 flex items-center justify-between"
          style={CARD}
        >
          <div>
            <p className="text-sm font-semibold text-white">{itemLabel(analysis.item)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(analysis.createdAt)}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onView(analysis)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ background: "linear-gradient(90deg, #00d4ff, #7c3aed)", color: "#fff" }}
            >
              View
            </button>
            <button
              onClick={() => onDelete(analysis.id)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium border border-white/15 text-gray-400 hover:text-red-400 hover:border-red-400/40 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

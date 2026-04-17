import { useNavigate } from "react-router-dom";
import type { SearchHistoryEntry } from "../lib/searchHistory";

const CARD = { backgroundColor: "#1e1e3f", borderColor: "rgba(255,255,255,0.08)" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

interface SearchHistoryProps {
  entries: SearchHistoryEntry[];
  onSelect: (entry: SearchHistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export function SearchHistory({ entries, onSelect, onDelete, onClear }: SearchHistoryProps) {
  const navigate = useNavigate();

  if (entries.length === 0) {
    return (
      <div className="text-center text-gray-400 py-16">
        <p>No search history yet.</p>
        <button
          className="mt-4 text-sm px-4 py-2 rounded-lg font-medium"
          style={{ background: "linear-gradient(90deg, #00d4ff, #7c3aed)", color: "#fff" }}
          onClick={() => navigate("/")}
        >
          Start a calculation
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-3">
      <div className="flex justify-end">
        <button
          onClick={onClear}
          className="text-xs border border-white/15 text-gray-400 hover:text-red-400 hover:border-red-400/40 px-3 py-1.5 rounded-lg transition-colors"
        >
          Clear all
        </button>
      </div>
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="rounded-2xl border p-4 flex items-center justify-between"
          style={CARD}
        >
          <div>
            <p className="text-sm font-semibold text-white">{entry.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(entry.searchedAt)}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onSelect(entry)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ background: "linear-gradient(90deg, #00d4ff, #7c3aed)", color: "#fff" }}
            >
              Re-run
            </button>
            <button
              onClick={() => onDelete(entry.id)}
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

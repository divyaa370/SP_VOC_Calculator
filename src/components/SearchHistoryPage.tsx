import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SearchHistory } from "./SearchHistory";
import { LogoutButton } from "./auth/LogoutButton";
import {
  getSearchHistory,
  deleteSearchHistoryEntry,
  clearSearchHistory,
  type SearchHistoryEntry,
} from "../lib/searchHistory";

export function SearchHistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? "";

  const [entries, setEntries] = useState<SearchHistoryEntry[]>([]);

  const refresh = useCallback(async () => {
    setEntries(await getSearchHistory(userId));
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (id: string) => {
    await deleteSearchHistoryEntry(userId, id);
    refresh();
  };

  const handleClear = async () => {
    await clearSearchHistory(userId);
    refresh();
  };

  const handleSelect = (entry: SearchHistoryEntry) => {
    // Navigate home with the item pre-loaded via sessionStorage
    sessionStorage.setItem("truecost_prefill", JSON.stringify(entry.item));
    navigate("/");
  };

  return (
    <div className="w-screen min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <span className="font-semibold text-white cursor-pointer" onClick={() => navigate("/")}>TrueCost</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-6">
        <div className="w-full max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Search History</h1>
            <button className="text-sm text-white hover:text-[#00d4ff] transition-colors" onClick={() => navigate("/")}>
              Back to calculator
            </button>
          </div>
          <SearchHistory
            entries={entries}
            onSelect={handleSelect}
            onDelete={handleDelete}
            onClear={handleClear}
          />
        </div>
      </main>
    </div>
  );
}

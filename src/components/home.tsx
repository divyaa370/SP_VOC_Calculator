import { useState, useEffect } from "react";
import { LogoutButton } from "./auth/LogoutButton";
import { useAuth } from "../context/AuthContext";
import { ItemEntryForm, type ItemFormData } from "./ItemEntryForm";
import { ResultsDashboard } from "./ResultsDashboard";

function Home() {
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
          <a href="/expenses" className="text-sm text-muted-foreground hover:underline">Expenses</a>
          <a href="/search-history" className="text-sm text-muted-foreground hover:underline">History</a>
          <a href="/compare" className="text-sm text-muted-foreground hover:underline">Compare</a>
          <a href="/app/settings" className="text-sm text-muted-foreground hover:underline">Settings</a>
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-6 overflow-y-auto flex justify-center">
        {!itemData ? (
          <ItemEntryForm onSubmit={setItemData} />
        ) : (
          <ResultsDashboard item={itemData} onReset={() => setItemData(null)} />
        )}
      </main>
    </div>
  );
}

export default Home;

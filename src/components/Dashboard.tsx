import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogoutButton } from "./auth/LogoutButton";
import { ItemEntryForm, type ItemFormData } from "./ItemEntryForm";
import { CostDashboard } from "./CostDashboard";

export function Dashboard() {
  const { user } = useAuth();
  const [itemData, setItemData] = useState<ItemFormData | null>(null);

  return (
    <div className="w-screen min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <span className="font-semibold">TrueCost</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Link to="/app/settings" className="text-sm text-muted-foreground underline">
            Settings
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-6 flex items-center justify-center">
        {itemData === null ? (
          <ItemEntryForm onSubmit={setItemData} />
        ) : (
          <CostDashboard item={itemData} onReset={() => setItemData(null)} />
        )}
      </main>
    </div>
  );
}

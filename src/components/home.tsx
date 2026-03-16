import { useState } from "react";
import { LogoutButton } from "./auth/LogoutButton";
import { useAuth } from "../context/AuthContext";
import { ItemEntryForm, type ItemFormData } from "./ItemEntryForm";
import { CostDashboard } from "./CostDashboard";

function Home() {
  const { user } = useAuth();
  const [itemData, setItemData] = useState<ItemFormData | null>(null);

  return (
    <div className="w-screen h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <span className="font-semibold">VOC Calculator</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-6 overflow-y-auto flex justify-center">
        {!itemData ? (
          <ItemEntryForm onSubmit={setItemData} />
        ) : (
          <CostDashboard item={itemData} onReset={() => setItemData(null)} />
        )}
      </main>
    </div>
  );
}

export default Home;

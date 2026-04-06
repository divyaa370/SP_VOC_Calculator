import { useState, useEffect, useMemo } from "react";
import { LogoutButton } from "./auth/LogoutButton";
import { useAuth } from "../context/AuthContext";
import { ItemEntryForm, type ItemFormData, type CarFormData } from "./ItemEntryForm";
import { ResultsDashboard } from "./ResultsDashboard";
import { getUserProfile, type UserProfile } from "../lib/auth";
import { useLiveData } from "../context/LiveDataContext";

const NAV_LINKS = [
  { href: "/saved-analyses", label: "Saved" },
  { href: "/expenses", label: "Expenses" },
  { href: "/search-history", label: "History" },
  { href: "/compare", label: "Compare" },
  { href: "/app/settings", label: "Settings" },
];

function Home() {
  const { user } = useAuth();
  const liveData = useLiveData();
  const [itemData, setItemData] = useState<ItemFormData | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Load user profile for calculator defaults
  useEffect(() => {
    if (user?.id) setProfile(getUserProfile(user.id));
  }, [user?.id]);

  // Pick up pre-fill from search history re-run
  useEffect(() => {
    const raw = sessionStorage.getItem("truecost_prefill");
    if (raw) {
      try { setItemData(JSON.parse(raw)); } catch { /* ignore */ }
      sessionStorage.removeItem("truecost_prefill");
    }
  }, []);

  // Derive ItemEntryForm defaults from profile + live data.
  // Priority: profile override > live API data > hardcoded constant.
  // User edits in the form always take final precedence.
  const profileDefaults = useMemo<Partial<CarFormData>>(() => {
    const d: Partial<CarFormData> = {};
    if (profile?.commuteDaysPerWeek && profile.oneWayCommuteMiles) {
      d.annualMileage = Math.round(profile.oneWayCommuteMiles * 2 * profile.commuteDaysPerWeek * 52);
    }
    // Fuel price: profile override > live EIA gas price > static constant
    d.fuelPricePerUnit = profile?.preferredFuelPrice ?? liveData.gasPricePerGallon;
    if (profile?.monthlyInsurancePremium) d.insuranceMonthly = profile.monthlyInsurancePremium;
    if (profile?.stateOfRegistration) d.state = profile.stateOfRegistration;
    return d;
  }, [profile, liveData.gasPricePerGallon]);

  return (
    <div className="w-screen min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b relative">
        <span className="font-semibold">TrueCost</span>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-4">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:underline">{l.label}</a>
          ))}
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <LogoutButton />
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 rounded-md hover:bg-accent"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <div className="w-5 h-0.5 bg-foreground mb-1" />
          <div className="w-5 h-0.5 bg-foreground mb-1" />
          <div className="w-5 h-0.5 bg-foreground" />
        </button>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="sm:hidden absolute top-full right-0 z-50 w-48 bg-background border rounded-md shadow-lg py-2">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="block px-4 py-2 text-sm hover:bg-accent">{l.label}</a>
            ))}
            <div className="border-t my-1" />
            <div className="px-4 py-2 text-xs text-muted-foreground truncate">{user?.email}</div>
            <div className="px-4 pb-2"><LogoutButton /></div>
          </div>
        )}
      </header>
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto flex justify-center">
        {!itemData ? (
          <ItemEntryForm onSubmit={setItemData} defaultValues={profileDefaults} />
        ) : (
          <ResultsDashboard
            item={itemData}
            onReset={() => setItemData(null)}
            initialProjectionYears={profile?.ownershipHorizonYears}
          />
        )}
      </main>
    </div>
  );
}

export default Home;

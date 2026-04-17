import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogoutButton } from "./auth/LogoutButton";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  getExpenses, addExpense, deleteExpense,
  type ExpenseEntry, type ExpenseCategory,
} from "../lib/expenseLog";

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "fuel", label: "Fuel" },
  { value: "maintenance", label: "Maintenance" },
  { value: "repair", label: "Repair" },
  { value: "insurance", label: "Insurance" },
  { value: "registration", label: "Registration" },
  { value: "parking", label: "Parking / Tolls" },
  { value: "other", label: "Other" },
];

const CARD = { backgroundColor: "#1e1e3f", borderColor: "rgba(255,255,255,0.08)" };
const inputCls = "bg-[#2a2a5a] border-white/15 text-white placeholder:text-gray-500 focus-visible:ring-[#00d4ff]";
const selectCls =
  "flex h-9 w-full rounded-md border px-3 py-1 text-sm bg-[#2a2a5a] text-white border-white/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00d4ff]";

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  fuel: "bg-blue-900/40 text-blue-300",
  maintenance: "bg-green-900/40 text-green-300",
  repair: "bg-red-900/40 text-red-300",
  insurance: "bg-purple-900/40 text-purple-300",
  registration: "bg-yellow-900/40 text-yellow-300",
  parking: "bg-gray-700/40 text-gray-300",
  other: "bg-slate-700/40 text-slate-300",
};

function fmt(v: number) {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ExpenseLogPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? "";

  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [category, setCategory] = useState<ExpenseCategory>("fuel");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [mileage, setMileage] = useState("");
  const [vendor, setVendor] = useState("");
  const [underWarranty, setUnderWarranty] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setEntries(await getExpenses(userId));
    setLoading(false);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    setSubmitting(true);
    await addExpense(userId, {
      category,
      description,
      amount: parseFloat(amount),
      mileage: mileage ? parseInt(mileage) : undefined,
      vendor: vendor || undefined,
      underWarranty,
    });
    setDescription(""); setAmount(""); setMileage(""); setVendor(""); setUnderWarranty(false);
    setShowForm(false);
    await refresh();
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await deleteExpense(userId, id);
    await refresh();
  };

  const totalSpent = entries.reduce((s, e) => s + e.amount, 0);
  const byCategory = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  return (
    <div className="w-screen min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <span className="font-semibold text-white cursor-pointer" onClick={() => navigate("/")}>TrueCost</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user?.email}</span>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="w-full max-w-2xl mx-auto space-y-5">

          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white">Expense Log</h1>
            <div className="flex gap-2 items-center">
              <button className="text-sm text-gray-400 hover:text-[#00d4ff] transition-colors" onClick={() => navigate("/")}>Back</button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="text-sm px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={showForm
                  ? { border: "1px solid rgba(255,255,255,0.15)", color: "#9ca3af", background: "transparent" }
                  : { background: "linear-gradient(90deg, #00d4ff, #7c3aed)", color: "#fff" }}
              >
                {showForm ? "Cancel" : "+ Log Expense"}
              </button>
            </div>
          </div>

          {/* Summary stats */}
          {entries.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border p-4 space-y-1" style={CARD}>
                <p className="text-xs text-gray-400">Total Logged</p>
                <p className="text-xl font-bold text-[#00d4ff]">{fmt(totalSpent)}</p>
                <p className="text-xs text-gray-500">{entries.length} entries</p>
              </div>
              {Object.entries(byCategory).slice(0, 3).map(([cat, total]) => (
                <div key={cat} className="rounded-2xl border p-4 space-y-1" style={CARD}>
                  <p className="text-xs text-gray-400 capitalize">{cat}</p>
                  <p className="text-xl font-bold text-orange-400">{fmt(total)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Add expense form */}
          {showForm && (
            <div className="rounded-2xl border p-5 space-y-4" style={CARD}>
              <h3 className="text-sm font-semibold text-white">Log an Expense</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm text-gray-300">Category</Label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                      className={selectCls}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-gray-300">Amount ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm text-gray-300">Description</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Oil change, tire rotation, fill-up…"
                    required
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm text-gray-300">Mileage (optional)</Label>
                    <Input
                      type="number"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value)}
                      placeholder="48500"
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-gray-300">Vendor (optional)</Label>
                    <Input
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      placeholder="Jiffy Lube"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="warranty"
                    checked={underWarranty}
                    onChange={(e) => setUnderWarranty(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="warranty" className="text-sm text-gray-300 cursor-pointer">Covered under warranty</Label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-opacity"
                  style={{ background: "linear-gradient(90deg, #00d4ff, #7c3aed)", color: "#fff" }}
                >
                  {submitting ? "Saving…" : "Log Expense"}
                </button>
              </form>
            </div>
          )}

          {/* Entries list */}
          {loading ? (
            <p className="text-center text-gray-400 py-8">Loading…</p>
          ) : entries.length === 0 ? (
            <div className="text-center text-gray-400 py-16">
              <p>No expenses logged yet.</p>
              <p className="text-sm mt-1 text-gray-500">Track fuel fill-ups, oil changes, repairs, and more.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border px-4 py-3 flex items-center justify-between"
                  style={CARD}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[entry.category]}`}>
                      {entry.category}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">{entry.description}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(entry.loggedAt)}
                        {entry.vendor && ` · ${entry.vendor}`}
                        {entry.mileage && ` · ${entry.mileage.toLocaleString()} mi`}
                        {entry.underWarranty && " · Under warranty"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#00d4ff]">{fmt(entry.amount)}</span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-sm text-gray-500 hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

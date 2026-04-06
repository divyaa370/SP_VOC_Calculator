import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogoutButton } from "./auth/LogoutButton";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
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

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function fmt(v: number) {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  fuel: "bg-blue-100 text-blue-800",
  maintenance: "bg-green-100 text-green-800",
  repair: "bg-red-100 text-red-800",
  insurance: "bg-purple-100 text-purple-800",
  registration: "bg-yellow-100 text-yellow-800",
  parking: "bg-gray-100 text-gray-800",
  other: "bg-slate-100 text-slate-800",
};

export function ExpenseLogPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? "";

  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
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
        <span className="font-semibold cursor-pointer" onClick={() => navigate("/")}>TrueCost</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col items-center">
        <div className="w-full max-w-2xl space-y-5">

          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Expense Log</h1>
            <div className="flex gap-2">
              <button className="text-sm underline text-muted-foreground" onClick={() => navigate("/")}>Back</button>
              <Button size="sm" onClick={() => setShowForm(!showForm)}>
                {showForm ? "Cancel" : "+ Log Expense"}
              </Button>
            </div>
          </div>

          {/* Summary cards */}
          {entries.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs text-muted-foreground">Total Logged</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{fmt(totalSpent)}</p>
                  <p className="text-xs text-muted-foreground">{entries.length} entries</p>
                </CardContent>
              </Card>
              {Object.entries(byCategory).slice(0, 3).map(([cat, total]) => (
                <Card key={cat}>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs text-muted-foreground capitalize">{cat}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold">{fmt(total)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add expense form */}
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Log an Expense</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Category</Label>
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
                      <Label>Amount ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Oil change, tire rotation, fill-up…"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Mileage (optional)</Label>
                      <Input
                        type="number"
                        value={mileage}
                        onChange={(e) => setMileage(e.target.value)}
                        placeholder="48500"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Vendor (optional)</Label>
                      <Input
                        value={vendor}
                        onChange={(e) => setVendor(e.target.value)}
                        placeholder="Jiffy Lube"
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
                    <Label htmlFor="warranty" className="cursor-pointer">Covered under warranty</Label>
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Saving…" : "Log Expense"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Entries list */}
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading…</p>
          ) : entries.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              <p>No expenses logged yet.</p>
              <p className="text-sm mt-1">Track fuel fill-ups, oil changes, repairs, and more.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[entry.category]}`}>
                        {entry.category}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(entry.loggedAt)}
                          {entry.vendor && ` · ${entry.vendor}`}
                          {entry.mileage && ` · ${entry.mileage.toLocaleString()} mi`}
                          {entry.underWarranty && " · Under warranty"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{fmt(entry.amount)}</span>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

import { supabase } from "./supabaseClient";
import { shouldUseSupabase, markTableAvailable } from "./persistence";

export type ExpenseCategory = "fuel" | "maintenance" | "insurance" | "repair" | "registration" | "parking" | "other";

export interface ExpenseEntry {
  id: string;
  userId: string;
  analysisId?: string;
  loggedAt: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  mileage?: number;
  vendor?: string;
  underWarranty: boolean;
}

const TABLE = "expense_log";

// ── Public API ─────────────────────────────────────────────────────────────

export async function getExpenses(userId: string, analysisId?: string): Promise<ExpenseEntry[]> {
  if (!(await shouldUseSupabase(TABLE))) return ls.getAll(userId, analysisId);

  let q = supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false });

  if (analysisId) q = q.eq("analysis_id", analysisId);

  const { data, error } = await q;
  if (error) return ls.getAll(userId, analysisId);

  return (data ?? []).map(fromRow);
}

export async function addExpense(
  userId: string,
  entry: Omit<ExpenseEntry, "id" | "userId" | "loggedAt">
): Promise<ExpenseEntry> {
  if (!(await shouldUseSupabase(TABLE))) return ls.add(userId, entry);

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      analysis_id: entry.analysisId ?? null,
      category: entry.category,
      description: entry.description,
      amount: entry.amount,
      mileage: entry.mileage ?? null,
      vendor: entry.vendor ?? null,
      under_warranty: entry.underWarranty,
    })
    .select("*")
    .single();

  if (error || !data) return ls.add(userId, entry);

  markTableAvailable(TABLE);
  return fromRow(data);
}

export async function deleteExpense(userId: string, id: string): Promise<void> {
  if (!(await shouldUseSupabase(TABLE))) { ls.remove(userId, id); return; }

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) ls.remove(userId, id);
}

// ── Row mapper ─────────────────────────────────────────────────────────────

function fromRow(r: Record<string, unknown>): ExpenseEntry {
  return {
    id: (r.id ?? "") as string,
    userId: (r.user_id ?? "") as string,
    analysisId: r.analysis_id as string | undefined,
    loggedAt: (r.logged_at ?? "") as string,
    category: (r.category ?? "") as ExpenseCategory,
    description: (r.description ?? "") as string,
    amount: (r.amount ?? 0) as number,
    mileage: r.mileage as number | undefined,
    vendor: r.vendor as string | undefined,
    underWarranty: (r.under_warranty ?? false) as boolean,
  };
}

// ── localStorage layer ─────────────────────────────────────────────────────

const key = (userId: string) => `truecost_expenses_${userId}`;

const ls = {
  getAll(userId: string, analysisId?: string): ExpenseEntry[] {
    try {
      const all: ExpenseEntry[] = JSON.parse(localStorage.getItem(key(userId)) ?? "[]");
      return analysisId ? all.filter((e) => e.analysisId === analysisId) : all;
    } catch { return []; }
  },

  add(userId: string, entry: Omit<ExpenseEntry, "id" | "userId" | "loggedAt">): ExpenseEntry {
    const list = ls.getAll(userId);
    const full: ExpenseEntry = {
      ...entry,
      id: crypto.randomUUID(),
      userId,
      loggedAt: new Date().toISOString(),
    };
    localStorage.setItem(key(userId), JSON.stringify([full, ...list]));
    return full;
  },

  remove(userId: string, id: string) {
    localStorage.setItem(key(userId), JSON.stringify(ls.getAll(userId).filter((e) => e.id !== id)));
  },
};

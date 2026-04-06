import { supabase } from "./supabaseClient";

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

// ── Supabase ops ───────────────────────────────────────────────────────────

export async function getExpenses(userId: string, analysisId?: string): Promise<ExpenseEntry[]> {
  let q = supabase
    .from("expense_log")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false });

  if (analysisId) q = q.eq("analysis_id", analysisId);

  const { data, error } = await q;
  if (error) return getLocalExpenses(userId);

  return (data ?? []).map(mapRow);
}

export async function addExpense(
  userId: string,
  entry: Omit<ExpenseEntry, "id" | "userId" | "loggedAt">
): Promise<ExpenseEntry> {
  const { data, error } = await supabase
    .from("expense_log")
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

  if (error || !data) return addLocalExpense(userId, entry);
  return mapRow(data);
}

export async function deleteExpense(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("expense_log").delete().eq("id", id).eq("user_id", userId);
  if (error) deleteLocalExpense(userId, id);
}

// ── localStorage fallbacks ─────────────────────────────────────────────────

const lsKey = (userId: string) => `truecost_expenses_${userId}`;

function getLocalExpenses(userId: string): ExpenseEntry[] {
  try { return JSON.parse(localStorage.getItem(lsKey(userId)) ?? "[]"); }
  catch { return []; }
}

function addLocalExpense(
  userId: string,
  entry: Omit<ExpenseEntry, "id" | "userId" | "loggedAt">
): ExpenseEntry {
  const list = getLocalExpenses(userId);
  const full: ExpenseEntry = { ...entry, id: crypto.randomUUID(), userId, loggedAt: new Date().toISOString(), underWarranty: entry.underWarranty };
  localStorage.setItem(lsKey(userId), JSON.stringify([full, ...list]));
  return full;
}

function deleteLocalExpense(userId: string, id: string) {
  localStorage.setItem(lsKey(userId), JSON.stringify(getLocalExpenses(userId).filter((e) => e.id !== id)));
}

function mapRow(r: Record<string, unknown>): ExpenseEntry {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    analysisId: r.analysis_id as string | undefined,
    loggedAt: r.logged_at as string,
    category: r.category as ExpenseCategory,
    description: r.description as string,
    amount: r.amount as number,
    mileage: r.mileage as number | undefined,
    vendor: r.vendor as string | undefined,
    underWarranty: r.under_warranty as boolean,
  };
}

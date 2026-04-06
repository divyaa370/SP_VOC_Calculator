import { supabase } from "./supabaseClient";
import type { ItemFormData } from "../components/ItemEntryForm";

export interface SavedAnalysis {
  id: string;
  createdAt: string;
  label: string;
  item: ItemFormData;
}

function makeLabel(item: ItemFormData): string {
  if (item.category === "car") {
    return `${item.year} ${item.make} ${item.model}`;
  }
  return `${(item as { breed: string }).breed} (${(item as { petType: string }).petType})`;
}

// ── Supabase-backed CRUD ───────────────────────────────────────────────────

export async function getSavedAnalyses(userId: string): Promise<SavedAnalysis[]> {
  const { data, error } = await supabase
    .from("saved_analyses")
    .select("id, created_at, label, item")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("getSavedAnalyses fallback to localStorage:", error.message);
    return getLocalAnalyses(userId);
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    label: r.label,
    item: r.item as ItemFormData,
  }));
}

export async function saveAnalysis(userId: string, item: ItemFormData): Promise<SavedAnalysis> {
  const label = makeLabel(item);
  const { data, error } = await supabase
    .from("saved_analyses")
    .insert({ user_id: userId, label, item })
    .select("id, created_at, label, item")
    .single();

  if (error || !data) {
    console.warn("saveAnalysis fallback to localStorage:", error?.message);
    return saveLocalAnalysis(userId, item);
  }

  return { id: data.id, createdAt: data.created_at, label: data.label, item: data.item as ItemFormData };
}

export async function deleteAnalysis(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("saved_analyses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.warn("deleteAnalysis fallback to localStorage:", error.message);
    deleteLocalAnalysis(userId, id);
  }
}

export async function getAnalysisById(userId: string, id: string): Promise<SavedAnalysis | undefined> {
  const { data, error } = await supabase
    .from("saved_analyses")
    .select("id, created_at, label, item")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) return getLocalAnalyses(userId).find((a) => a.id === id);
  return { id: data.id, createdAt: data.created_at, label: data.label, item: data.item as ItemFormData };
}

// ── localStorage fallbacks ─────────────────────────────────────────────────

const lsKey = (userId: string) => `truecost_analyses_${userId}`;

function getLocalAnalyses(userId: string): SavedAnalysis[] {
  try { return JSON.parse(localStorage.getItem(lsKey(userId)) ?? "[]"); }
  catch { return []; }
}

function saveLocalAnalysis(userId: string, item: ItemFormData): SavedAnalysis {
  const list = getLocalAnalyses(userId);
  const entry: SavedAnalysis = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), label: makeLabel(item), item };
  localStorage.setItem(lsKey(userId), JSON.stringify([entry, ...list]));
  return entry;
}

function deleteLocalAnalysis(userId: string, id: string) {
  localStorage.setItem(lsKey(userId), JSON.stringify(getLocalAnalyses(userId).filter((a) => a.id !== id)));
}

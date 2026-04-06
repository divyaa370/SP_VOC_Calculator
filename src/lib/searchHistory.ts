import { supabase } from "./supabaseClient";
import type { ItemFormData } from "../components/ItemEntryForm";

export interface SearchHistoryEntry {
  id: string;
  searchedAt: string;
  label: string;
  item: ItemFormData;
}

function makeLabel(item: ItemFormData): string {
  if (item.category === "car") return `${item.year} ${item.make} ${item.model}`;
  return `${(item as { breed: string }).breed} (${(item as { petType: string }).petType})`;
}

// ── Supabase-backed ops ────────────────────────────────────────────────────

export async function getSearchHistory(userId: string): Promise<SearchHistoryEntry[]> {
  const { data, error } = await supabase
    .from("search_history")
    .select("id, searched_at, label, item")
    .eq("user_id", userId)
    .order("searched_at", { ascending: false })
    .limit(50);

  if (error) {
    console.warn("getSearchHistory fallback:", error.message);
    return getLocalHistory(userId);
  }

  return (data ?? []).map((r) => ({
    id: r.id, searchedAt: r.searched_at, label: r.label, item: r.item as ItemFormData,
  }));
}

export async function addSearchHistory(userId: string, item: ItemFormData): Promise<SearchHistoryEntry> {
  const label = makeLabel(item);
  const { data, error } = await supabase
    .from("search_history")
    .insert({ user_id: userId, label, item })
    .select("id, searched_at, label, item")
    .single();

  if (error || !data) {
    console.warn("addSearchHistory fallback:", error?.message);
    return addLocalHistory(userId, item);
  }

  return { id: data.id, searchedAt: data.searched_at, label: data.label, item: data.item as ItemFormData };
}

export async function deleteSearchHistoryEntry(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("search_history").delete().eq("id", id).eq("user_id", userId);
  if (error) deleteLocalHistoryEntry(userId, id);
}

export async function clearSearchHistory(userId: string): Promise<void> {
  const { error } = await supabase.from("search_history").delete().eq("user_id", userId);
  if (error) localStorage.removeItem(`truecost_history_${userId}`);
}

// ── localStorage fallbacks ─────────────────────────────────────────────────

const lsKey = (userId: string) => `truecost_history_${userId}`;

function getLocalHistory(userId: string): SearchHistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(lsKey(userId)) ?? "[]"); }
  catch { return []; }
}

function addLocalHistory(userId: string, item: ItemFormData): SearchHistoryEntry {
  const list = getLocalHistory(userId);
  const entry: SearchHistoryEntry = { id: crypto.randomUUID(), searchedAt: new Date().toISOString(), label: makeLabel(item), item };
  localStorage.setItem(lsKey(userId), JSON.stringify([entry, ...list].slice(0, 50)));
  return entry;
}

function deleteLocalHistoryEntry(userId: string, id: string) {
  localStorage.setItem(lsKey(userId), JSON.stringify(getLocalHistory(userId).filter((e) => e.id !== id)));
}

import { supabase } from "./supabaseClient";
import { shouldUseSupabase, markTableAvailable } from "./persistence";
import type { ItemFormData } from "../components/ItemEntryForm";

export interface SearchHistoryEntry {
  id: string;
  searchedAt: string;
  label: string;
  item: ItemFormData;
}

const TABLE = "search_history";
const MAX_LOCAL = 50;

function makeLabel(item: ItemFormData): string {
  if (item.category === "car") return `${item.year} ${item.make} ${item.model}`;
  return `${(item as { breed: string }).breed} (${(item as { petType: string }).petType})`;
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function getSearchHistory(userId: string): Promise<SearchHistoryEntry[]> {
  if (!(await shouldUseSupabase(TABLE))) return ls.getAll(userId);

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, searched_at, label, item")
    .eq("user_id", userId)
    .order("searched_at", { ascending: false })
    .limit(MAX_LOCAL);

  if (error) return ls.getAll(userId);

  return (data ?? []).map(fromRow);
}

export async function addSearchHistory(userId: string, item: ItemFormData): Promise<SearchHistoryEntry> {
  if (!(await shouldUseSupabase(TABLE))) return ls.add(userId, item);

  const label = makeLabel(item);
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ user_id: userId, label, item })
    .select("id, searched_at, label, item")
    .single();

  if (error || !data) return ls.add(userId, item);

  markTableAvailable(TABLE);
  return fromRow(data);
}

export async function deleteSearchHistoryEntry(userId: string, id: string): Promise<void> {
  if (!(await shouldUseSupabase(TABLE))) { ls.remove(userId, id); return; }

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) ls.remove(userId, id);
}

export async function clearSearchHistory(userId: string): Promise<void> {
  // Always clear localStorage regardless of mode — keeps both in sync
  ls.clear(userId);

  if (!(await shouldUseSupabase(TABLE))) return;

  await supabase.from(TABLE).delete().eq("user_id", userId);
}

// ── Row mapper ─────────────────────────────────────────────────────────────

function fromRow(r: { id: string; searched_at: string; label: string; item: unknown }): SearchHistoryEntry {
  return { id: r.id, searchedAt: r.searched_at, label: r.label, item: r.item as ItemFormData };
}

// ── localStorage layer ─────────────────────────────────────────────────────

const key = (userId: string) => `truecost_history_${userId}`;

const ls = {
  getAll(userId: string): SearchHistoryEntry[] {
    try {
      const raw = JSON.parse(localStorage.getItem(key(userId)) ?? "[]");
      if (!Array.isArray(raw)) return [];
      return raw;
    } catch { return []; }
  },

  add(userId: string, item: ItemFormData): SearchHistoryEntry {
    const list = ls.getAll(userId);
    const entry: SearchHistoryEntry = {
      id: crypto.randomUUID(),
      searchedAt: new Date().toISOString(),
      label: makeLabel(item),
      item,
    };
    localStorage.setItem(key(userId), JSON.stringify([entry, ...list].slice(0, MAX_LOCAL)));
    return entry;
  },

  remove(userId: string, id: string) {
    localStorage.setItem(key(userId), JSON.stringify(ls.getAll(userId).filter((e) => e.id !== id)));
  },

  clear(userId: string) {
    localStorage.removeItem(key(userId));
  },
};

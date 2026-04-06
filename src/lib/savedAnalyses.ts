import { z } from "zod";
import { supabase } from "./supabaseClient";
import { shouldUseSupabase, markTableAvailable } from "./persistence";
import type { ItemFormData } from "../components/ItemEntryForm";

// Minimal schema for validating localStorage entries after JSON.parse.
// Uses passthrough so valid extra fields are preserved across schema changes.
const savedAnalysisSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  label: z.string(),
  item: z.object({ category: z.string() }).passthrough(),
});
const savedAnalysesArraySchema = z.array(savedAnalysisSchema);

export interface SavedAnalysis {
  id: string;
  createdAt: string;
  label: string;
  item: ItemFormData;
}

const TABLE = "saved_analyses";

function makeLabel(item: ItemFormData): string {
  if (item.category === "car") return `${item.year} ${item.make} ${item.model}`;
  return `${(item as { breed: string }).breed} (${(item as { petType: string }).petType})`;
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function getSavedAnalyses(userId: string): Promise<SavedAnalysis[]> {
  if (!(await shouldUseSupabase(TABLE))) return ls.getAll(userId);

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, created_at, label, item")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return ls.getAll(userId);

  return (data ?? []).map(fromRow);
}

export async function saveAnalysis(userId: string, item: ItemFormData): Promise<SavedAnalysis> {
  if (!(await shouldUseSupabase(TABLE))) return ls.save(userId, item);

  const label = makeLabel(item);
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ user_id: userId, label, item })
    .select("id, created_at, label, item")
    .single();

  if (error || !data) return ls.save(userId, item);

  markTableAvailable(TABLE);
  return fromRow(data);
}

export async function deleteAnalysis(userId: string, id: string): Promise<void> {
  if (!(await shouldUseSupabase(TABLE))) { ls.remove(userId, id); return; }

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) ls.remove(userId, id);
}

export async function getAnalysisById(userId: string, id: string): Promise<SavedAnalysis | undefined> {
  if (!(await shouldUseSupabase(TABLE))) return ls.getAll(userId).find((a) => a.id === id);

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, created_at, label, item")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) return ls.getAll(userId).find((a) => a.id === id);
  return fromRow(data);
}

// ── Row mapper ─────────────────────────────────────────────────────────────

function fromRow(r: { id: string; created_at: string; label: string; item: unknown }): SavedAnalysis {
  return { id: r.id, createdAt: r.created_at, label: r.label, item: r.item as ItemFormData };
}

// ── localStorage layer ─────────────────────────────────────────────────────

const key = (userId: string) => `truecost_analyses_${userId}`;

const ls = {
  getAll(userId: string): SavedAnalysis[] {
    try {
      const raw = JSON.parse(localStorage.getItem(key(userId)) ?? "[]");
      const result = savedAnalysesArraySchema.safeParse(raw);
      if (!result.success) {
        // Corrupt/tampered data — clear and start fresh.
        localStorage.removeItem(key(userId));
        return [];
      }
      return result.data as SavedAnalysis[];
    } catch {
      return [];
    }
  },

  save(userId: string, item: ItemFormData): SavedAnalysis {
    const list = ls.getAll(userId);
    const entry: SavedAnalysis = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      label: makeLabel(item),
      item,
    };
    localStorage.setItem(key(userId), JSON.stringify([entry, ...list]));
    return entry;
  },

  remove(userId: string, id: string) {
    localStorage.setItem(key(userId), JSON.stringify(ls.getAll(userId).filter((a) => a.id !== id)));
  },
};

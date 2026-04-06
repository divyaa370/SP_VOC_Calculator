/**
 * persistence.ts
 *
 * Dual-mode persistence helper shared by savedAnalyses, searchHistory, and expenseLog.
 *
 * Decision tree for every operation:
 *   1. Is there an active auth session?  No  → localStorage
 *   2. Have Supabase tables been confirmed available?
 *        unknown → probe once, cache result
 *        false   → localStorage (migration hasn't run yet)
 *        true    → Supabase, with localStorage fallback on transient errors
 *
 * This means the app works correctly in three modes:
 *   - Guest / unauthenticated      → localStorage only
 *   - Authenticated, no migration  → localStorage only (no errors, no warnings)
 *   - Authenticated + migrated     → Supabase, localStorage never touched
 */

import { supabase } from "./supabaseClient";

// ── Table availability cache ───────────────────────────────────────────────
// null = not yet probed, true = confirmed up, false = migration not run

const tableStatus: Record<string, boolean | null> = {};

/**
 * Returns true if we should attempt a Supabase operation.
 * Checks session first (fast), then probes the table once (cached).
 */
export async function shouldUseSupabase(table: string): Promise<boolean> {
  // 1. Check for an active session — skip Supabase entirely for guests
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  // 2. Return cached result if we already know
  if (tableStatus[table] !== undefined && tableStatus[table] !== null) {
    return tableStatus[table] as boolean;
  }

  // 3. Probe with a lightweight query (limit 0 = no rows fetched)
  const { error } = await supabase.from(table).select("id").limit(0);

  if (!error) {
    tableStatus[table] = true;
    return true;
  }

  // PostgreSQL "undefined_table" (42P01) or PostgREST "relation does not exist"
  const isTableMissing =
    error.code === "42P01" ||
    error.message?.includes("does not exist") ||
    error.message?.includes("relation") ||
    (error as { details?: string }).details?.includes("does not exist");

  if (isTableMissing) {
    tableStatus[table] = false;   // migration not run — stop trying
    return false;
  }

  // Transient error (network, timeout) — don't cache, try again next call
  return false;
}

/**
 * Call this after a successful Supabase write to confirm the table is live.
 * Avoids needing a separate probe on the first write.
 */
export function markTableAvailable(table: string) {
  tableStatus[table] = true;
}

/**
 * Reset cache (useful in tests or after running the migration at runtime).
 */
export function resetTableCache(table?: string) {
  if (table) {
    delete tableStatus[table];
  } else {
    Object.keys(tableStatus).forEach((k) => delete tableStatus[k]);
  }
}

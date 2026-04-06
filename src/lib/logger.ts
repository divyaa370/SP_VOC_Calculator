/**
 * Structured logger that suppresses output in production.
 *
 * Rules enforced here:
 * - No user PII (email, income, address, userId) is ever passed to these
 *   methods. Callers are responsible for passing only technical context
 *   (API names, HTTP status codes, error messages from external services).
 * - In production (import.meta.env.PROD === true), all logging is silent
 *   unless VITE_DEBUG=true is explicitly set.
 * - Errors that affect the user experience should be surfaced via UI state,
 *   not console output.
 */

const silent = import.meta.env.PROD && import.meta.env.VITE_DEBUG !== "true";

export const logger = {
  /** Non-fatal operational warning (e.g. fallback triggered, cache miss). */
  warn(message: string, detail?: string): void {
    if (!silent) console.warn(`[TrueCost] ${message}`, detail ?? "");
  },
  /** Unexpected error that did not crash the app. */
  error(message: string, detail?: string): void {
    if (!silent) console.error(`[TrueCost] ${message}`, detail ?? "");
  },
  /** Development-only diagnostic. Never log PII here. */
  debug(message: string, detail?: string): void {
    if (!silent && import.meta.env.DEV) console.debug(`[TrueCost] ${message}`, detail ?? "");
  },
};

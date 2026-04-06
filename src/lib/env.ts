/**
 * Environment variable validation.
 *
 * All required variables are validated at module load time using zod.
 * If any required variable is missing, a structured error is thrown
 * identifying the exact variable name — not a generic "config error".
 *
 * IMPORTANT: Only VITE_-prefixed variables are safe to use in client-side
 * code; they are baked into the bundle at build time. Never place secrets
 * (service_role key, private API keys) in VITE_ variables — they would be
 * visible to every user who views the page source.
 *
 * Required:
 *   VITE_SUPABASE_URL      — your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY — Supabase anon/public key (safe to expose)
 *
 * Optional:
 *   VITE_EIA_API_KEY       — EIA API key for live gas/electricity prices
 *   VITE_APP_URL           — full origin URL (e.g. https://truecost.app)
 */

import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string({ required_error: "VITE_SUPABASE_URL is required" })
    .url("VITE_SUPABASE_URL must be a valid URL (e.g. https://xxx.supabase.co)"),
  VITE_SUPABASE_ANON_KEY: z
    .string({ required_error: "VITE_SUPABASE_ANON_KEY is required" })
    .min(1, "VITE_SUPABASE_ANON_KEY must not be empty"),
  VITE_EIA_API_KEY: z.string().optional(),
  VITE_APP_URL: z.string().url().optional().or(z.literal("")),
});

const parsed = envSchema.safeParse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_EIA_API_KEY: import.meta.env.VITE_EIA_API_KEY,
  VITE_APP_URL: import.meta.env.VITE_APP_URL,
});

if (!parsed.success) {
  const missing = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("\n  ");
  throw new Error(
    `TrueCost: missing or invalid environment variables:\n  ${missing}\n\nSee .env.example for the required variables.`
  );
}

export const env = parsed.data as {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_EIA_API_KEY?: string;
  VITE_APP_URL?: string;
};

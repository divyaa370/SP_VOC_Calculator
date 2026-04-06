import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// env.ts validates at module load time with structured errors — no need to re-check here.
export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

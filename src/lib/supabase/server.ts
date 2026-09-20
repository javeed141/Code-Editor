import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

let hasLoggedConnection = false;

/**
 * Creates a typed Supabase client for server-side database access.
 * Returns null if Supabase environment variables are not yet configured.
 */
export function getSupabaseServerClient() {
  if (!supabaseUrl || !supabaseKey) {
    if (!hasLoggedConnection) {
      console.warn("⚠️ [Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or Supabase Key in environment.");
      hasLoggedConnection = true;
    }
    return null;
  }

  if (!hasLoggedConnection) {
    console.log(`🟢 [Supabase] Connected to Supabase at: ${supabaseUrl}`);
    hasLoggedConnection = true;
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

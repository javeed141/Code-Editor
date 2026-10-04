import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

let _client: ReturnType<typeof createClient<Database>> | null = null;
let hasLoggedConnection = false;

/**
 * Creates a typed Supabase client for server-side database access using the
 * service role key (bypasses RLS — for trusted server code only).
 *
 * Returns null in development if env vars are missing (graceful degradation).
 * Throws in production if env vars are missing (fast-fail over silent broken state).
 */
export function getSupabaseServerClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[Supabase] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in production.",
      );
    }
    if (!hasLoggedConnection) {
      console.warn("⚠️ [Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — Supabase features disabled.");
      hasLoggedConnection = true;
    }
    return null;
  }

  // Reuse the singleton client across requests within the same server process
  if (!_client) {
    _client = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    if (!hasLoggedConnection) {
      console.log(`🟢 [Supabase] Server client initialized at: ${supabaseUrl}`);
      hasLoggedConnection = true;
    }
  }

  return _client;
}

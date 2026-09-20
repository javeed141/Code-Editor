import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let hasLoggedServerClient = false;

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  if (!hasLoggedServerClient && supabaseUrl) {
    console.log(`🟢 [Supabase SSR] Initialized server client for: ${supabaseUrl}`);
    hasLoggedServerClient = true;
  }

  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    },
  );
};

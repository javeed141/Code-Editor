import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";

export async function GET() {
  const supabase = getSupabaseServerClient();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabase) {
    console.error("🔴 [Supabase] Failed to connect: Missing credentials in .env.local");
    return NextResponse.json(
      {
        status: "error",
        message: "Supabase client not initialized. Check .env.local credentials.",
      },
      { status: 500 },
    );
  }

  try {
    // Ping Supabase to test connectivity
    const { error } = await supabase.from("users").select("count", { count: "exact", head: true });

    if (error) {
      console.log(`🟡 [Supabase] Connected to ${url} (Note: tables may need migrations applied: ${error.message})`);
      return NextResponse.json({
        status: "connected",
        url,
        database: "reachable",
        note: error.message,
      });
    }

    console.log(`🟢 [Supabase] Successfully connected and verified with database at: ${url}`);
    return NextResponse.json({
      status: "success",
      message: "Connected to Supabase successfully!",
      url,
    });
  } catch (err) {
    console.error("🔴 [Supabase] Connection check error:", err);
    return NextResponse.json(
      {
        status: "error",
        message: err instanceof Error ? err.message : "Unknown connection error",
      },
      { status: 500 },
    );
  }
}


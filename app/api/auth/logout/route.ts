import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { clearSession } from "@/src/lib/session";
import { unlinkGitHubAccount } from "@/src/lib/supabase/db";

const GITHUB_COOKIES = ["github_session", "github_oauth_state"];

function expireGitHubCookies(response: NextResponse) {
  const isProduction = process.env.NODE_ENV === "production";
  for (const name of GITHUB_COOKIES) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
    });
    response.cookies.delete(name);
  }
}

async function handleGitHubDisconnect() {
  await clearSession();
  try {
    const clerkUser = await currentUser().catch(() => null);
    if (clerkUser?.id) {
      await unlinkGitHubAccount(clerkUser.id);
    }
  } catch (err) {
    console.error("Error unlinking GitHub in Supabase on logout:", err);
  }
}

export async function GET(request: NextRequest) {
  await handleGitHubDisconnect();
  const response = NextResponse.redirect(new URL("/", request.nextUrl.origin));
  expireGitHubCookies(response);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  return response;
}

export async function POST() {
  await handleGitHubDisconnect();
  const response = NextResponse.json({ ok: true });
  expireGitHubCookies(response);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  return response;
}




import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { setOAuthState } from "@/src/lib/session";

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "GITHUB_CLIENT_ID is not configured in .env.local" },
      { status: 500 },
    );
  }

  // Generate a random state token to prevent CSRF attacks
  const state = crypto.randomBytes(16).toString("hex");
  await setOAuthState(state);

  // GitHub OAuth authorize URL
  const callbackUrl = new URL("/api/auth/github/callback", request.nextUrl.origin).toString();
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("scope", "repo,read:user");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}


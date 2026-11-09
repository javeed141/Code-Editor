import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { setOAuthState } from "@/src/lib/session";

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const appSlug = process.env.GITHUB_APP_SLUG?.trim();

  if (!clientId) {
    return NextResponse.json(
      { error: "GITHUB_CLIENT_ID is not configured in .env.local" },
      { status: 500 },
    );
  }

  // Generate a random state token to prevent CSRF attacks
  const state = crypto.randomBytes(16).toString("hex");
  await setOAuthState(state);

  // If a GitHub App slug is configured, redirect to the App installation & repo selection page
  if (appSlug) {
    const installUrl = new URL(`https://github.com/apps/${appSlug}/installations/new`);
    installUrl.searchParams.set("state", state);
    return NextResponse.redirect(installUrl.toString());
  }

  // Fallback: Standard OAuth authorization URL
  const callbackUrl = new URL("/api/auth/github/callback", request.nextUrl.origin).toString();
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("scope", "repo,read:user");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authUrl.toString());
}






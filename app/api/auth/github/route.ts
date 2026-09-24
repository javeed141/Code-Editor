import { NextResponse } from "next/server";
import crypto from "crypto";
import { setOAuthState } from "@/src/lib/session";

export async function GET() {
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

  // GitHub uses the callback URL configured for this OAuth app.
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", "repo,read:user");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}

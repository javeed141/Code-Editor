import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { setOAuthState } from "@/src/lib/session";
import { getGitHubCallbackUrl } from "@/src/lib/app-url";

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const appSlug = process.env.GITHUB_APP_SLUG?.trim();
  const callbackUrl = getGitHubCallbackUrl(request);

  if (!clientId) {
    return NextResponse.json(
      { error: "GITHUB_CLIENT_ID is not configured in .env.local" },
      { status: 500 },
    );
  }

  // Generate a random state token to prevent CSRF attacks
  const state = crypto.randomBytes(16).toString("hex");
  await setOAuthState(state);

  // Always initiate GitHub OAuth authorization with the dynamic redirect_uri!
  // Passing redirect_uri explicitly to /login/oauth/authorize forces GitHub to redirect
  // back to the active origin (e.g. Vercel or localhost) rather than defaulting to
  // whichever single callback URL is registered in the GitHub App settings.
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("scope", "repo,read:user");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}

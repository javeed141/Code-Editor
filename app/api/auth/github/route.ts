import { NextResponse } from "next/server";
import crypto from "crypto";
import { setOAuthState } from "@/src/lib/session";

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const appSlug = process.env.GITHUB_APP_SLUG?.trim();
  const callbackUrl = process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/api/auth/github/callback";

  if (!clientId && !appSlug) {
    return NextResponse.json(
      { error: "Neither GITHUB_CLIENT_ID nor GITHUB_APP_SLUG is configured in .env.local" },
      { status: 500 },
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  await setOAuthState(state);

  // If GITHUB_APP_SLUG is configured, direct the user directly to GitHub's native installation page!
  // This presents GitHub's official "Only select repositories" screen.
  if (appSlug) {
    const installUrl = new URL(`https://github.com/apps/${appSlug}/installations/new`);
    installUrl.searchParams.set("state", state);
    return NextResponse.redirect(installUrl.toString());
  }

  // Fallback to standard OAuth authorize URL
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId!);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("scope", "repo,read:user");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}

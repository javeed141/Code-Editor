import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { setOAuthState } from "@/src/lib/session";

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const appSlug = process.env.GITHUB_APP_SLUG?.trim();
  const callbackUrl =
    process.env.GITHUB_CALLBACK_URL ||
    new URL("/api/auth/github/callback", request.nextUrl.origin).toString();

  if (!clientId) {
    return NextResponse.json(
      { error: "GITHUB_CLIENT_ID is not configured in .env.local" },
      { status: 500 },
    );
  }

  // Generate a random state token to prevent CSRF attacks
  const state = crypto.randomBytes(16).toString("hex");
  await setOAuthState(state);

  if (appSlug) {
    // ── STEP 1 of 2: GitHub App flow ──────────────────────────────────────────
    // Send user to GitHub's native App installation page.
    // GitHub will show "Only select repositories" screen here.
    // After the user installs/selects repos, GitHub redirects to our callback
    // with ?installation_id=...&setup_action=install
    // The callback then kicks off Step 2 (OAuth authorization).
    const installUrl = new URL(`https://github.com/apps/${appSlug}/installations/new`);
    installUrl.searchParams.set("state", state);
    return NextResponse.redirect(installUrl.toString());
  }

  // ── Standard OAuth App flow (fallback when no GITHUB_APP_SLUG) ─────────────
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("scope", "repo,read:user");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}

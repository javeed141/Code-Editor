import { NextRequest, NextResponse } from "next/server";
import { getOAuthState, setSession } from "@/src/lib/session";
import { getAuthenticatedUser } from "@/src/lib/github";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const setupAction = searchParams.get("setup_action"); // "install" or "update"
  const installationIdParam = searchParams.get("installation_id");
  const installationId = installationIdParam ? parseInt(installationIdParam, 10) : undefined;

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const appSlug = process.env.GITHUB_APP_SLUG?.trim();
  const callbackUrl =
    process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/api/auth/github/callback";

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/?auth_error=server_configuration_missing", request.nextUrl.origin),
    );
  }

  // ── STEP 1 → STEP 2: GitHub App installation callback ────────────────────────
  // GitHub redirects here after the user installs the app and selects repos.
  // At this point we have installation_id but NO access token yet.
  // We must now redirect to GitHub OAuth authorize URL to get a "code".
  if (appSlug && installationId && (setupAction === "install" || setupAction === "update") && !code) {
    // Save the installation_id in the state so we can retrieve it after OAuth
    // We encode it as part of state: "originalState|installationId"
    const savedState = await getOAuthState();

    // Start OAuth authorization (Step 2)
    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", callbackUrl);
    // We re-use the same state, but encode installation_id alongside it
    authUrl.searchParams.set("state", `${savedState}|${installationId}`);
    return NextResponse.redirect(authUrl.toString());
  }

  // ── STEP 2: OAuth authorization callback (has "code") ────────────────────────
  // GitHub redirects here after user clicks "Authorize" on the OAuth screen.
  // We extract the code (+ installation_id from state if GitHub App flow).

  // Parse installation_id out of state if encoded there (GitHub App flow)
  let resolvedInstallationId = installationId;
  let realState = state;

  if (state && state.includes("|")) {
    const parts = state.split("|");
    realState = parts[0];
    resolvedInstallationId = parseInt(parts[1], 10) || undefined;
  }

  // Validate CSRF state
  const savedState = await getOAuthState();
  if (!realState || !savedState || realState !== savedState) {
    return NextResponse.redirect(
      new URL("/?auth_error=invalid_state", request.nextUrl.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?auth_error=missing_code", request.nextUrl.origin),
    );
  }

  try {
    // Exchange authorization code for GitHub access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error("GitHub OAuth token exchange failed:", tokenData);
      return NextResponse.redirect(
        new URL(
          `/?auth_error=${encodeURIComponent(tokenData.error_description || "token_exchange_failed")}`,
          request.nextUrl.origin,
        ),
      );
    }

    const accessToken = tokenData.access_token as string;

    // Fetch the authenticated user's profile
    const user = await getAuthenticatedUser(accessToken);

    // Save the full session (accessToken + user + installationId)
    await setSession({
      accessToken,
      user,
      installationId: resolvedInstallationId,
    });

    return NextResponse.redirect(new URL("/", request.nextUrl.origin));
  } catch (err) {
    console.error("Error during GitHub OAuth callback:", err);
    return NextResponse.redirect(
      new URL("/?auth_error=oauth_processing_error", request.nextUrl.origin),
    );
  }
}

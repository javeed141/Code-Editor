import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getOAuthState, setSession } from "@/src/lib/session";
import { getAuthenticatedUser } from "@/src/lib/github";
import { upsertUser } from "@/src/lib/supabase/db";
import { getAppBaseUrl, getGitHubCallbackUrl } from "@/src/lib/app-url";

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
  const baseUrl = getAppBaseUrl(request);
  const callbackUrl = getGitHubCallbackUrl(request);

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/?auth_error=server_configuration_missing", baseUrl),
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
      new URL("/?auth_error=invalid_state", baseUrl),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?auth_error=missing_code", baseUrl),
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
          baseUrl,
        ),
      );
    }

    const accessToken = tokenData.access_token as string;

    // Fetch the authenticated user's profile
    const user = await getAuthenticatedUser(accessToken);

    // Discover installationId if not already parsed
    let finalInstallationId = resolvedInstallationId;
    if (!finalInstallationId && appSlug) {
      try {
        const { listInstallationRepositories } = await import("@/src/lib/github");
        const installData = await listInstallationRepositories(accessToken);
        finalInstallationId = installData.installationId;
      } catch (err) {
        console.warn("Could not discover installationId from user:", err);
      }
    }

    // Save the full session (accessToken + user + installationId)
    await setSession({
      accessToken,
      user,
      installationId: finalInstallationId,
    });

    // Also sync GitHub details to Supabase if Clerk user is signed in
    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const primaryEmail =
          clerkUser.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
          clerkUser.emailAddresses?.[0]?.emailAddress ||
          null;

        await upsertUser({
          id: clerkUser.id,
          email: primaryEmail,
          display_name: clerkUser.firstName
            ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
            : clerkUser.username || user.login,
          avatar_url: clerkUser.imageUrl || user.avatar_url,
          github_user_id: user.id,
          github_username: user.login,
        });
      }
    } catch (dbErr) {
      console.error("Failed to sync GitHub account to Supabase user:", dbErr);
    }

    return NextResponse.redirect(new URL("/", baseUrl));
  } catch (err) {
    console.error("Error during GitHub OAuth callback:", err);
    return NextResponse.redirect(
      new URL("/?auth_error=oauth_processing_error", baseUrl),
    );
  }
}

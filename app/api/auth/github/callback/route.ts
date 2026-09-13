import { NextRequest, NextResponse } from "next/server";
import { getOAuthState, setSession } from "@/src/lib/session";
import { getAuthenticatedUser } from "@/src/lib/github";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const installationIdParam = searchParams.get("installation_id");
  const installationId = installationIdParam ? parseInt(installationIdParam, 10) : undefined;

  const savedState = await getOAuthState();

  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL("/?auth_error=invalid_state", request.nextUrl.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?auth_error=missing_code", request.nextUrl.origin),
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/api/auth/github/callback";

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/?auth_error=server_configuration_missing", request.nextUrl.origin),
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
        new URL(`/?auth_error=${encodeURIComponent(tokenData.error_description || "token_exchange_failed")}`, request.nextUrl.origin),
      );
    }

    const accessToken = tokenData.access_token as string;

    // Fetch user profile securely using the access token
    const user = await getAuthenticatedUser(accessToken);

    // Save session in HttpOnly cookie, retaining installationId if present
    await setSession({
      accessToken,
      user,
      installationId,
    });

    return NextResponse.redirect(new URL("/", request.nextUrl.origin));
  } catch (err) {
    console.error("Error during GitHub OAuth callback:", err);
    return NextResponse.redirect(
      new URL("/?auth_error=oauth_processing_error", request.nextUrl.origin),
    );
  }
}

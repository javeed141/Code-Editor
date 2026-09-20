import { NextRequest } from "next/server";

/**
 * Returns the canonical base URL of the active application.
 * Automatically resolves Vercel production URLs, x-forwarded headers,
 * request origins, and falls back to localhost:3000 in development.
 */
export function getAppBaseUrl(request?: NextRequest): string {
  // 1. Explicit environment variable overrides
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // 2. Vercel deployment variables
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 3. Dynamic request headers (reverse proxy / active host)
  if (request) {
    const proto =
      request.headers.get("x-forwarded-proto") ||
      (request.nextUrl?.protocol ? request.nextUrl.protocol.replace(":", "") : "http");
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      request.nextUrl?.host;

    if (host) {
      return `${proto}://${host}`;
    }

    if (request.nextUrl?.origin) {
      return request.nextUrl.origin;
    }
  }

  // 4. Default fallback
  return "http://localhost:3000";
}

/**
 * Returns the dynamic, matching GitHub OAuth callback URL for the active environment.
 */
export function getGitHubCallbackUrl(request: NextRequest): string {
  const envCallback = process.env.GITHUB_CALLBACK_URL;
  const baseUrl = getAppBaseUrl(request);
  const dynamicCallback = `${baseUrl}/api/auth/github/callback`;

  // If the envCallback is configured for localhost but the request is coming from a live domain,
  // prioritize the live domain's callback URL to prevent redirecting to localhost!
  if (envCallback) {
    const isLocalEnv = envCallback.includes("localhost");
    const isRemoteRequest = !baseUrl.includes("localhost");
    if (isLocalEnv && isRemoteRequest) {
      return dynamicCallback;
    }
    return envCallback;
  }

  return dynamicCallback;
}

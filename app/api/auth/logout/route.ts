import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/src/lib/session";

const SESSION_COOKIES = ["github_session", "github_oauth_state", "next-auth.session-token", "session"];

function expireAllCookies(response: NextResponse) {
  for (const name of SESSION_COOKIES) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
    });
  }
}

export async function GET(request: NextRequest) {
  await clearSession();
  const response = NextResponse.redirect(new URL("/", request.nextUrl.origin));
  expireAllCookies(response);
  return response;
}

export async function POST() {
  await clearSession();
  const response = NextResponse.json({ ok: true });
  expireAllCookies(response);
  return response;
}

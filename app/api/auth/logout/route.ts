import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/src/lib/session";

export async function GET(request: NextRequest) {
  await clearSession();
  const response = NextResponse.redirect(new URL("/", request.nextUrl.origin));
  response.cookies.set("github_session", "", { path: "/", maxAge: 0, expires: new Date(0) });
  response.cookies.set("github_oauth_state", "", { path: "/", maxAge: 0, expires: new Date(0) });
  return response;
}

export async function POST() {
  await clearSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set("github_session", "", { path: "/", maxAge: 0, expires: new Date(0) });
  response.cookies.set("github_oauth_state", "", { path: "/", maxAge: 0, expires: new Date(0) });
  return response;
}

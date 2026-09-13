import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/session";
import { getFileContent } from "@/src/lib/github";

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated. Please sign in with GitHub." },
      { status: 401 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const path = searchParams.get("path");
  const ref = searchParams.get("ref");

  if (!owner || !repo || !path || !ref) {
    return NextResponse.json(
      { error: "Missing required parameters: owner, repo, path, ref" },
      { status: 400 },
    );
  }

  try {
    const fileContent = await getFileContent(session.accessToken, owner, repo, path, ref);
    return NextResponse.json(fileContent);
  } catch (error: unknown) {
    console.error(`Failed to fetch file content for ${owner}/${repo}/${path} (${ref}):`, error);
    const err = error as { status?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to fetch file content from GitHub." },
      { status: err.status || 500 },
    );
  }
}


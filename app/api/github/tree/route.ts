import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/session";
import { getRepositoryTree } from "@/src/lib/github";

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
  const branch = searchParams.get("branch");

  if (!owner || !repo || !branch) {
    return NextResponse.json(
      { error: "Missing required parameters: owner, repo, branch" },
      { status: 400 },
    );
  }

  try {
    const result = await getRepositoryTree(session.accessToken, owner, repo, branch);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error(`Failed to fetch Git tree for ${owner}/${repo} (${branch}):`, error);
    const err = error as { status?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to fetch repository tree from GitHub." },
      { status: err.status || 500 },
    );
  }
}


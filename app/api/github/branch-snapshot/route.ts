import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/session";
import { getBranchSnapshot } from "@/src/lib/github";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.accessToken || !session.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
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
    const snapshot = await getBranchSnapshot(session.accessToken, owner, repo, branch);
    return NextResponse.json(snapshot);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 404) {
      return NextResponse.json({ error: "Branch or repository not found" }, { status: 404 });
    }
    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ error: "Forbidden — check repository access" }, { status: 403 });
    }
    console.error("Branch snapshot fetch error:", error);
    return NextResponse.json({ error: "Unable to load repository snapshot from GitHub." }, { status: 502 });
  }
}

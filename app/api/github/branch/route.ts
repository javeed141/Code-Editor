import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/session";
import { getBranchHead } from "@/src/lib/github";

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
    const { headSha } = await getBranchHead(session.accessToken, owner, repo, branch);
    return NextResponse.json({ branch, headSha });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status === 404) {
      return NextResponse.json({ error: "Branch or repository not found" }, { status: 404 });
    }
    if (e.status === 401 || e.status === 403) {
      return NextResponse.json({ error: "Forbidden — check repository access" }, { status: 403 });
    }
    console.error("Branch HEAD fetch error:", err);
    return NextResponse.json({ error: "Unable to reach GitHub. Try again." }, { status: 502 });
  }
}


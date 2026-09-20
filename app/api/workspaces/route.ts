import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth-user";
import { upsertWorkspace, getRecentWorkspace } from "@/src/lib/supabase/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getRecentWorkspace(user.id);
  return NextResponse.json({ workspace });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { repoOwner, repoName, selectedBranch } = body;

    if (!repoOwner || !repoName) {
      return NextResponse.json({ error: "Missing repoOwner or repoName" }, { status: 400 });
    }

    const branch = selectedBranch || "main";
    const workspace = await upsertWorkspace(user.id, repoOwner, repoName, branch);

    return NextResponse.json({ workspace });
  } catch (err) {
    console.error("Error saving workspace:", err);
    return NextResponse.json({ error: "Failed to save workspace" }, { status: 500 });
  }
}


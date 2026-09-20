import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth-user";
import { getOrCreateConversation } from "@/src/lib/supabase/db";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const repository = searchParams.get("repository");
  const branch = searchParams.get("branch") || "main";

  if (!repository) {
    return NextResponse.json({ error: "Repository parameter is required" }, { status: 400 });
  }

  const conversation = await getOrCreateConversation(user.id, repository, branch);
  return NextResponse.json({ conversation });
}

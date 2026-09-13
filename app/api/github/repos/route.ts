import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/session";
import { listInstallationRepositories } from "@/src/lib/github";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated. Please sign in with GitHub." },
      { status: 401 },
    );
  }

  try {
    const { repositories, installationId } = await listInstallationRepositories(
      session.accessToken,
      session.installationId,
    );

    return NextResponse.json({
      repositories,
      installationId,
    });
  } catch (error: unknown) {
    console.error("Failed to list GitHub repositories:", error);
    const err = error as { status?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to load repositories from GitHub." },
      { status: err.status || 500 },
    );
  }
}

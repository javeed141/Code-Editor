import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/session";
import { createCommit, listInstallationRepositories, listRepositories } from "@/src/lib/github";
import type { CommitFile } from "@/src/lib/github";

type CommitRequestBody = {
  owner: string;
  repo: string;
  branch: string;
  expectedHeadSha: string;
  message: string;
  files: Array<{
    path: string;
    content: string | null;
    status: "modified" | "added" | "deleted";
  }>;
};

function isValidCommitFile(
  file: CommitRequestBody["files"][number],
): boolean {
  return (
    typeof file === "object" &&
    file !== null &&
    typeof file.path === "string" &&
    file.path.length > 0 &&
    !file.path.startsWith("/") &&
    !file.path.split("/").includes("..") &&
    (file.status === "modified" ||
      file.status === "added" ||
      file.status === "deleted") &&
    (file.status === "deleted"
      ? file.content === null
      : typeof file.content === "string")
  );
}

export async function POST(request: NextRequest) {
  // 1. Validate session
  const session = await getSession();
  if (!session?.accessToken || !session.user) {
    return NextResponse.json(
      { error: "You are no longer authenticated with GitHub. Please sign in again." },
      { status: 401 },
    );
  }

  // 2. Parse body
  let body: CommitRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { owner, repo, branch, expectedHeadSha, message, files } = body;

  // 3. Validate input fields
  if (
    typeof owner !== "string" ||
    typeof repo !== "string" ||
    typeof branch !== "string" ||
    typeof expectedHeadSha !== "string" ||
    !owner ||
    !repo ||
    !branch ||
    !expectedHeadSha
  ) {
    return NextResponse.json(
      { error: "Missing required fields: owner, repo, branch, expectedHeadSha" },
      { status: 400 },
    );
  }
  if (!message || message.trim().length === 0) {
    return NextResponse.json({ error: "Commit message cannot be empty." }, { status: 400 });
  }
  if (!Array.isArray(files) || files.length === 0 || !files.every(isValidCommitFile)) {
    return NextResponse.json({ error: "No changed files to commit." }, { status: 400 });
  }

  // 4. Verify the user actually has access to this repository (security check)
  try {
    const { repositories } = await listInstallationRepositories(
      session.accessToken,
      session.installationId,
    );
    const hasAccess = repositories.some(
      (r) => r.ownerLogin === owner && r.name === repo,
    );
    if (!hasAccess) {
      // Also check via full repo list as fallback (OAuth App users)
      const allRepos = await listRepositories(session.accessToken);
      const fallbackAccess = allRepos.some(
        (r) => r.ownerLogin === owner && r.name === repo,
      );
      if (!fallbackAccess) {
        return NextResponse.json(
          { error: "Repository not found or access denied." },
          { status: 403 },
        );
      }
    }
  } catch (err) {
    console.error("Repository access check failed:", err);
    return NextResponse.json(
      { error: "Unable to verify repository access. Try again." },
      { status: 502 },
    );
  }

  // 5. Perform the commit
  const commitFiles: CommitFile[] = files.map((f) => ({
    path: f.path,
    content: f.content,
    status: f.status,
  }));

  try {
    const result = await createCommit(
      session.accessToken,
      owner,
      repo,
      branch,
      expectedHeadSha,
      message.trim(),
      commitFiles,
    );

    return NextResponse.json({
      ok: true,
      sha: result.sha,
      headSha: result.sha,
      message: result.message,
      shortSha: result.sha.substring(0, 7),
    });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };

    if (e.status === 409) {
      return NextResponse.json(
        {
          error: "conflict",
          message:
            "Repository changed on GitHub after you opened it. Refresh before committing.",
        },
        { status: 409 },
      );
    }
    if (e.status === 401 || e.status === 403) {
      return NextResponse.json(
        { error: "Forbidden — you do not have write access to this repository." },
        { status: 403 },
      );
    }
    if (e.status === 404) {
      return NextResponse.json(
        { error: "Repository or branch not found." },
        { status: 404 },
      );
    }
    if (e.status === 422) {
      return NextResponse.json(
        { error: "GitHub rejected this commit. Check the repository state and try again." },
        { status: 422 },
      );
    }

    console.error("Commit error:", err);
    return NextResponse.json(
      { error: "Unable to reach GitHub. Try again." },
      { status: 502 },
    );
  }
}

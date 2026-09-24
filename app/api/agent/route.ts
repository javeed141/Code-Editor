import { groq } from "@ai-sdk/groq";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";
import { createWorkspaceTools } from "@/src/lib/ai/tools";
import type { AIWorkspace } from "@/src/lib/ai/workspace";

const SYSTEM_PROMPT = `You are an AI coding assistant inside a browser-based GitHub editor.

Use listFiles when you need to discover files.
Use readFile before reasoning about a file's implementation or proposing changes.
Do not invent file contents.
Use writeFile only when the user requests a code change. It prepares a proposed update for review and does not modify files.
Stay inside the current repository/workspace and respect the current branch.
Never access unrelated server files, secrets, .env files, .git, node_modules, or .next.
Be concise and mention relevant file paths.`;

function isWorkspace(value: unknown): value is AIWorkspace {
  if (!value || typeof value !== "object") return false;
  const workspace = value as Partial<AIWorkspace>;
  return (
    typeof workspace.repository === "string" &&
    typeof workspace.branch === "string" &&
    (workspace.currentFile === null || typeof workspace.currentFile === "string") &&
    Array.isArray(workspace.files) &&
    workspace.files.every(
      (file) =>
        file &&
        typeof file.path === "string" &&
        typeof file.content === "string",
    )
  );
}

export async function POST(request: Request) {
  let body: { messages?: unknown; workspace?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || !isWorkspace(body.workspace)) {
    return NextResponse.json(
      { error: "A messages array and workspace context are required." },
      { status: 400 },
    );
  }

  try {
    const workspace = body.workspace;
    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: `${SYSTEM_PROMPT}

Repository: ${workspace.repository}
Branch: ${workspace.branch}
Current file: ${workspace.currentFile ?? "none"}`,
      messages: await convertToModelMessages(body.messages as UIMessage[]),
      tools: createWorkspaceTools(workspace),
      stopWhen: stepCountIs(8),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("AI agent request failed:", error);
    return NextResponse.json(
      { error: "The AI agent could not process this request." },
      { status: 500 },
    );
  }
}

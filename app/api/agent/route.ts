import { NextRequest, NextResponse } from "next/server";

type AgentMessage = { role: "user" | "assistant"; content: string };
type Workspace = {
  repository: string;
  branch: string;
  currentFile: string | null;
  files: Array<{
    path: string;
    content: string;
    language: string;
    isModified: boolean;
  }>;
};

function getResponseText(payload: {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}) {
  return (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text" && part.text)
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 503 },
    );
  }

  let body: { message?: string; history?: AgentMessage[]; workspace?: Workspace };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message || !body.workspace || !Array.isArray(body.workspace.files)) {
    return NextResponse.json(
      { error: "A message and workspace context are required." },
      { status: 400 },
    );
  }

  const workspace = body.workspace;
  const files = workspace.files
    .slice(0, 80)
    .map(
      (file) =>
        `FILE: ${file.path} [${file.language}]${file.isModified ? " [modified]" : ""}\n${file.content.slice(0, 8000)}`,
    )
    .join("\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions:
        "You are a coding assistant inside a browser-based GitHub editor. Use only the supplied local workspace. Do not claim to edit files, commit, push, or access GitHub. Mention relevant paths and be concise.",
      input: [
        ...(body.history ?? []).slice(-10),
        {
          role: "user",
          content: `Repository: ${workspace.repository}\nBranch: ${workspace.branch}\nCurrent file: ${workspace.currentFile ?? "none"}\n\nWorkspace:\n${files}\n\nRequest:\n${message}`,
        },
      ],
      max_output_tokens: 1200,
    }),
  });

  if (!response.ok) {
    console.error("OpenAI Responses API request failed:", await response.text());
    return NextResponse.json({ error: "The AI provider request failed." }, { status: 502 });
  }

  const data = (await response.json()) as {
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  const text = getResponseText(data);
  if (!text) {
    return NextResponse.json({ error: "The AI provider returned an empty response." }, { status: 502 });
  }

  // Gracefully ensure conversation session exists in Supabase if authenticated
  try {
    const { getCurrentUser } = await import("@/src/lib/auth-user");
    const { getOrCreateConversation } = await import("@/src/lib/supabase/db");
    const user = await getCurrentUser();
    if (user) {
      await getOrCreateConversation(user.id, workspace.repository, workspace.branch);
    }
  } catch (dbError) {
    console.warn("Could not sync conversation in Supabase:", dbError);
  }

  return NextResponse.json({ response: text });
}


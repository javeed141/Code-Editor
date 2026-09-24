"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  AlertCircle,
  Bot,
  ChevronRight,
  Circle,
  FileCode2,
  FolderGit2,
  Loader2,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { Separator } from "@/src/components/ui/separator";
import { Textarea } from "@/src/components/ui/textarea";
import { cn } from "@/src/lib/cn";

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

// Collapsible Thought block (Codex / Claude Code style)
function ThoughtItem({ thought, duration, isLive }: { thought?: string; duration?: number; isLive?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-1 text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-slate-400 hover:text-slate-300 transition-colors py-0.5 select-none"
      >
        {isLive && <Loader2 className="size-3 animate-spin text-cyan-400 mr-0.5" />}
        <span>{isLive ? `Thinking (${duration ?? 1}s)` : duration ? `Thought for ${duration}s` : "Thought"}</span>
        <ChevronRight className={cn("size-3 transition-transform text-slate-500", isOpen && "rotate-90")} />
      </button>
      {isOpen && thought && (
        <div className="mt-1 ml-2 pl-2.5 border-l-2 border-white/10 text-[11px] text-slate-400 font-sans italic whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
          {thought}
        </div>
      )}
    </div>
  );
}

// Tool action indicator (Codex / Claude Code style)
function ToolActionItem({
  toolName,
  args,
  result,
  isDone,
}: {
  toolName: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  isDone: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (toolName === "readFile") {
    const rawPath = String(args?.path || "");
    const filename = rawPath.split("/").pop() || "file";
    const content = typeof result?.content === "string" ? result.content : null;

    return (
      <div className="my-1.5 text-xs text-slate-400 select-none">
        <div className="flex items-center gap-1.5">
          {!isDone ? (
            <span className="flex items-center gap-1 text-cyan-300">
              <Loader2 className="size-3 animate-spin text-cyan-400" />
              <span>Reading</span>
            </span>
          ) : (
            <span>Analyzed</span>
          )}

          <button
            type="button"
            onClick={() => content && setIsOpen(!isOpen)}
            className={cn(
              "inline-flex items-center gap-1 rounded bg-[#1e2029] border border-white/10 px-2 py-0.5 text-[11px] font-mono text-slate-200 transition-colors",
              content ? "hover:border-cyan-400/40 hover:bg-[#252836] cursor-pointer" : "cursor-default",
            )}
            title={content ? "Click to view file content" : rawPath}
          >
            <FileCode2 className="size-3 text-cyan-400 shrink-0" />
            <span className="truncate max-w-[160px]">{filename}</span>
            {content && (
              <ChevronRight className={cn("size-2.5 text-slate-500 transition-transform", isOpen && "rotate-90")} />
            )}
          </button>

          {isDone ? (
            <span className="text-[10px] text-slate-500 font-mono">
              {content ? `${content.split("\n").length} lines` : ""}
            </span>
          ) : (
            <span className="text-[10px] text-cyan-400/70 font-mono animate-pulse">reading...</span>
          )}
        </div>

        {isOpen && content && (
          <div className="mt-1.5 ml-2 rounded-md border border-white/10 bg-[#0d0e15] p-2 text-[11px] font-mono text-slate-300">
            <div className="mb-1 text-[10px] text-slate-500 truncate">{rawPath}</div>
            <pre className="max-h-48 overflow-auto whitespace-pre rounded bg-black/40 p-2 text-[10px] text-slate-300 leading-relaxed">
              {content}
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (toolName === "listFiles") {
    const fileList = Array.isArray(result?.files) ? (result.files as Array<{ path: string }>) : null;
    return (
      <div className="my-1 text-xs select-none">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-300 transition-colors py-0.5"
        >
          <FolderGit2 className="size-3 text-fuchsia-400 mr-0.5 shrink-0" />
          <span>Explored {fileList !== null ? `${fileList.length} files` : "workspace files"}</span>
          <ChevronRight className={cn("size-3 transition-transform text-slate-500", isOpen && "rotate-90")} />
        </button>
        {isOpen && fileList && (
          <div className="mt-1 ml-3 max-h-36 overflow-y-auto space-y-0.5 pl-2 border-l border-white/10">
            {fileList.map((f, i) => (
              <div key={i} className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <span className="text-slate-600">•</span>
                <span className="truncate">{f.path}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (toolName === "writeFile") {
    const rawPath = String(args?.path || "");
    const filename = rawPath.split("/").pop() || "file";
    return (
      <div className="my-1 flex items-center gap-1.5 text-xs text-slate-400 select-none">
        <span>Edited</span>
        <span
          title={rawPath}
          className="inline-flex items-center gap-1 rounded bg-[#1e2029] border border-white/10 px-2 py-0.5 text-[11px] font-mono text-slate-200"
        >
          <FileCode2 className="size-3 text-emerald-400 shrink-0" />
          <span className="truncate max-w-[160px]">{filename}</span>
        </span>
        <span className="text-[10px] font-mono text-emerald-400">proposed</span>
      </div>
    );
  }

  return (
    <div className="my-1 text-xs text-slate-400 flex items-center gap-1">
      <span>Executed</span>
      <span className="font-mono text-[11px] text-slate-300">{toolName}</span>
      {!isDone && <Loader2 className="size-2.5 animate-spin text-cyan-400" />}
    </div>
  );
}

// Parse text that may contain <think>...</think> blocks
function parseTextAndThoughts(text: string) {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  const parts: Array<{ type: "think" | "text"; content: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = thinkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index);
      if (before) parts.push({ type: "text", content: before });
    }
    parts.push({ type: "think", content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  const remaining = text.slice(lastIndex);
  const openThinkMatch = remaining.match(/<think>([\s\S]*)$/);
  if (openThinkMatch && openThinkMatch.index !== undefined) {
    const before = remaining.slice(0, openThinkMatch.index);
    if (before) parts.push({ type: "text", content: before });
    parts.push({ type: "think", content: openThinkMatch[1] });
  } else if (remaining) {
    parts.push({ type: "text", content: remaining });
  }

  return parts;
}

// Professional markdown formatter for Claude Code / Codex style output
function FormattedMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1.5 text-xs text-[var(--foreground)] font-sans">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1" />;
        }

        const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ");
        const content = isBullet ? trimmed.replace(/^[-*•]\s+/, "") : line;
        const rendered = renderInlineMarkdown(content);

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-1.5">
              <span className="text-slate-500 select-none text-[10px] mt-0.5">•</span>
              <div className="flex-1 leading-5">{rendered}</div>
            </div>
          );
        }

        return (
          <div key={lineIdx} className="leading-5">
            {rendered}
          </div>
        );
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  // Split by inline code: `code`
  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      const codeContent = part.slice(1, -1);
      return (
        <code
          key={i}
          className="mx-0.5 rounded bg-white/[0.08] border border-white/5 px-1.5 py-0.5 text-[11px] font-mono text-slate-200"
        >
          {codeContent}
        </code>
      );
    }

    // Split by bold: **bold**
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bPart, j) => {
      if (bPart.startsWith("**") && bPart.endsWith("**") && bPart.length >= 4) {
        return (
          <strong key={`${i}-${j}`} className="font-semibold text-white">
            {bPart.slice(2, -2)}
          </strong>
        );
      }
      return <span key={`${i}-${j}`}>{bPart}</span>;
    });
  });
}

// Assistant message component with activities/thoughts separated at top
function AssistantMessageCard({
  parts,
  isWorking,
  thinkingSeconds,
}: {
  parts: Array<Record<string, unknown>>;
  isWorking: boolean;
  thinkingSeconds: number;
}) {
  const [stepsOpen, setStepsOpen] = useState(false);

  // Group all tool executions and thoughts
  const activitySteps: Array<{
    type: "tool" | "thought";
    toolName?: string;
    args?: Record<string, unknown>;
    result?: Record<string, unknown>;
    isDone?: boolean;
    thought?: string;
    duration?: number;
  }> = [];

  let finalText = "";

  for (const part of parts) {
    const type = String(part.type || "");

    // 1. Tool execution part
    if (type.startsWith("tool-") || type === "dynamic-tool" || type === "tool-invocation") {
      const toolName = type.startsWith("tool-")
        ? type.replace(/^tool-/, "")
        : String(part.toolName || (part.toolInvocation as any)?.toolName || "tool");
      const rawArgs = (part.args || (part.toolInvocation as any)?.args || part.input || {}) as Record<string, unknown>;
      const rawResult = (part.result || (part.toolInvocation as any)?.result || part.output) as Record<string, unknown> | undefined;
      const isDone = Boolean(rawResult !== undefined || part.state === "result" || part.state === "output-available");

      activitySteps.push({
        type: "tool",
        toolName,
        args: rawArgs,
        result: rawResult,
        isDone,
      });
      continue;
    }

    // 2. Reasoning part
    if (type === "reasoning") {
      const text = String(part.reasoning || part.text || "").trim();
      if (text) {
        activitySteps.push({
          type: "thought",
          thought: text,
        });
      }
      continue;
    }

    // 3. Text part with potential embedded <think> blocks
    if (type === "text") {
      const rawText = String(part.text || "");
      const parsed = parseTextAndThoughts(rawText);
      for (const item of parsed) {
        if (item.type === "think") {
          activitySteps.push({
            type: "thought",
            thought: item.content,
            duration: thinkingSeconds > 0 ? thinkingSeconds : undefined,
          });
        } else {
          finalText += item.content;
        }
      }
    }
  }

  const hasOnlyThought = activitySteps.length === 1 && activitySteps[0].type === "thought";
  const headerLabel = hasOnlyThought
    ? activitySteps[0].duration
      ? `Thought for ${activitySteps[0].duration}s`
      : "Thought"
    : `Worked for ${thinkingSeconds > 0 ? `${thinkingSeconds}s` : "a few seconds"}`;

  return (
    <div className="space-y-2">
      {/* SEPARATE AT TOP: All activities & thinking grouped cleanly */}
      {activitySteps.length > 0 && (
        <div className="border-b border-white/5 pb-2">
          <button
            type="button"
            onClick={() => setStepsOpen(!stepsOpen)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors select-none py-0.5"
          >
            {isWorking && activitySteps.some((s) => s.type === "tool" && !s.isDone) && (
              <Loader2 className="size-3 animate-spin text-cyan-400" />
            )}
            <span className="font-sans">{headerLabel}</span>
            <ChevronRight className={cn("size-3 text-slate-500 transition-transform", stepsOpen && "rotate-90")} />
          </button>

          {stepsOpen && (
            <div className="mt-2 ml-1 space-y-1.5 border-l border-white/10 pl-2.5">
              {activitySteps.map((step, idx) => {
                if (step.type === "tool" && step.toolName) {
                  return (
                    <ToolActionItem
                      key={`step-${idx}`}
                      toolName={step.toolName}
                      args={step.args}
                      result={step.result}
                      isDone={Boolean(step.isDone)}
                    />
                  );
                }
                if (step.type === "thought" && step.thought) {
                  return (
                    <ThoughtItem
                      key={`step-${idx}`}
                      thought={step.thought}
                      duration={step.duration}
                    />
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      )}

      {/* Clean final response text below */}
      {finalText ? (
        <div>
          <FormattedMarkdown text={finalText} />
          {isWorking && (
            <span className="inline-block w-1.5 h-3 ml-0.5 bg-fuchsia-400 animate-pulse align-middle" />
          )}
        </div>
      ) : null}

      {/* Active loading spinner below activity while model is working and no final text yet */}
      {isWorking && !finalText && (
        <div className="flex items-center gap-2 pt-1 text-xs text-slate-400 select-none">
          <Loader2 className="size-3.5 animate-spin text-cyan-400" />
          <span className="text-[11px] font-sans">Thinking & preparing response…</span>
        </div>
      )}
    </div>
  );
}

export default function ChatPanel({ workspace }: { workspace: Workspace }) {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const workspaceRef = useRef(workspace);
  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",
        body: () => ({ workspace: workspaceRef.current }),
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });
  const isStreaming = status === "streaming";
  const isSubmitted = status === "submitted";
  const isLoading = isSubmitted || isStreaming;

  useEffect(() => {
    if (isSubmitted) {
      setThinkingSeconds(1);
      thinkingTimerRef.current = setInterval(() => {
        setThinkingSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }
    }
    return () => {
      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current);
      }
    };
  }, [isSubmitted]);

  const statusLabel =
    error
      ? "Error"
      : isSubmitted
      ? "Thinking"
      : isStreaming
      ? "Streaming"
      : "Ready";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isLoading) return;

    setInput("");
    await sendMessage({ text: message });
  }

  useEffect(() => {
    if (messages.length === 0 && !isLoading) return;
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, status, isLoading]);

  return (
    <aside className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[var(--border-color)] bg-[#12131a] p-2 max-[800px]:hidden select-none">
      <div className="pointer-events-none absolute -right-24 -top-20 h-52 w-52 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-24 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />
      <Card className="relative flex min-h-0 flex-1 flex-col border-0 bg-transparent shadow-none">
        <CardHeader className="flex h-9 shrink-0 flex-row items-center gap-2 bg-transparent p-1">
          <Avatar className="size-6 rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-white">
            <AvatarFallback>
              <Bot aria-hidden="true" className="size-3.5" />
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            AI Assistant
          </CardTitle>
          <Badge
            variant="outline"
            className={`ml-auto gap-1 px-1.5 py-0 text-[10px] ${
              error
                ? "border-rose-400/30 text-rose-300"
                : isLoading
                ? "border-fuchsia-400/30 text-fuchsia-300"
                : "border-emerald-400/30 text-emerald-300"
            }`}
          >
            {error ? (
              <AlertCircle aria-hidden="true" className="size-2.5" />
            ) : isLoading ? (
              <Loader2 aria-hidden="true" className="size-2.5 animate-spin" />
            ) : (
              <Circle aria-hidden="true" className="size-1.5 fill-current" />
            )}
            {statusLabel}
          </Badge>
        </CardHeader>
        <Separator className="mt-2 bg-white/10" />

        <ScrollArea ref={scrollAreaRef} className="flex-1 space-y-4 p-1 pt-3">
          {messages.length === 0 && (
            <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white">
                <Sparkles className="size-3.5 text-fuchsia-300" />
                Ready to help
              </div>
              <p className="text-[11px] leading-5 text-slate-400">
                Ask about the open file, your workspace, or a coding problem.
              </p>
            </div>
          )}
          {messages.map((message, msgIndex) => {
            const isLastMessage = msgIndex === messages.length - 1;
            const isWorking = isLoading && isLastMessage && message.role === "assistant";

            return (
              <div
                key={message.id}
                className={`mb-3.5 flex items-start gap-2 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <Avatar
                  className={`size-6 rounded-lg text-xs font-semibold ${
                    message.role === "user"
                      ? "bg-cyan-400/20 text-cyan-300"
                      : "bg-fuchsia-400/20 text-fuchsia-300"
                  }`}
                >
                  <AvatarFallback>
                    {message.role === "user" ? (
                      <User aria-hidden="true" className="size-3.5" />
                    ) : (
                      <Bot aria-hidden="true" className="size-3.5" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`min-w-0 max-w-[85%] space-y-1.5 rounded-xl px-3 py-2.5 ${
                    message.role === "user"
                      ? "rounded-tr-sm bg-cyan-400/15"
                      : "rounded-tl-sm bg-white/[0.06]"
                  }`}
                >
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {message.role === "user" ? "You" : "Copilot"}
                  </p>

                  {message.role === "user" ? (
                    <div className="whitespace-pre-wrap break-words font-sans text-xs leading-5 text-[var(--foreground)]">
                      {message.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
                    </div>
                  ) : (
                    <AssistantMessageCard
                      parts={message.parts as Array<Record<string, unknown>>}
                      isWorking={Boolean(isWorking)}
                      thinkingSeconds={thinkingSeconds}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Active Thinking state before assistant message begins */}
          {isSubmitted && messages.length > 0 && messages[messages.length - 1].role !== "assistant" && (
            <div className="mb-3.5 flex items-start gap-2" role="status" aria-live="polite">
              <Avatar className="size-6 rounded-lg bg-fuchsia-400/20 text-fuchsia-300">
                <AvatarFallback>
                  <Bot aria-hidden="true" className="size-3.5" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 rounded-xl rounded-tl-sm bg-white/[0.06] px-3 py-2">
                <ThoughtItem isLive duration={thinkingSeconds} />
              </div>
            </div>
          )}

          {error && (
            <div
              className="mb-3 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-[11px] leading-4 text-rose-200"
              role="alert"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-300" />
              <span>{error.message || "The AI request failed. Please try again."}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </ScrollArea>

        <Separator className="mb-2 bg-white/10" />
        <CardContent className="p-1">
          <form
            onSubmit={handleSubmit}
            className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-2 focus-within:border-cyan-300/50"
          >
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSubmit(event as unknown as FormEvent<HTMLFormElement>);
                }
              }}
              placeholder="Ask Copilot a question or type / for commands..."
              rows={3}
              aria-label="Ask the agent"
              className="border-0 bg-transparent px-1.5 py-1.5 focus:border-0 focus:ring-0"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--text-muted)]" role="status">
                {isLoading ? "Working on it…" : "Enter to send · Shift+Enter for new line"}
              </span>
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="h-8 gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-3 text-xs text-white shadow-lg shadow-fuchsia-500/10 hover:brightness-110 disabled:opacity-40"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 aria-hidden="true" className="size-3 animate-spin" />
                ) : (
                  <Send aria-hidden="true" className="size-3" />
                )}
                <span>Send</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </aside>
  );
}

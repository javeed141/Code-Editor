"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { marked } from "marked";
import {
  AlertCircle,
  Bot,
  ChevronRight,
  FileCode2,
  FolderGit2,
  Loader2,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
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

// Markdown Content Renderer
function MarkdownContent({ content }: { content: string }) {
  const html = useMemo(() => {
    try {
      return marked.parse(content, { breaks: true, gfm: true }) as string;
    } catch {
      return content;
    }
  }, [content]);

  return (
    <div
      className="prose prose-invert prose-xs max-w-none text-xs leading-relaxed text-[var(--foreground)] [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-white/20 [&_th]:p-1.5 [&_th]:bg-white/[0.04] [&_th]:text-left [&_td]:border [&_td]:border-white/10 [&_td]:p-1.5 [&_pre]:bg-black/50 [&_pre]:p-2.5 [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-white/10 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_code]:font-mono [&_code]:text-[11px] [&_code]:bg-white/[0.08] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-1.5 [&_p]:my-1.5 [&_h1]:text-sm [&_h1]:font-bold [&_h2]:text-xs [&_h2]:font-bold [&_h3]:text-xs [&_h3]:font-semibold"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// 1. Thought block: Thought for Xs > (Antigravity / Claude Code style)
function ThoughtItem({ thought, duration, isLive }: { thought?: string; duration?: number; isLive?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-1 select-none">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] px-2 py-0.5 text-xs text-slate-400 hover:text-slate-300 transition-colors"
      >
        {isLive && <Loader2 className="size-2.5 animate-spin text-cyan-400" />}
        <span>{isLive ? `Thinking (${duration ?? 1}s)` : duration ? `Thought for ${duration}s` : "Thought"}</span>
        <ChevronRight className={cn("size-3 text-slate-500 transition-transform", isOpen && "rotate-90")} />
      </button>
      {isOpen && thought && (
        <div className="mt-1.5 ml-2 border-l border-white/10 pl-3 text-xs text-slate-400 font-sans leading-relaxed whitespace-pre-wrap">
          {thought}
        </div>
      )}
    </div>
  );
}

// 2. Analyzed action: Analyzed ⚛ filename.tsx #L1-50
function AnalyzedActionItem({
  args,
  result,
  isDone,
}: {
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  isDone: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rawPath = String(args?.path || "");
  const filename = rawPath.split("/").pop() || "file";
  const content = typeof result?.content === "string" ? result.content : null;
  const lineCount = content ? content.split("\n").length : null;

  return (
    <div className="my-1 select-none text-xs text-slate-400 flex flex-col items-start">
      <div className="flex items-center gap-1.5">
        {!isDone ? (
          <span className="flex items-center gap-1 text-cyan-300">
            <Loader2 className="size-3 animate-spin text-cyan-400" />
            <span>Analyzing</span>
          </span>
        ) : (
          <span>Analyzed</span>
        )}

        <button
          type="button"
          onClick={() => content && setIsOpen(!isOpen)}
          className={cn(
            "inline-flex items-center gap-1 text-slate-300 hover:text-cyan-300 font-mono transition-colors",
            content ? "cursor-pointer hover:underline" : "cursor-default",
          )}
          title={rawPath}
        >
          <FileCode2 className="size-3 text-cyan-400 shrink-0" />
          <span>{filename}</span>
        </button>

        {lineCount && (
          <span className="text-slate-500 font-mono text-[11px]">#L1-{lineCount}</span>
        )}
      </div>

      {isOpen && content && (
        <div className="mt-1.5 ml-2 w-full max-w-full rounded bg-black/50 border border-white/10 p-2 text-xs font-mono text-slate-300">
          <div className="text-[10px] text-slate-500 mb-1 truncate">{rawPath}</div>
          <pre className="max-h-48 overflow-auto whitespace-pre text-[11px] text-slate-300 leading-relaxed scrollbar-thin">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

// 3. Explored action: Explored N files ›
function ExploredActionItem({
  result,
  isDone,
}: {
  result?: Record<string, unknown>;
  isDone: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const fileList = Array.isArray(result?.files) ? (result.files as Array<{ path: string }>) : null;

  return (
    <div className="my-1 select-none text-xs text-slate-400">
      <button
        type="button"
        onClick={() => fileList && setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-300 transition-colors py-0.5"
      >
        {!isDone ? (
          <Loader2 className="size-3 animate-spin text-fuchsia-400 mr-0.5" />
        ) : (
          <FolderGit2 className="size-3 text-fuchsia-400 mr-0.5 shrink-0" />
        )}
        <span>Explored {fileList !== null ? `${fileList.length} files` : "workspace files"}</span>
        <ChevronRight className={cn("size-3 text-slate-500 transition-transform", isOpen && "rotate-90")} />
      </button>

      {isOpen && fileList && (
        <div className="mt-1 ml-2 max-h-36 overflow-y-auto space-y-0.5 border-l border-white/10 pl-2.5">
          {fileList.map((f, i) => (
            <div key={i} className="text-[11px] font-mono text-slate-400 truncate">
              {f.path}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 4. Edited action: Edited ⚛ filename.tsx +proposed
function EditedActionItem({ args }: { args?: Record<string, unknown> }) {
  const rawPath = String(args?.path || "");
  const filename = rawPath.split("/").pop() || "file";

  return (
    <div className="my-1 select-none text-xs text-slate-400 flex items-center gap-1.5">
      <span>Edited</span>
      <span className="inline-flex items-center gap-1 text-slate-300 font-mono" title={rawPath}>
        <FileCode2 className="size-3 text-emerald-400 shrink-0" />
        <span>{filename}</span>
      </span>
      <span className="text-[11px] font-mono text-emerald-400">+proposed</span>
    </div>
  );
}

// Parse text chunks for sequential <think> tags
function parseTextAndThoughts(text: string) {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  const parts: Array<{ type: "think" | "text"; content: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = thinkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index);
      if (before.trim()) parts.push({ type: "text", content: before });
    }
    const thinkContent = match[1].trim();
    if (thinkContent) {
      parts.push({ type: "think", content: thinkContent });
    }
    lastIndex = match.index + match[0].length;
  }

  const remaining = text.slice(lastIndex);
  const openThinkMatch = remaining.match(/<think>([\s\S]*)$/i);
  if (openThinkMatch && openThinkMatch.index !== undefined) {
    const before = remaining.slice(0, openThinkMatch.index);
    if (before.trim()) parts.push({ type: "text", content: before });
    const unclosedThink = openThinkMatch[1].trim();
    if (unclosedThink) {
      parts.push({ type: "think", content: unclosedThink });
    }
  } else if (remaining) {
    parts.push({ type: "text", content: remaining });
  }

  return parts;
}

// Assistant message rendering: exactly in chronological step sequence (Antigravity / Claude Code style)
function AssistantMessageTimeline({
  parts,
  isWorking,
  thinkingSeconds,
}: {
  parts: Array<Record<string, unknown>>;
  isWorking: boolean;
  thinkingSeconds: number;
}) {
  return (
    <div className="space-y-1.5 text-xs">
      {parts.map((part, index) => {
        const p = part as Record<string, unknown>;
        const type = String(p.type || "");

        // Tool call part
        if (type.startsWith("tool-") || type === "dynamic-tool" || type === "tool-invocation") {
          const toolName = type.startsWith("tool-")
            ? type.replace(/^tool-/, "")
            : String(p.toolName || (p.toolInvocation as any)?.toolName || "tool");
          const rawArgs = (p.args || (p.toolInvocation as any)?.args || p.input || {}) as Record<string, unknown>;
          const rawResult = (p.result || (p.toolInvocation as any)?.result || p.output) as Record<string, unknown> | undefined;
          const isDone = Boolean(rawResult !== undefined || p.state === "result" || p.state === "output-available");

          if (toolName === "readFile") {
            return <AnalyzedActionItem key={`part-${index}`} args={rawArgs} result={rawResult} isDone={isDone} />;
          }
          if (toolName === "listFiles") {
            return <ExploredActionItem key={`part-${index}`} result={rawResult} isDone={isDone} />;
          }
          if (toolName === "writeFile") {
            return <EditedActionItem key={`part-${index}`} args={rawArgs} />;
          }
          return (
            <div key={`part-${index}`} className="my-1 text-xs text-slate-400 flex items-center gap-1 font-mono">
              <span>Executed</span>
              <span className="text-slate-200">{toolName}</span>
              {!isDone && <Loader2 className="size-2.5 animate-spin text-cyan-400" />}
            </div>
          );
        }

        // Reasoning part
        if (type === "reasoning") {
          const text = String(p.reasoning || p.text || "").trim();
          if (!text) return null;
          return <ThoughtItem key={`part-${index}`} thought={text} duration={thinkingSeconds > 0 ? thinkingSeconds : undefined} />;
        }

        // Text part (which may contain embedded <think> tags)
        if (type === "text") {
          const rawText = String(p.text || "");
          const parsed = parseTextAndThoughts(rawText);

          return (
            <div key={`part-${index}`} className="space-y-1.5">
              {parsed.map((item, subIndex) => {
                if (item.type === "think" && item.content.trim()) {
                  return (
                    <ThoughtItem
                      key={`think-${subIndex}`}
                      thought={item.content.trim()}
                      duration={subIndex === 0 && thinkingSeconds > 0 ? thinkingSeconds : undefined}
                    />
                  );
                }
                if (item.type === "text" && item.content.trim()) {
                  return <MarkdownContent key={`text-${subIndex}`} content={item.content} />;
                }
                return null;
              })}
            </div>
          );
        }

        return null;
      })}

      {/* Live spinner at the end of message if actively working */}
      {isWorking && (
        <div className="flex items-center gap-2 pt-1 text-xs text-slate-400 select-none">
          <Loader2 className="size-3 animate-spin text-cyan-400" />
          <span className="text-[11px] font-sans">Thinking ({thinkingSeconds}s)...</span>
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
        <ScrollArea ref={scrollAreaRef} className="flex-1 space-y-4 p-1 pt-2">
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
                className={`mb-4 flex items-start gap-2.5 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <Avatar
                  className={`size-6 shrink-0 rounded-lg text-xs font-semibold ${
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
                  className={cn(
                    "min-w-0 max-w-[88%]",
                    message.role === "user"
                      ? "rounded-xl rounded-tr-sm bg-cyan-400/15 px-3 py-2 text-xs text-[var(--foreground)]"
                      : "space-y-1.5 text-xs text-[var(--foreground)]",
                  )}
                >
                  {message.role === "user" ? (
                    <div className="whitespace-pre-wrap break-words font-sans text-xs leading-5">
                      {message.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
                    </div>
                  ) : (
                    <AssistantMessageTimeline
                      parts={message.parts as Array<Record<string, unknown>>}
                      isWorking={Boolean(isWorking)}
                      thinkingSeconds={thinkingSeconds}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Live Thinking Pill before assistant response begins */}
          {isSubmitted && messages.length > 0 && messages[messages.length - 1].role !== "assistant" && (
            <div className="mb-4 flex items-start gap-2.5" role="status" aria-live="polite">
              <Avatar className="size-6 shrink-0 rounded-lg bg-fuchsia-400/20 text-fuchsia-300">
                <AvatarFallback>
                  <Bot aria-hidden="true" className="size-3.5" />
                </AvatarFallback>
              </Avatar>
              <div className="inline-flex items-center gap-1.5 rounded bg-white/[0.04] px-2 py-0.5 text-xs text-slate-400 select-none">
                <Loader2 className="size-2.5 animate-spin text-cyan-400" />
                <span>Thinking ({thinkingSeconds}s)</span>
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

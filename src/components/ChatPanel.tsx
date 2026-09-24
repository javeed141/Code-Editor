"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AlertCircle, Bot, Circle, Loader2, Send, Sparkles, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { Separator } from "@/src/components/ui/separator";
import { Textarea } from "@/src/components/ui/textarea";

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

export default function ChatPanel({ workspace }: { workspace: Workspace }) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep the latest workspace in a ref so the transport closure always reads
  // the current value without needing to be recreated on every render.
  const workspaceRef = useRef(workspace);
  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  // The transport is created once. It reads workspace from the ref at request
  // time, so it always sends the current workspace without causing re-renders.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",
        body: () => ({ workspace: workspaceRef.current }),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });
  const isLoading = status === "submitted" || status === "streaming";
  const statusLabel =
    error
      ? "Error"
      : status === "submitted"
      ? "Thinking"
      : status === "streaming"
      ? "Streaming"
      : "Ready";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isLoading) return;

    setInput("");
    await sendMessage({ text: message });
  }

  // Keep the scroll position pinned to the bottom while streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

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

        <ScrollArea className="flex-1 space-y-4 p-1 pt-3">
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
          {messages.map((message) => (
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
                className={`min-w-0 max-w-[85%] space-y-1 rounded-xl px-3 py-2 ${
                  message.role === "user"
                    ? "rounded-tr-sm bg-cyan-400/15"
                    : "rounded-tl-sm bg-white/[0.06]"
                }`}
              >
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {message.role === "user" ? "You" : "Copilot"}
                </p>
                <p className="break-words text-xs leading-5 text-[var(--foreground)]">
                  {message.parts.map((part, index) =>
                    part.type === "text" ? <span key={index}>{part.text}</span> : null,
                  )}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="mb-3.5 flex items-center gap-2" role="status" aria-live="polite">
              <Avatar className="size-6 rounded-lg bg-fuchsia-400/20 text-fuchsia-300">
                <AvatarFallback>
                  <Bot aria-hidden="true" className="size-3.5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 rounded-xl rounded-tl-sm bg-white/[0.06] px-3 py-2 text-[11px] text-slate-400">
                <Loader2 className="size-3.5 animate-spin text-cyan-300" />
                <span>
                  {status === "submitted" ? "Thinking…" : "Streaming response…"}
                </span>
                <span className="flex gap-0.5" aria-hidden="true">
                  <span className="size-1 animate-pulse rounded-full bg-fuchsia-300" />
                  <span className="size-1 animate-pulse rounded-full bg-fuchsia-300 [animation-delay:150ms]" />
                  <span className="size-1 animate-pulse rounded-full bg-fuchsia-300 [animation-delay:300ms]" />
                </span>
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

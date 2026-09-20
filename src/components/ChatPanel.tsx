"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bot, Circle, Send } from "lucide-react";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { Separator } from "@/src/components/ui/separator";
import { Textarea } from "@/src/components/ui/textarea";

type ChatMessage = {
  id: string | number;
  role: "user" | "assistant";
  content: string;
};

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

const DEFAULT_WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hello! I am your AI assistant. How can I help you with this project?",
};

export default function ChatPanel({ workspace }: { workspace: Workspace }) {
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content: "Hello! I am your AI assistant. How can I help you with this project?",
    },
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isLoading) return;

    const id = Date.now();
    setInput("");
    setMessages((current) => [...current, { id, role: "user", content: message }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          workspace,
          history: messages.slice(-10).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = (await response.json()) as { response?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "The AI request failed.");
      setMessages((current) => [
        ...current,
        { id: id + 1, role: "assistant", content: data.response || "No response was returned." },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: id + 1,
          role: "assistant",
          content: error instanceof Error ? error.message : "The AI request failed.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-[var(--border-color)] bg-[var(--sidebar-bg)] p-2 max-[800px]:hidden select-none">
      <Card className="flex min-h-0 flex-1 flex-col border-0 bg-transparent shadow-none">
        <CardHeader className="flex h-9 shrink-0 flex-row items-center gap-2 bg-transparent p-1">
          <Avatar className="size-6 rounded-[3px] bg-[#007acc] text-white">
            <AvatarFallback>
              <Bot aria-hidden="true" className="size-3.5" />
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            AI Assistant
          </CardTitle>
          <Badge
            variant="outline"
            className="ml-auto gap-1 border-[#007acc]/30 px-1.5 py-0 text-[10px] text-[#007acc] dark:text-[#38bdf8]"
          >
            <Circle aria-hidden="true" className="size-1.5 fill-current" />
            Ready
          </Badge>
        </CardHeader>
        <Separator className="mt-2" />

        <ScrollArea className="flex-1 space-y-4 p-1 pt-3">
          {messages.map((message) => (
            <div key={message.id} className="mb-3.5 flex gap-2">
              <Avatar
                className={`size-6 rounded-[3px] text-xs font-semibold ${
                  message.role === "user"
                    ? "bg-[#007acc] text-white"
                    : "bg-[rgba(128,128,128,0.25)] text-[var(--foreground)]"
                }`}
              >
                <AvatarFallback>{message.role === "user" ? "U" : "AI"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {message.role === "user" ? "You" : "Copilot"}
                  </p>
                </div>
                <p className="text-xs leading-5 text-[var(--foreground)] break-words">
                  {message.content}
                </p>
              </div>
            </div>
          ))}
        </ScrollArea>

        <Separator className="mb-2" />
        <CardContent className="p-1">
          <form onSubmit={handleSubmit} className="space-y-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Copilot a question or type / for commands..."
              rows={3}
              aria-label="Ask the agent"
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--text-muted)]">
                {isLoading ? "Thinking..." : "Press Enter to send"}
              </span>
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-[#0e639c] text-white hover:bg-[#1177bb]"
                aria-label="Send message"
              >
                <Send aria-hidden="true" className="size-3" />
                <span>Send</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </aside>
  );
}

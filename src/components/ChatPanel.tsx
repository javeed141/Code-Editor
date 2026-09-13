"use client";

import { FormEvent, useState } from "react";
import { Bot, Circle, Send } from "lucide-react";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { Separator } from "@/src/components/ui/separator";
import { Textarea } from "@/src/components/ui/textarea";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

export default function ChatPanel() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content: "I am ready to help you explore this project.",
    },
  ]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;

    const id = Date.now();
    setMessages((current) => [
      ...current,
      { id, role: "user", content: message },
      {
        id: id + 1,
        role: "assistant",
        content: "The AI agent will be connected in a future day.",
      },
    ]);
    setInput("");
  }

  return (
    <aside className="flex min-h-0 flex-col border-l border-slate-800/90 bg-[#101318] p-2 max-[800px]:hidden">
      <Card className="flex min-h-0 flex-1 flex-col border-0 bg-transparent shadow-none">
        <CardHeader className="flex h-9 shrink-0 flex-row items-center gap-2 p-1">
          <Avatar className="size-6 rounded-md bg-blue-500/15 text-blue-300">
            <AvatarFallback><Bot aria-hidden="true" className="size-3.5" /></AvatarFallback>
          </Avatar>
          <CardTitle className="text-[10px] uppercase tracking-[0.14em] text-slate-400">AI Assistant</CardTitle>
          <Badge variant="outline" className="ml-auto gap-1 border-blue-400/25 px-1.5 py-0 text-[9px] text-blue-300">
          <Circle aria-hidden="true" className="size-1.5 fill-blue-400 text-blue-400" />
          Ready
          </Badge>
        </CardHeader>
        <Separator className="mt-2" />

      <ScrollArea className="flex-1 space-y-4 p-1 pt-3">
        {messages.map((message) => (
          <div key={message.id} className="mb-4 flex gap-2">
            <Avatar className={message.role === "user" ? "bg-blue-500/15 text-blue-300" : "bg-slate-700/60 text-slate-300"}>
              <AvatarFallback>{message.role === "user" ? "U" : "AI"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{message.role === "user" ? "You" : "Assistant"}</p>
              </div>
              <p className="text-xs leading-5 text-slate-300">{message.content}</p>
            </div>
          </div>
        ))}
      </ScrollArea>

        <Separator className="mb-3" />
        <CardContent className="p-1">
          <form onSubmit={handleSubmit} className="space-y-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask the agent..."
              rows={3}
              aria-label="Ask the agent"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-600">Mock AI · Enter to send</span>
              <Button
                type="submit"
                disabled={!input.trim()}
                className="bg-blue-500 text-white hover:bg-blue-400"
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

"use client";

import { FormEvent, useState } from "react";

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
    <aside className="flex min-h-0 flex-col border-l border-white/[0.08] bg-[#111419]">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.06] px-4">
        <span className="flex size-6 items-center justify-center rounded-md bg-violet-400/10 text-violet-300">
          <svg aria-hidden="true" className="size-3.5" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v4M12 17v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M3 12h4M17 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </span>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          AI Agent
        </h2>
        <span className="ml-auto rounded-full border border-violet-300/20 px-2 py-0.5 text-[10px] text-violet-300/80">
          Preview
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-2.5 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold ${
              message.role === "user"
                ? "bg-cyan-400/15 text-cyan-300"
                : "bg-violet-400/15 text-violet-300"
            }`}>
              {message.role === "user" ? "You" : "AI"}
            </div>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-5 ${
              message.role === "user"
                ? "bg-cyan-400/10 text-cyan-50"
                : "border border-white/[0.06] bg-white/[0.03] text-slate-400"
            }`}>
              {message.content}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/[0.06] p-3">
        <form onSubmit={handleSubmit} className="rounded-lg border border-white/10 bg-[#0d0f12] p-2 focus-within:border-violet-300/40">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about this project..."
            rows={2}
            className="w-full resize-none bg-transparent px-1 text-xs leading-5 text-slate-200 outline-none placeholder:text-slate-600"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-600">Local placeholder</span>
            <button
              type="submit"
              disabled={!input.trim()}
              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-violet-300 px-2.5 text-[11px] font-semibold text-slate-950 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
              <svg aria-hidden="true" className="size-3" viewBox="0 0 16 16" fill="none">
                <path d="m3 8 9-4-2.5 8-2-3-4.5-1Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}

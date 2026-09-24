'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  AlertCircle,
  Bot,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  User,
} from 'lucide-react';

const CHAT_API = '/api/test-chat';

export default function TestChatPage() {
  const [input, setInput] = useState('');

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: CHAT_API,
    }),
  });

  const isSubmitted = status === 'submitted';
  const isStreaming = status === 'streaming';
  const isBusy = isSubmitted || isStreaming;

  const statusLabel = {
    ready: 'Ready',
    submitted: 'Thinking',
    streaming: 'Streaming',
    error: 'Error',
  }[status];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const message = input.trim();

    if (!message || isBusy) return;

    sendMessage({ text: message });
    setInput('');
  };

  return (
    <main className="min-h-screen bg-[#12131a] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-8">

        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <MessageSquare className="h-5 w-5 text-cyan-300" />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-cyan-300">
                Groq Playground
              </p>

              <h1 className="text-xl font-semibold text-white sm:text-2xl">
                Test Chat
              </h1>
            </div>
          </div>

          {/* Connection status */}
          <StatusIndicator
            status={status}
            label={statusLabel}
          />
        </header>

        {/* Chat Container */}
        <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">

          {/* Chat header */}
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <Sparkles className="h-4 w-4 text-cyan-300" />

            <span className="text-sm text-slate-300">
              Chat with Groq
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6">

            {/* Empty state */}
            {messages.length === 0 && (
              <EmptyState />
            )}

            {/* Messages */}
            {messages.map((message) => {
              const isUser = message.role === 'user';

              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${
                    isUser ? 'flex-row-reverse' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isUser
                        ? 'bg-cyan-400/10 text-cyan-300'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {isUser ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>

                  {/* Message */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      isUser
                        ? 'rounded-tr-md bg-cyan-400/10 text-cyan-50'
                        : 'rounded-tl-md bg-white/[0.06] text-slate-200'
                    }`}
                  >
                    {message.parts.map((part, index) => {
                      if (part.type !== 'text') return null;

                      return (
                        <span
                          key={index}
                          className="whitespace-pre-wrap"
                        >
                          {part.text}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* AI status */}
            {isBusy && (
              <div
                className="flex items-center gap-3"
                role="status"
                aria-live="polite"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-slate-300">
                  <Bot className="h-4 w-4" />
                </div>

                <div className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-white/[0.06] px-4 py-3 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />

                  <span>
                    {isSubmitted
                      ? 'Groq is thinking...'
                      : 'Groq is streaming...'}
                  </span>

                  <TypingDots />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                <div>
                  <p className="font-medium">
                    Something went wrong
                  </p>

                  <p className="mt-1 text-red-200/70">
                    Unable to get a response from Groq.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-white/10 p-3"
          >
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2 focus-within:border-cyan-300/40">
              <label
                htmlFor="chat-input"
                className="sr-only"
              >
                Message Groq
              </label>

              <input
                id="chat-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask something..."
                disabled={isBusy}
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!input.trim() || isBusy}
                className="flex h-10 items-center gap-2 rounded-lg bg-cyan-500 px-4 text-sm font-medium text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />

                <span className="hidden sm:inline">
                  Send
                </span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

/* ---------------------------------------------
   Empty State
--------------------------------------------- */

function EmptyState() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10">
        <Bot className="h-8 w-8 text-cyan-300" />
      </div>

      <h2 className="text-xl font-semibold text-white">
        Ready when you are
      </h2>

      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
        Send a message to start chatting with Groq.
      </p>
    </div>
  );
}

/* ---------------------------------------------
   Status Indicator
--------------------------------------------- */

function StatusIndicator({
  status,
  label,
}: {
  status: 'ready' | 'submitted' | 'streaming' | 'error';
  label: string;
}) {
  const isActive =
    status === 'submitted' || status === 'streaming';

  const indicatorColor = {
    ready: 'bg-emerald-400',
    submitted: 'bg-yellow-400',
    streaming: 'bg-cyan-400',
    error: 'bg-red-400',
  }[status];

  return (
    <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 sm:flex">
      <span
        className={`h-2 w-2 rounded-full ${indicatorColor} ${
          isActive ? 'animate-pulse' : ''
        }`}
      />

      <span>{label}</span>
    </div>
  );
}

/* ---------------------------------------------
   Typing Dots
--------------------------------------------- */

function TypingDots() {
  return (
    <span className="flex gap-1" aria-hidden="true">
      <span className="h-1 w-1 animate-pulse rounded-full bg-slate-400" />
      <span className="h-1 w-1 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" />
      <span className="h-1 w-1 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" />
    </span>
  );
}
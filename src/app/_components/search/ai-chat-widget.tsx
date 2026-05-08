"use client";

import { FormEvent, useMemo, useState } from "react";

type ChatOption = {
  chatId: number;
  label: string;
};

type Props = {
  chatOptions: ChatOption[];
  selectedChatId: number | null;
};

type UiMessage = {
  role: "user" | "assistant";
  content: string;
};

export function AiChatWidget({ chatOptions, selectedChatId }: Props) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<string>("all");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      role: "assistant",
      content:
        "Я AI-помощник New Era AI Support Board. Задайте вопрос, и я отвечу на основе истории сообщений.",
    },
  ]);

  const resolvedScope = useMemo(() => {
    // "Selected Chat" автоматически откатывается в "all", если чат не выбран.
    if (scope !== "selected") return scope;
    return selectedChatId === null ? "all" : String(selectedChatId);
  }, [scope, selectedChatId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      // Передаем короткую историю (до 8 сообщений), чтобы не раздувать контекст запроса.
      const chatId =
        resolvedScope === "all" ? null : Number.isNaN(Number(resolvedScope)) ? null : Number(resolvedScope);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          chatId,
          history: nextMessages.slice(-8),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Chat request failed");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: payload.answer ?? "Пустой ответ." }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="ai-fab"
        aria-label="Open AI chat"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="ai-fab__core">AI</span>
      </button>

      {open && (
        <section className="ai-chat-panel panel">
          <header className="ai-chat-panel__head">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Assistant</p>
              <h3 className="text-lg font-semibold">New Era AI Support Board</h3>
            </div>
            <button type="button" className="tab-btn" onClick={() => setOpen(false)}>
              Close
            </button>
          </header>

          <div className="px-4 pb-3 pt-1">
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Scope</span>
              <select className="input" value={scope} onChange={(event) => setScope(event.target.value)}>
                <option value="all">All Chats</option>
                <option value="selected">Selected Chat</option>
                {chatOptions.map((item) => (
                  <option key={item.chatId} value={item.chatId}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="ai-chat-panel__body">
            {messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={`ai-msg ${message.role === "user" ? "ai-msg--user" : "ai-msg--assistant"}`}
              >
                {message.content}
              </article>
            ))}
            {loading && <article className="ai-msg ai-msg--assistant">Thinking...</article>}
          </div>

          <form onSubmit={onSubmit} className="ai-chat-panel__composer">
            <input
              className="input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Напишите запрос..."
            />
            <button className="action-btn" type="submit" disabled={loading}>
              Send
            </button>
          </form>

          {error && <p className="px-4 pb-3 text-sm text-red-700">{error}</p>}
        </section>
      )}
    </>
  );
}

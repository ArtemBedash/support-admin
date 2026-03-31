"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AiChatWidget } from "./ai-chat-widget";

type Message = {
  id: string;
  telegram_chat_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  text: string;
  created_at: string;
};

type SearchResult = Message & {
  similarity: number;
};

type Props = {
  messages: Message[];
  initialError: string | null;
};

type Conversation = {
  chatId: number;
  messages: Message[];
  head: Message;
  displayName: string;
};

type DialogPeriod = "all" | "24h" | "7d" | "30d";
type ThemeMode = "light" | "dark" | "modern-dark";

function formatCell(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return <span className="font-mono text-[var(--muted)]">NULL</span>;
  }
  return String(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function getDisplayName(message: Message) {
  const fullName = [message.first_name, message.last_name].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (message.username) return `@${message.username}`;
  return `Chat ${message.telegram_chat_id}`;
}

export function AdminConsole({ messages, initialError }: Props) {
  const [activeView, setActiveView] = useState<"dialogs" | "semantic">("dialogs");
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [dialogQuery, setDialogQuery] = useState("");
  const [dialogPeriod, setDialogPeriod] = useState<DialogPeriod>("all");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");

  const [query, setQuery] = useState("");
  const [searchChatId, setSearchChatId] = useState<string>("all");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  const conversations = useMemo<Conversation[]>(() => {
    const grouped = new Map<number, Message[]>();
    for (const message of messages) {
      const group = grouped.get(message.telegram_chat_id) ?? [];
      group.push(message);
      grouped.set(message.telegram_chat_id, group);
    }

    return Array.from(grouped.entries())
      .map(([chatId, groupMessages]) => {
        const sorted = [...groupMessages].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        const head = sorted[0];
        return {
          chatId,
          messages: sorted,
          head,
          displayName: getDisplayName(head),
        };
      })
      .sort((a, b) => new Date(b.head.created_at).getTime() - new Date(a.head.created_at).getTime());
  }, [messages]);

  const filteredConversations = useMemo(() => {
    const search = dialogQuery.trim().toLowerCase();
    const now = Date.now();
    const periodMs: Record<DialogPeriod, number | null> = {
      all: null,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    const cutoff = periodMs[dialogPeriod] === null ? null : now - periodMs[dialogPeriod];

    return conversations.filter((conversation) => {
      const periodMatch =
        cutoff === null ||
        conversation.messages.some((message) => new Date(message.created_at).getTime() >= cutoff);

      if (!periodMatch) return false;
      if (!search) return true;

      const haystack = [
        String(conversation.chatId),
        conversation.displayName,
        conversation.head.username ?? "",
        conversation.head.first_name ?? "",
        conversation.head.last_name ?? "",
        conversation.head.text ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [conversations, dialogPeriod, dialogQuery]);

  useEffect(() => {
    if (!filteredConversations.length) {
      setSelectedChatId(null);
      return;
    }

    if (
      selectedChatId === null ||
      !filteredConversations.some((conversation) => conversation.chatId === selectedChatId)
    ) {
      setSelectedChatId(filteredConversations[0].chatId);
    }
  }, [filteredConversations, selectedChatId]);

  const selectedConversation = useMemo(
    () => filteredConversations.find((conversation) => conversation.chatId === selectedChatId) ?? null,
    [filteredConversations, selectedChatId],
  );

  useEffect(() => {
    const saved = window.localStorage.getItem("admin_theme_mode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isSavedTheme = saved === "dark" || saved === "light" || saved === "modern-dark";
    const mode: ThemeMode = isSavedTheme ? saved : prefersDark ? "dark" : "light";
    setThemeMode(mode);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    window.localStorage.setItem("admin_theme_mode", themeMode);
  }, [themeMode]);

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchError("Введите запрос для поиска.");
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const chatId = searchChatId === "all" ? null : Number(searchChatId);
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmedQuery,
          chatId,
          limit: 10,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error ?? "Search failed");
      }

      setResults(payload.results ?? []);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <main className="admin-shell min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="panel mb-6 p-6 sm:p-8">
          <p className="text-xs tracking-[0.22em] text-[var(--muted)] uppercase">Support Admin</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            New Era AI Support Board
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">
           Админ-консоль поддержки с просмотром диалогов и семантическим поиском по эмбеддингам
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            <span className="chip">Сообщений: {messages.length}</span>
            <span className="chip">Пользователей: {conversations.length}</span>
          </div>
        </header>

        <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-fit gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1.5">
            <button
              type="button"
              onClick={() => setActiveView("dialogs")}
              className={`tab-btn ${activeView === "dialogs" ? "tab-btn--active" : ""}`}
            >
              Диалоги
            </button>
            <button
              type="button"
              onClick={() => setActiveView("semantic")}
              className={`tab-btn ${activeView === "semantic" ? "tab-btn--active" : ""}`}
            >
              Семантический поиск
            </button>
          </div>

          <div className="flex w-fit gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1.5">
            <button
              type="button"
              onClick={() => setThemeMode("light")}
              className={`tab-btn ${themeMode === "light" ? "tab-btn--active" : ""}`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setThemeMode("dark")}
              className={`tab-btn ${themeMode === "dark" ? "tab-btn--active" : ""}`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setThemeMode("modern-dark")}
              className={`tab-btn ${themeMode === "modern-dark" ? "tab-btn--active" : ""}`}
            >
              Modern Dark
            </button>
          </div>
        </section>

        {initialError && (
          <div className="panel mb-6 border-red-400/40 bg-red-200/30 p-4 text-red-900">{initialError}</div>
        )}

        {activeView === "dialogs" && (
          <section className="grid gap-5 lg:grid-cols-[340px_1fr]">
            <aside className="panel p-3 sm:p-4">
              <p className="mb-3 px-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Активные диалоги
              </p>
              <div className="space-y-3 px-1 pb-3">
                <input
                  value={dialogQuery}
                  onChange={(event) => setDialogQuery(event.target.value)}
                  placeholder="Поиск: user, username, chat_id"
                  className="input"
                />
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["all", "Все"],
                      ["24h", "24ч"],
                      ["7d", "7д"],
                      ["30d", "30д"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDialogPeriod(value)}
                      className={`tab-btn ${dialogPeriod === value ? "tab-btn--active" : ""}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-[72vh] space-y-2 overflow-auto pr-1">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.chatId}
                    type="button"
                    onClick={() => setSelectedChatId(conversation.chatId)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      selectedChatId === conversation.chatId
                        ? "border-[var(--accent)] bg-[var(--surface)]"
                        : "border-[var(--line)] bg-[var(--surface-soft)]/70 hover:bg-[var(--surface)]/80"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--text)]">{conversation.displayName}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">chat_id: {conversation.chatId}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
                      {conversation.head.text || "(без текста)"}
                    </p>
                  </button>
                ))}
                {!filteredConversations.length && (
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)]/70 px-3 py-4 text-sm text-[var(--muted)]">
                    Ничего не найдено по фильтрам.
                  </div>
                )}
              </div>
            </aside>

            <article className="panel overflow-hidden">
              {selectedConversation ? (
                <>
                  <div className="border-b border-[var(--line)] bg-[var(--surface)]/70 px-4 py-3 text-sm text-[var(--muted)] sm:px-6">
                    <span className="font-semibold text-[var(--text)]">user:</span>{" "}
                    {selectedConversation.displayName}
                    {" | "}
                    <span className="font-semibold text-[var(--text)]">chat_id:</span>{" "}
                    {selectedConversation.chatId}
                    {" | "}
                    <span className="font-semibold text-[var(--text)]">username:</span>{" "}
                    {formatCell(selectedConversation.head.username)}
                  </div>

                  <div className="max-h-[72vh] space-y-2 overflow-auto p-3 sm:p-4">
                    {selectedConversation.messages.map((message) => (
                      <div key={message.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)]/75 p-3">
                        <p className="mb-2 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                          {formatDate(message.created_at)}
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-6">{formatCell(message.text)}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-5 text-sm text-[var(--muted)]">Нет диалогов.</div>
              )}
            </article>
          </section>
        )}

        {activeView === "semantic" && (
          <section className="space-y-5">
            <form onSubmit={onSearch} className="panel p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-[1fr_260px_auto] sm:items-end">
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                    Запрос
                  </span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Например: кошка заболела"
                    className="input"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                    Область поиска
                  </span>
                  <select
                    value={searchChatId}
                    onChange={(e) => setSearchChatId(e.target.value)}
                    className="input"
                  >
                    <option value="all">Все чаты</option>
                    {conversations.map((conversation) => (
                      <option key={conversation.chatId} value={conversation.chatId}>
                        {conversation.displayName} · {conversation.chatId}
                      </option>
                    ))}
                  </select>
                </label>

                <button type="submit" className="action-btn" disabled={searching}>
                  {searching ? "Поиск..." : "Найти"}
                </button>
              </div>
              {searchError && <p className="mt-3 text-sm text-red-900">{searchError}</p>}
            </form>

            <div className="space-y-3">
              {results.map((item) => (
                <article key={item.id} className="panel p-4 sm:p-5">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                    <span>user: {getDisplayName(item)}</span>
                    <span>chat_id: {item.telegram_chat_id}</span>
                    <span>score: {item.similarity.toFixed(3)}</span>
                  </div>
                  <p className="text-sm leading-6">{item.text}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">{formatDate(item.created_at)}</p>
                </article>
              ))}

              {!results.length && (
                <div className="panel p-5 text-sm text-[var(--muted)]">
                  Выполните запрос, чтобы увидеть ближайшие сообщения.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
      <AiChatWidget
        selectedChatId={selectedChatId}
        chatOptions={conversations.map((conversation) => ({
          chatId: conversation.chatId,
          label: `${conversation.displayName} · ${conversation.chatId}`,
        }))}
      />
    </main>
  );
}

"use client";

import { FormEvent, useState } from "react";

type SearchResult = {
  id: string;
  dialog_id: string;
  telegram_chat_id: number;
  text: string;
  created_at: string;
  similarity: number;
};

type ChatOption = {
  chatId: number;
  label: string;
};

type Props = {
  chatOptions: ChatOption[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function SemanticSearchView({ chatOptions }: Props) {
  const [query, setQuery] = useState("");
  const [searchChatId, setSearchChatId] = useState<string>("all");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

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
        body: JSON.stringify({ query: trimmedQuery, chatId, limit: 10 }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? "Search failed");

      setResults(payload.results ?? []);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  return (
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
              {chatOptions.map((option) => (
                <option key={option.chatId} value={option.chatId}>
                  {option.label}
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
  );
}

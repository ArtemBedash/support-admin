"use client";

import { useEffect, useMemo, useState } from "react";
import { AiChatWidget } from "./ai-chat-widget";
import { DialogsView } from "./dialogs-view";
import { SemanticSearchView } from "./semantic-search-view";
import { SignOutButton } from "./sign-out-button";
import { useTheme } from "../_hooks/use-theme";
import { createClient as createSupabaseClient } from "@/lib/supabase";
import type { Message } from "../_types/message";

type Props = {
  messages: Message[];
  initialError: string | null;
};

export function AdminConsole({ messages, initialError }: Props) {
  const [activeView, setActiveView] = useState<"dialogs" | "semantic">("dialogs");

  // selectedChatId живёт здесь — нужен и DialogsView и AiChatWidget одновременно.
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);

  // liveMessages — начинаем с SSR-данных, пополняем через Realtime.
  const [liveMessages, setLiveMessages] = useState<Message[]>(messages);

  const { themeMode, setThemeMode } = useTheme();

  // Подписка на новые сообщения через Supabase Realtime.
  // Когда в таблице messages появляется новая строка — подгружаем её с JOIN и добавляем в стейт.
  // Подписка на новые сообщения через Supabase Realtime.
  useEffect(() => {
    // createBrowserClient из @supabase/ssr — singleton, повторные вызовы возвращают тот же экземпляр.
    const supabase = createSupabaseClient();
    const channel = supabase
      .channel("messages:new")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const id = (payload.new as { id?: string }).id;
          if (!id) return;

          const { data } = await supabase
            .from("messages")
            .select(`id, text, role, created_at, dialog:dialogs (id, telegram_chat_id, assigned_to, profile:profiles (username, first_name, last_name))`)
            .eq("id", id)
            .single();

          if (data) {
            setLiveMessages((prev) => [data as unknown as Message, ...prev]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Прямое обновление assigned_to после назначения менеджера.
  // Не нужен router.refresh() — меняем стейт напрямую.
  function handleAssignChange(dialogId: string, assignedTo: string | null) {
    setLiveMessages((prev) =>
      prev.map((m) =>
        m.dialog.id === dialogId
          ? { ...m, dialog: { ...m.dialog, assigned_to: assignedTo } }
          : m
      )
    );
  }

  // chatOptions — уникальный список чатов для дропдаунов.
  const chatOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const message of liveMessages) {
      const { telegram_chat_id } = message.dialog;
      if (!seen.has(telegram_chat_id)) {
        const { first_name, last_name, username } = message.dialog.profile;
        const name =
          [first_name, last_name].filter(Boolean).join(" ").trim() ||
          (username ? `@${username}` : `Chat ${telegram_chat_id}`);
        seen.set(telegram_chat_id, name);
      }
    }
    return Array.from(seen.entries()).map(([chatId, label]) => ({
      chatId,
      label: `${label} · ${chatId}`,
    }));
  }, [liveMessages]);

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
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex gap-3">
              <span className="chip">Сообщений: {liveMessages.length}</span>
              <span className="chip">Диалогов: {chatOptions.length}</span>
            </div>
            <SignOutButton />
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
            {(["light", "dark", "modern-dark"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setThemeMode(mode)}
                className={`tab-btn ${themeMode === mode ? "tab-btn--active" : ""}`}
              >
                {mode === "light" ? "Light" : mode === "dark" ? "Dark" : "Modern Dark"}
              </button>
            ))}
          </div>
        </section>

        {initialError && (
          <div className="panel mb-6 border-red-400/40 bg-red-200/30 p-4 text-red-900">
            {initialError}
          </div>
        )}

        {activeView === "dialogs" && (
          <DialogsView
            messages={liveMessages}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
            onAssignChange={handleAssignChange}
          />
        )}

        {activeView === "semantic" && (
          <SemanticSearchView chatOptions={chatOptions} />
        )}
      </div>

      <AiChatWidget selectedChatId={selectedChatId} chatOptions={chatOptions} />
    </main>
  );
}

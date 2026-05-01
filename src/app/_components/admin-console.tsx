"use client";

import { useEffect, useMemo, useState } from "react";
import { AiChatWidget } from "./ai-chat-widget";
import { DialogsView } from "./dialogs-view";
import { SemanticSearchView } from "./semantic-search-view";
import { BotPromptView } from "./bot-prompt-view";
import { StaffView } from "./staff-view";
import { Sidebar } from "./sidebar";
import { useTheme } from "../_hooks/use-theme";
import { createClient as createSupabaseClient } from "@/lib/supabase";
import type { Message } from "../_types/message";
import type { StaffProfile } from "../_types/staff";

type View = "dialogs" | "search" | "bot-prompt" | "staff";

type Props = {
  messages: Message[];
  initialError: string | null;
  currentStaff: StaffProfile;
};

export function AdminConsole({ messages, initialError, currentStaff }: Props) {
  const [activeView, setActiveView] = useState<View>("dialogs");
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [liveMessages, setLiveMessages] = useState<Message[]>(messages);
  const { themeMode, setThemeMode } = useTheme();

  useEffect(() => {
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

  function handleAssignChange(dialogId: string, assignedTo: string | null) {
    setLiveMessages((prev) =>
      prev.map((m) =>
        m.dialog.id === dialogId
          ? { ...m, dialog: { ...m.dialog, assigned_to: assignedTo } }
          : m
      )
    );
  }

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
    <div className="admin-shell min-h-screen">
      <div className="flex min-h-screen">
        <Sidebar
          currentStaff={currentStaff}
          activeView={activeView}
          onNavigate={setActiveView}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 overflow-auto">
          <div className="mx-auto w-full max-w-7xl">
            {/* Шапка */}
            <header className="panel mb-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs tracking-[0.22em] text-[var(--muted)] uppercase">Support Admin</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    New Era AI Support Board
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="chip text-xs">Сообщений: {liveMessages.length}</span>
                    <span className="chip text-xs">Диалогов: {chatOptions.length}</span>
                  </div>
                  {/* Theme switcher */}
                  <div className="flex w-fit gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1">
                    {(["light", "dark", "modern-dark"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setThemeMode(mode)}
                        className={`tab-btn text-xs px-2.5 py-1 ${themeMode === mode ? "tab-btn--active" : ""}`}
                      >
                        {mode === "light" ? "L" : mode === "dark" ? "D" : "MD"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </header>

            {initialError && (
              <div className="panel mb-5 border-red-400/40 bg-red-200/30 p-4 text-sm text-red-900">
                {initialError}
              </div>
            )}

            {activeView === "dialogs" && (
              <DialogsView
                messages={liveMessages}
                selectedChatId={selectedChatId}
                onSelectChat={setSelectedChatId}
                onAssignChange={handleAssignChange}
                currentStaff={currentStaff}
              />
            )}

            {activeView === "search" && (
              <SemanticSearchView chatOptions={chatOptions} />
            )}

            {activeView === "bot-prompt" && currentStaff.role === "admin" && (
              <BotPromptView />
            )}

            {activeView === "staff" && currentStaff.role === "admin" && (
              <StaffView />
            )}
          </div>
        </main>
      </div>

      <AiChatWidget selectedChatId={selectedChatId} chatOptions={chatOptions} />
    </div>
  );
}

"use client";

import type { Conversation } from "../_types/conversation";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatCell(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return <span className="font-mono text-[var(--muted)]">NULL</span>;
  }
  return String(value);
}

type Props = {
  conversation: Conversation | null;
};

// Правая колонка: заголовок выбранного чата + список его сообщений.
export function ConversationMessages({ conversation }: Props) {
  if (!conversation) {
    return <div className="p-5 text-sm text-[var(--muted)]">Нет диалогов.</div>;
  }

  return (
    <>
      <div className="border-b border-[var(--line)] bg-[var(--surface)]/70 px-4 py-3 text-sm text-[var(--muted)] sm:px-6">
        <span className="font-semibold text-[var(--text)]">user:</span>{" "}
        {conversation.displayName}
        {" | "}
        <span className="font-semibold text-[var(--text)]">chat_id:</span>{" "}
        {conversation.chatId}
        {" | "}
        <span className="font-semibold text-[var(--text)]">username:</span>{" "}
        {formatCell(conversation.head.dialog.profile.username)}
      </div>

      <div className="max-h-[72vh] space-y-2 overflow-auto p-3 sm:p-4">
        {conversation.messages.map((message) => {
          const isUser = (message.role ?? "user") === "user";
          return (
            <div key={message.id} style={{ display: "flex", justifyContent: isUser ? "flex-start" : "flex-end" }}>
              <div
                className="max-w-[75%] rounded-xl p-3"
                style={{
                  border: "1px solid var(--line)",
                  background: isUser
                    ? "var(--surface-soft)"
                    : "color-mix(in oklab, var(--accent) 15%, var(--surface-soft) 85%)",
                }}
              >
                <p className="mb-1 text-xs uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
                  {message.role ?? "user"} · {formatDate(message.created_at)}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6">{formatCell(message.text)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

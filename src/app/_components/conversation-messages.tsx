"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { Conversation } from "../_types/conversation";
import type { StaffProfile } from "../_types/staff";

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
  currentStaff: StaffProfile;
  assignedToName?: string | null;
  onMessageSent?: (dialogId: string) => void;
};

export function ConversationMessages({ conversation, currentStaff, assignedToName, onMessageSent }: Props) {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [conversation?.dialogId, conversation?.messages.length]);

  if (!conversation) {
    return <div className="p-5 text-sm text-[var(--muted)]">Нет диалогов.</div>;
  }

  const canReply =
    currentStaff.role === "admin" ||
    (currentStaff.role === "manager" && conversation.assignedTo === currentStaff.user_id);

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !conversation) return;

    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/dialogs/${conversation.dialogId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: replyText.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setSendError(json.error); return; }
      setReplyText("");
      onMessageSent?.(conversation.dialogId);
    } catch {
      setSendError("Не удалось отправить сообщение.");
    } finally {
      setSending(false);
    }
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

      <div className="max-h-[60vh] space-y-2 overflow-auto p-3 sm:p-4">
        {conversation.messages.map((message) => {
          const role = message.role ?? "user";
          const isUser = role === "user";
          const roleLabel = role === "user" ? "Клиент" : role === "bot" ? "Бот" : "Менеджер";
          return (
            <div key={message.id} style={{ display: "flex", justifyContent: isUser ? "flex-start" : "flex-end" }}>
              <div
                className="max-w-[75%] rounded-xl p-3"
                style={{
                  border: "1px solid var(--line)",
                  background: isUser
                    ? "var(--surface-soft)"
                    : role === "bot"
                    ? "color-mix(in oklab, #6366f1 12%, var(--surface-soft) 88%)"
                    : "color-mix(in oklab, var(--accent) 15%, var(--surface-soft) 85%)",
                }}
              >
                <p className="mb-1 text-xs uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
                  {roleLabel} · {formatDate(message.created_at)}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6">{formatCell(message.text)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {!canReply && conversation.assignedTo && (
        <div className="border-t border-[var(--line)] px-4 py-3 text-xs text-[var(--muted)]">
          Диалог ведёт: <span className="font-semibold text-[var(--text)]">{assignedToName ?? "другой сотрудник"}</span>
        </div>
      )}

      {canReply && (
        <form
          onSubmit={handleReply}
          className="border-t border-[var(--line)] p-3 sm:p-4"
        >
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1 text-sm"
              placeholder="Ответить клиенту в Telegram..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !replyText.trim()}
              className="action-btn shrink-0 text-sm"
            >
              {sending ? "..." : "Отправить"}
            </button>
          </div>
          {sendError && <p className="mt-2 text-xs text-red-700">{sendError}</p>}
        </form>
      )}
    </>
  );
}

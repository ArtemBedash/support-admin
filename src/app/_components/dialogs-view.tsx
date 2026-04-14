"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Message } from "../_types/message";
import type { Conversation } from "../_types/conversation";
import { ConversationList } from "./conversation-list";
import { ConversationMessages } from "./conversation-messages";

type DialogPeriod = "all" | "24h" | "7d" | "30d";

type Props = {
  messages: Message[];
  selectedChatId: number | null;
  onSelectChat: (chatId: number) => void;
  onAssignChange: (dialogId: string, assignedTo: string | null) => void;
};

function getDisplayName(message: Message) {
  const { first_name, last_name, username } = message.dialog.profile;
  const fullName = [first_name, last_name].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (username) return `@${username}`;
  return `Chat ${message.dialog.telegram_chat_id}`;
}

// Оркестратор диалогов: группирует сообщения, фильтрует, управляет назначением.
export function DialogsView({ messages, selectedChatId, onSelectChat, onAssignChange }: Props) {
  const [dialogQuery, setDialogQuery] = useState("");
  const [dialogPeriod, setDialogPeriod] = useState<DialogPeriod>("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Получаем ID текущего менеджера из Supabase Auth при монтировании.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  // Группируем сообщения по chatId и берём последнее как "голову" диалога.
  const conversations = useMemo<Conversation[]>(() => {
    const grouped = new Map<number, Message[]>();
    for (const message of messages) {
      const chatId = message.dialog.telegram_chat_id;
      const group = grouped.get(chatId) ?? [];
      group.push(message);
      grouped.set(chatId, group);
    }

    return Array.from(grouped.entries())
      .map(([chatId, groupMessages]) => {
        const sorted = [...groupMessages].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        const head = sorted[0];
        return {
          chatId,
          dialogId: head.dialog.id,
          assignedTo: head.dialog.assigned_to,
          messages: sorted,
          head,
          displayName: getDisplayName(head),
        };
      })
      .sort((a, b) => new Date(b.head.created_at).getTime() - new Date(a.head.created_at).getTime());
  }, [messages]);

  // Фильтрация по периоду и текстовому запросу.
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
        conversation.messages.some((m) => new Date(m.created_at).getTime() >= cutoff);

      if (!periodMatch) return false;
      if (!search) return true;

      const haystack = [
        String(conversation.chatId),
        conversation.displayName,
        conversation.head.dialog.profile.username ?? "",
        conversation.head.dialog.profile.first_name ?? "",
        conversation.head.dialog.profile.last_name ?? "",
        conversation.head.text ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [conversations, dialogPeriod, dialogQuery]);

  // Если выбранный диалог пропал из фильтров — выбираем первый доступный.
  useEffect(() => {
    if (!filteredConversations.length) return;
    if (selectedChatId === null || !filteredConversations.some((c) => c.chatId === selectedChatId)) {
      onSelectChat(filteredConversations[0].chatId);
    }
  }, [filteredConversations, selectedChatId, onSelectChat]);

  const selectedConversation =
    filteredConversations.find((c) => c.chatId === selectedChatId) ?? null;

  async function assignToMe(dialogId: string) {
    await fetch(`/api/dialogs/${dialogId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to: currentUserId }),
    });
    onAssignChange(dialogId, currentUserId);
  }

  async function unassign(dialogId: string) {
    await fetch(`/api/dialogs/${dialogId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to: null }),
    });
    onAssignChange(dialogId, null);
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[340px_1fr]">
      <ConversationList
        conversations={filteredConversations}
        selectedChatId={selectedChatId}
        currentUserId={currentUserId}
        dialogQuery={dialogQuery}
        dialogPeriod={dialogPeriod}
        onSelectChat={onSelectChat}
        onQueryChange={setDialogQuery}
        onPeriodChange={setDialogPeriod}
        onAssign={assignToMe}
        onUnassign={unassign}
      />

      <article className="panel overflow-hidden">
        <ConversationMessages conversation={selectedConversation} />
      </article>
    </section>
  );
}

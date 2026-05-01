"use client";

import { AssignButton } from "./assign-button";
import type { Conversation } from "../_types/conversation";
import type { StaffProfile, StaffRole } from "../_types/staff";

type DialogPeriod = "all" | "24h" | "7d" | "30d";
type StaffOption = { user_id: string; display_name: string; role: StaffRole };

type Props = {
  conversations: Conversation[];
  selectedChatId: number | null;
  currentStaff: StaffProfile;
  staffList: StaffOption[];
  staffMap: Map<string, string>;
  dialogQuery: string;
  dialogPeriod: DialogPeriod;
  onSelectChat: (chatId: number) => void;
  onQueryChange: (query: string) => void;
  onPeriodChange: (period: DialogPeriod) => void;
  onAssignTo: (dialogId: string, userId: string) => void;
  onUnassign: (dialogId: string) => void;
};

export function ConversationList({
  conversations,
  selectedChatId,
  currentStaff,
  staffList,
  staffMap,
  dialogQuery,
  dialogPeriod,
  onSelectChat,
  onQueryChange,
  onPeriodChange,
  onAssignTo,
  onUnassign,
}: Props) {
  return (
    <aside className="panel p-3 sm:p-4">
      <p className="mb-3 px-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
        Активные диалоги
      </p>

      <div className="space-y-3 px-1 pb-3">
        <input
          value={dialogQuery}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Поиск: user, username, chat_id"
          className="input"
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["24h", "Активные"],
              ["7d", "7 дней"],
              ["30d", "30 дней"],
              ["all", "Все"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onPeriodChange(value)}
              className={`tab-btn ${dialogPeriod === value ? "tab-btn--active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[72vh] space-y-2 overflow-auto pr-1">
        {conversations.map((conversation) => (
          <div
            key={conversation.chatId}
            onClick={() => onSelectChat(conversation.chatId)}
            className={`w-full cursor-pointer rounded-xl border px-3 py-3 text-left transition ${
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
            <AssignButton
              assignedTo={conversation.assignedTo}
              assignedToName={conversation.assignedTo ? (staffMap.get(conversation.assignedTo) ?? null) : null}
              currentStaff={currentStaff}
              staffList={staffList}
              onAssignTo={(userId) => onAssignTo(conversation.dialogId, userId)}
              onUnassign={() => onUnassign(conversation.dialogId)}
            />
          </div>
        ))}

        {!conversations.length && (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)]/70 px-3 py-4 text-sm text-[var(--muted)]">
            Ничего не найдено по фильтрам.
          </div>
        )}
      </div>
    </aside>
  );
}

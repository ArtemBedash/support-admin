import type { Message } from "./message";

// Сгруппированный диалог: все сообщения одного чата + метаданные.
export type Conversation = {
  chatId: number;
  dialogId: string;
  assignedTo: string | null;
  messages: Message[];
  head: Message;       // последнее сообщение — показываем в превью
  displayName: string; // имя пользователя для отображения
};

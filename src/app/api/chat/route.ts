/**
 * /api/chat — POST endpoint AI-чата для менеджеров.
 *
 * Флоу (RAG — Retrieval Augmented Generation):
 *   1. Принимаем вопрос менеджера + историю переписки + опциональный chatId.
 *   2. Превращаем вопрос в embedding через OpenAI.
 *   3. Ищем релевантные сообщения из Telegram через match_messages (pgvector).
 *   4. Формируем prompt: system инструкция + найденный контекст + история + вопрос.
 *   5. Отправляем в OpenAI Chat Completions, получаем ответ.
 *   6. Возвращаем ответ + список использованных сообщений (references).
 *
 * Используется в AiChatWidget компоненте.
 */

import { NextResponse } from "next/server";
import { createEmbedding } from "@/lib/openai";
import { createChatAnswer } from "@/lib/openai-chat";
import { searchMessagesByVector } from "@/lib/vector-search";

export const dynamic = "force-dynamic";

type ChatBody = {
  message?: string;
  chatId?: number | null;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatBody;
    const message = body.message?.trim() ?? "";

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const chatId = typeof body.chatId === "number" ? body.chatId : null;

    // Шаг 1: вопрос → вектор.
    const embedding = await createEmbedding(message);

    // Шаг 2: ищем до 8 релевантных сообщений из Telegram как контекст.
    const contextResults = await searchMessagesByVector({ embedding, limit: 8, chatId });

    // Шаг 3: форматируем контекст в читаемый текст для prompt.
    const contextBlock = contextResults.length
      ? contextResults
          .map((item, idx) => `${idx + 1}. [score=${item.similarity.toFixed(3)}] chat_id=${item.telegram_chat_id} text=${item.text}`)
          .join("\n")
      : "No relevant messages found.";

    // Берём только последние 8 сообщений истории чтобы не раздувать prompt.
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

    // Шаг 4: собираем финальный prompt.
    const messages = [
      {
        role: "system" as const,
        // Основная инструкция — кто такой ассистент и как отвечать.
        content:
          "You are a support assistant for New Era AI Support Board. Reply in Russian unless user writes in another language. Use the provided context from Telegram messages when relevant. If context is missing, say it clearly and ask a clarifying question.",
      },
      {
        role: "system" as const,
        // Контекст из семантического поиска — реальные сообщения пользователей.
        content: `Context from semantic search:\n${contextBlock}`,
      },
      // История диалога менеджера с AI.
      ...history.map((item) => ({ role: item.role, content: item.content })),
      { role: "user" as const, content: message },
    ];

    // Шаг 5: получаем ответ от OpenAI.
    const answer = await createChatAnswer(messages);

    return NextResponse.json({
      answer,
      // references — сообщения которые были использованы как контекст.
      references: contextResults.map((item) => ({
        id: item.id,
        chat_id: item.telegram_chat_id,
        text: item.text,
        similarity: Number(item.similarity.toFixed(3)),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

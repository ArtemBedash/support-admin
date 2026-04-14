/**
 * /api/search — POST endpoint семантического поиска по сообщениям.
 *
 * Флоу:
 *   1. Принимаем текстовый запрос от менеджера.
 *   2. Превращаем запрос в embedding через OpenAI.
 *   3. Ищем похожие сообщения в БД через match_messages RPC (pgvector).
 *   4. Возвращаем результаты с полем similarity.
 *
 * Используется в SemanticSearchView компоненте.
 */

import { NextResponse } from "next/server";
import { createEmbedding } from "@/lib/openai";
import { searchMessagesByVector } from "@/lib/vector-search";

export const dynamic = "force-dynamic";

type SearchBody = {
  query?: string;
  chatId?: number | null; // null = искать по всем чатам
  limit?: number;         // максимум 20, по умолчанию 8
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SearchBody;
    const query = body.query?.trim() ?? "";

    if (!query) {
      return NextResponse.json({ error: "Query is required." }, { status: 400 });
    }

    // Ограничиваем limit: минимум 1, максимум 20.
    const limit = Math.min(Math.max(body.limit ?? 8, 1), 20);
    const chatId = typeof body.chatId === "number" ? body.chatId : null;

    // Шаг 1: текст → вектор.
    const embedding = await createEmbedding(query);

    // Шаг 2: вектор → похожие сообщения из БД.
    const results = await searchMessagesByVector({ embedding, limit, chatId });

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * vector-search.ts — утилита семантического поиска по сообщениям.
 *
 * Использует pgvector + Supabase RPC функцию match_messages.
 *
 * Флоу:
 *   1. Принимает готовый embedding (числовой вектор) + параметры поиска.
 *   2. Вызывает RPC match_messages в Supabase — она делает cosine similarity search в БД.
 *   3. Возвращает массив релевантных сообщений с полем similarity (0–1, чем выше тем лучше).
 *
 * Используется в:
 *   - /api/search — семантический поиск в админке
 *   - /api/chat — получение контекста для AI-ответа
 */

import { createClient } from "@supabase/supabase-js";

// Тип результата — соответствует тому что возвращает RPC match_messages.
export type SearchResult = {
  id: string;
  dialog_id: string;
  telegram_chat_id: number;
  text: string;
  created_at: string;
  // similarity: от 0 до 1. Чем ближе к 1 — тем релевантнее сообщение запросу.
  similarity: number;
};

type SearchParams = {
  embedding: number[];
  limit?: number;
  chatId?: number | null; // null = искать по всем чатам
};

// Создаём Supabase клиент с service_role ключом для обхода RLS.
// Fallback на anon key для локальной разработки без service_role.
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing.");

  const key = serviceRole ?? anon;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.");

  // persistSession: false — серверный клиент, сессия не нужна.
  return createClient(supabaseUrl, key, { auth: { persistSession: false } });
}

export async function searchMessagesByVector({ embedding, limit = 8, chatId = null }: SearchParams) {
  const supabase = getSupabaseAdminClient();

  // Вызываем SQL функцию match_messages.
  // query_embedding — строка "[0.1,0.2,...]" (pgvector формат).
  // match_count — сколько результатов вернуть.
  // filter_chat_id — null значит искать по всем чатам.
  const { data, error } = await supabase.rpc("match_messages", {
    query_embedding: `[${embedding.join(",")}]`,
    match_count: limit,
    filter_chat_id: chatId,
  });

  if (error) throw new Error(`match_messages failed: ${error.message}`);

  return (data ?? []) as SearchResult[];
}

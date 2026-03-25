import { createClient } from "@supabase/supabase-js";

export type SearchResult = {
  id: string;
  telegram_chat_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  text: string;
  created_at: string;
  similarity: number;
};

type SearchParams = {
  embedding: number[];
  limit?: number;
  chatId?: number | null;
};

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing.");
  }

  const key = serviceRole ?? anon;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.");
  }

  return createClient(supabaseUrl, key, { auth: { persistSession: false } });
}

export async function searchMessagesByVector({ embedding, limit = 8, chatId = null }: SearchParams) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.rpc("match_messages", {
    query_embedding: `[${embedding.join(",")}]`,
    match_count: limit,
    filter_chat_id: chatId,
  });

  if (error) {
    throw new Error(`match_messages failed: ${error.message}`);
  }

  return (data ?? []) as SearchResult[];
}

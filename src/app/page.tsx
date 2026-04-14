/**
 * page.tsx — главная SSR страница админки (Server Component).
 *
 * Флоу:
 *   1. Создаём Supabase клиент с сессией текущего менеджера (cookie-based auth).
 *   2. Грузим последние 300 сообщений с JOIN на dialogs и profiles.
 *   3. Передаём данные в AdminConsole (Client Component) через props.
 *
 * Почему SSR: данные грузятся на сервере до отправки HTML в браузер —
 * менеджер сразу видит диалоги без лишнего loading state.
 */

import { createClient } from "@/lib/supabase-server";
import { AdminConsole } from "./_components/admin-console";
import type { Message } from "./_types/message";

// force-dynamic — отключаем кеш Next.js, страница всегда рендерится свежей.
export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  // Один запрос с вложенным JOIN: messages → dialogs → profiles.
  // Supabase автоматически собирает вложенные объекты по FK связям.
  const { data, error } = await supabase
    .from("messages")
    .select(`
      id,
      text,
      role,
      created_at,
      dialog:dialogs (
        id,
        telegram_chat_id,
        assigned_to,
        profile:profiles (
          username,
          first_name,
          last_name
        )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(300);

  // as unknown as Message[] — Supabase возвращает generic тип, приводим к нашему.
const messages = (data ?? []) as unknown as Message[];

  return <AdminConsole messages={messages} initialError={error?.message ?? null} />;
}

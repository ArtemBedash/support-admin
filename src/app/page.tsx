import { supabase } from "@/lib/supabase";

type Message = {
  id: string;
  telegram_chat_id: number;
  username: string;
  text: string;
  created_at: string;
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  const safeMessages: Message[] = messages ?? [];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          SupportBot - Сообщения
        </h1>
        <p className="mb-8 text-sm text-slate-600">
          Всего сообщений: {safeMessages.length}
        </p>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Ошибка загрузки сообщений: {error.message}
          </div>
        )}

        <div className="space-y-4">
          {safeMessages.map((message) => (
            <article
              key={message.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-4">
                <p className="text-base font-semibold">{message.username}</p>
                <time className="text-xs text-slate-500">
                  {new Date(message.created_at).toLocaleString()}
                </time>
              </div>
              <p className="mb-3 whitespace-pre-wrap text-slate-800">
                {message.text}
              </p>
              <p className="text-xs text-slate-500">
                Telegram Chat ID: {message.telegram_chat_id}
              </p>
            </article>
          ))}

          {!safeMessages.length && !error && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
              Пока нет сообщений.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

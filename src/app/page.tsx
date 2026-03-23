import { supabase } from "@/lib/supabase";

type Message = {
  id: string;
  telegram_chat_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  text: string;
  created_at: string;
};

export const dynamic = "force-dynamic";

function cell(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return <span className="font-mono text-slate-400">NULL</span>;
  }
  return String(value);
}

export default async function Home() {
  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, telegram_chat_id, username, first_name, last_name, text, created_at")
    .order("created_at", { ascending: false });

  const safeMessages: Message[] = messages ?? [];
  const totalMessages = safeMessages.length;
  const grouped = new Map<number, Message[]>();

  for (const message of safeMessages) {
    const group = grouped.get(message.telegram_chat_id) ?? [];
    group.push(message);
    grouped.set(message.telegram_chat_id, group);
  }

  const groupedEntries = Array.from(grouped.entries()).sort((a, b) => {
    const aDate = a[1][0]?.created_at ?? "";
    const bDate = b[1][0]?.created_at ?? "";
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  const uniqueUsers = groupedEntries.length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">SupportBot - Messages</h1>
        <p className="mb-6 text-sm text-slate-600">
          Всего сообщений: {totalMessages} | Уникальных пользователей: {uniqueUsers}
        </p>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            Query error: {error.message}
          </div>
        )}

        {!error && (
          <div className="space-y-6">
            {groupedEntries.map(([chatId, groupMessages]) => {
              const head = groupMessages[0];
              const fullName = [head?.first_name, head?.last_name]
                .filter(Boolean)
                .join(" ")
                .trim();

              return (
                <section
                  key={chatId}
                  className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm"
                >
                  <div className="border-b border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700">
                    <span className="font-semibold">chat_id:</span> {chatId}
                    {" | "}
                    <span className="font-semibold">username:</span> {cell(head?.username)}
                    {" | "}
                    <span className="font-semibold">first_name:</span> {cell(head?.first_name)}
                    {" | "}
                    <span className="font-semibold">last_name:</span> {cell(head?.last_name)}
                    {fullName && (
                      <>
                        {" | "}
                        <span className="font-semibold">full_name:</span> {fullName}
                      </>
                    )}
                    {" | "}
                    <span className="font-semibold">messages:</span> {groupMessages.length}
                  </div>

                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-3 py-2">created_at</th>
                        <th className="px-3 py-2">text</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupMessages.map((message) => (
                        <tr key={message.id} className="border-t border-slate-100 align-top">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {new Date(message.created_at).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 whitespace-pre-wrap">{cell(message.text)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              );
            })}

            {!groupedEntries.length && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
                No rows found.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

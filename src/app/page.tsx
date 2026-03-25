import { supabase } from "@/lib/supabase";
import { AdminConsole } from "./_components/admin-console";

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

export default async function Home() {
  const { data, error } = await supabase
    .from("messages")
    .select("id, telegram_chat_id, username, first_name, last_name, text, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  const messages: Message[] = data ?? [];

  return <AdminConsole messages={messages} initialError={error?.message ?? null} />;
}

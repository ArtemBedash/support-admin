import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getCurrentStaff } from "@/lib/staff";
import { AdminConsole } from "./_components/admin-console";
import type { Message } from "./_types/message";

export const dynamic = "force-dynamic";

export default async function Home() {
  const staff = await getCurrentStaff();

  if (!staff) {
    redirect("/login?error=no_profile");
  }

  if (!staff.is_active) {
    redirect("/login?error=inactive");
  }

  const supabase = await createClient();

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

  const messages = (data ?? []) as unknown as Message[];

  return (
    <AdminConsole
      messages={messages}
      initialError={error?.message ?? null}
      currentStaff={staff}
    />
  );
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getCurrentStaff } from "@/lib/staff";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.is_active) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { text } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: "Текст сообщения обязателен." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: dialog } = await supabase
    .from("dialogs")
    .select("id, telegram_chat_id, assigned_to")
    .eq("id", id)
    .single();

  if (!dialog) {
    return NextResponse.json({ error: "Диалог не найден." }, { status: 404 });
  }

  if (staff.role === "manager" && dialog.assigned_to !== staff.user_id) {
    return NextResponse.json({ error: "Можно отвечать только в своём диалоге." }, { status: 403 });
  }

  const trimmedText = text.trim();
  const now = new Date().toISOString();

  const { data: message, error: msgError } = await supabase
    .from("messages")
    .insert({ dialog_id: id, text: trimmedText, role: "admin" })
    .select("id, text, role, created_at")
    .single();

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  await supabase
    .from("dialogs")
    .update({ last_staff_reply_at: now })
    .eq("id", id);

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "BOT_TOKEN не настроен на сервере." }, { status: 500 });
  }

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: dialog.telegram_chat_id, text: trimmedText }),
    });
    const tgJson = await tgRes.json();
    if (!tgRes.ok) {
      console.error("Telegram error:", tgJson);
      return NextResponse.json({ error: `Telegram: ${tgJson.description ?? "unknown error"}` }, { status: 500 });
    }
  } catch (err) {
    console.error("Telegram send failed:", err);
    return NextResponse.json({ error: "Не удалось подключиться к Telegram." }, { status: 500 });
  }

  return NextResponse.json({ message });
}

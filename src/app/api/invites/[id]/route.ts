import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getCurrentStaff } from "@/lib/staff";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  // Отзыв инвайта — admin-only действие. Manager не должен управлять доступом.
  const staff = await getCurrentStaff();
  if (!staff || !staff.is_active) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = await createClient();

  // Перед отзывом проверяем lifecycle инвайта. Использованный или уже отозванный
  // инвайт повторно менять нельзя — это сохраняет понятную историю статусов.
  const { data: invite } = await supabase
    .from("staff_invites")
    .select("used_at, revoked_at")
    .eq("id", id)
    .single();

  if (!invite) return NextResponse.json({ error: "Инвайт не найден." }, { status: 404 });
  if (invite.used_at) return NextResponse.json({ error: "Инвайт уже использован." }, { status: 400 });
  if (invite.revoked_at) return NextResponse.json({ error: "Инвайт уже отозван." }, { status: 400 });

  // Soft revoke: строка остается в staff_invites, но код больше невалиден.
  const { error } = await supabase
    .from("staff_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

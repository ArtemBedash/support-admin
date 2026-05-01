import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getCurrentStaff } from "@/lib/staff";

export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff || !staff.is_active) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bot_prompt_versions")
    .select("id, title, system_prompt, behavior_fallback, is_active, created_by, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ versions: data ?? [] });
}

export async function POST(req: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.is_active) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title, system_prompt, behavior_fallback, activate } = await req.json();

  if (!title?.trim() || !system_prompt?.trim() || !behavior_fallback?.trim()) {
    return NextResponse.json({ error: "Все поля обязательны." }, { status: 400 });
  }

  const supabase = await createClient();

  // Если нужно активировать — сначала деактивируем текущую версию
  if (activate) {
    await supabase
      .from("bot_prompt_versions")
      .update({ is_active: false })
      .eq("is_active", true);
  }

  const { data, error } = await supabase
    .from("bot_prompt_versions")
    .insert({
      title: title.trim(),
      system_prompt: system_prompt.trim(),
      behavior_fallback: behavior_fallback.trim(),
      is_active: activate === true,
      created_by: staff.user_id,
    })
    .select("id, title, is_active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ version: data });
}

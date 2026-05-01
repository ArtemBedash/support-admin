import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getCurrentStaff } from "@/lib/staff";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.is_active) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = await createClient();

  // Деактивируем текущую активную версию
  await supabase
    .from("bot_prompt_versions")
    .update({ is_active: false })
    .eq("is_active", true);

  // Активируем выбранную версию
  const { data, error } = await supabase
    .from("bot_prompt_versions")
    .update({ is_active: true })
    .eq("id", id)
    .select("id, title, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ version: data });
}

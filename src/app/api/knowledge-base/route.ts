import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getCurrentStaff } from "@/lib/staff";

export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff || !staff.is_active) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_base")
    .select("id, file, heading, content, created_at")
    .order("file", { ascending: true })
    .order("id", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}

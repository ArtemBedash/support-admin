import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getCurrentStaff } from "@/lib/staff";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff || !currentStaff.is_active) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (currentStaff.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { display_name, role, is_active } = body;

  const supabase = createServiceRoleClient();

  // Проверяем что не оставляем систему без активного admin
  if (is_active === false || role === "manager") {
    const targetUserId = id;
    const { data: target } = await supabase
      .from("staff_profiles")
      .select("role, is_active")
      .eq("user_id", targetUserId)
      .single();

    if (target?.role === "admin") {
      // Проверяем что останется хотя бы один активный admin
      const { count } = await supabase
        .from("staff_profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("is_active", true)
        .neq("user_id", targetUserId);

      if ((count ?? 0) === 0) {
        return NextResponse.json(
          { error: "Нельзя оставить систему без активного администратора." },
          { status: 400 }
        );
      }
    }
  }

  const updates: Record<string, unknown> = {};
  if (display_name !== undefined) updates.display_name = display_name.trim();
  if (role !== undefined) updates.role = role;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from("staff_profiles")
    .update(updates)
    .eq("user_id", id)
    .select("user_id, display_name, role, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staff: data });
}

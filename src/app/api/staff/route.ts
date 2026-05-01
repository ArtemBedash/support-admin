import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getCurrentStaff } from "@/lib/staff";

export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff || !staff.is_active) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (staff.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("staff_profiles")
    .select("user_id, display_name, role, is_active, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Получаем email из auth.users через admin API
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const emailMap = new Map(usersData?.users?.map((u) => [u.id, u.email]) ?? []);

  const staffList = (data ?? []).map((s) => ({
    ...s,
    email: emailMap.get(s.user_id) ?? null,
  }));

  return NextResponse.json({ staff: staffList });
}

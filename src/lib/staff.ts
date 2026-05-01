import { createClient } from "./supabase-server";
import type { StaffProfile } from "@/app/_types/staff";

export async function getCurrentStaff(): Promise<StaffProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("staff_profiles")
    .select("user_id, display_name, role, is_active, created_at, updated_at")
    .eq("user_id", user.id)
    .single();

  return data ?? null;
}

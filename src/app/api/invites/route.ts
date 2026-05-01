import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getCurrentStaff } from "@/lib/staff";

function generateCode(): string {
  return randomBytes(12).toString("hex").toUpperCase();
}

function hashCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

function getInviteStatus(invite: {
  used_at: string | null;
  revoked_at: string | null;
  expires_at: string;
}): "active" | "used" | "expired" | "revoked" {
  if (invite.used_at) return "used";
  if (invite.revoked_at) return "revoked";
  if (new Date(invite.expires_at) < new Date()) return "expired";
  return "active";
}

export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff || !staff.is_active) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("staff_invites")
    .select("id, role, expires_at, used_at, revoked_at, created_at, created_by, used_by")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Резолвим display names для created_by и used_by
  const userIds = new Set<string>();
  for (const inv of data ?? []) {
    if (inv.created_by) userIds.add(inv.created_by);
    if (inv.used_by) userIds.add(inv.used_by);
  }

  const nameMap = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from("staff_profiles")
      .select("user_id, display_name")
      .in("user_id", Array.from(userIds));
    for (const p of profiles ?? []) {
      nameMap.set(p.user_id, p.display_name);
    }
  }

  const invites = (data ?? []).map((inv) => ({
    id: inv.id,
    role: inv.role,
    status: getInviteStatus(inv),
    created_by_name: inv.created_by ? (nameMap.get(inv.created_by) ?? null) : null,
    created_at: inv.created_at,
    expires_at: inv.expires_at,
    used_at: inv.used_at,
    used_by_name: inv.used_by ? (nameMap.get(inv.used_by) ?? null) : null,
    revoked_at: inv.revoked_at,
  }));

  return NextResponse.json({ invites });
}

export async function POST(req: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.is_active) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { role } = await req.json();
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Неверная роль." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const plainCode = generateCode();
  const codeHash = hashCode(plainCode);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("staff_invites")
    .insert({
      code_hash: codeHash,
      role,
      expires_at: expiresAt,
      created_by: staff.user_id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id, plain_code: plainCode, role, expires_at: expiresAt });
}

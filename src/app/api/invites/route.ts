import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { createClient } from "@/lib/supabase-server";
import { getCurrentStaff } from "@/lib/staff";

// Plain invite code показываем администратору только один раз после создания.
// В БД сохраняем только SHA-256 hash, поэтому восстановить код позже нельзя.
function generateCode(): string {
  return randomBytes(12).toString("hex").toUpperCase();
}

// Инвайт case-insensitive: пользователь может ввести код в любом регистре.
// trim + uppercase должен совпадать с такой же нормализацией в register route.
function hashCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

// UI не хранит статус отдельной колонкой. Статус вычисляется из lifecycle-полей:
// used_at, revoked_at и expires_at. Порядок проверок важен.
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
  // Только активный admin может видеть список приглашений.
  const staff = await getCurrentStaff();
  if (!staff || !staff.is_active) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();

  // Plain code не выбираем: он никогда не хранится в БД.
  const { data, error } = await supabase
    .from("staff_invites")
    .select("id, role, expires_at, used_at, revoked_at, created_at, created_by, used_by")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Собираем user_id создателей и пользователей инвайтов, чтобы одним запросом
  // подтянуть display_name из staff_profiles и не делать N+1 запросы.
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
    for (const p of profiles ?? []) nameMap.set(p.user_id, p.display_name);
  }

  // Отдаём наружу только безопасные данные для таблицы инвайтов.
  // code_hash и plain code в ответ не попадают.
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
  // Только активный admin может создавать приглашения.
  const staff = await getCurrentStaff();
  if (!staff || !staff.is_active) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Роль будущего сотрудника задаётся при создании инвайта.
  // По UI-плану default должен быть manager, но сервер всё равно валидирует.
  const { role } = await req.json();
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Неверная роль." }, { status: 400 });
  }

  const supabase = await createClient();
  const plainCode = generateCode();
  const codeHash = hashCode(plainCode);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Создаём одноразовый инвайт на 24 часа. В БД уходит только hash кода.
  const { data, error } = await supabase
    .from("staff_invites")
    .insert({ code_hash: codeHash, role, expires_at: expiresAt, created_by: staff.user_id })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // plain_code возвращается только в этом ответе, чтобы admin мог скопировать
  // ссылку/код и отправить будущему сотруднику.
  return NextResponse.json({ id: data.id, plain_code: plainCode, role, expires_at: expiresAt });
}

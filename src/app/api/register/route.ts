import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase-server";

// Должно совпадать с hashCode в /api/invites:
// invite code case-insensitive, plain code в БД не хранится.
function hashCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export async function POST(req: Request) {
  try {
    const { email, display_name, password, invite_code } = await req.json();

    // Регистрация разрешена только по полному набору данных:
    // identity в Supabase Auth + рабочий профиль сотрудника + invite gate.
    if (!email || !display_name || !password || !invite_code) {
      return NextResponse.json({ error: "Все поля обязательны." }, { status: 400 });
    }

    // Минимальная серверная проверка пароля. UI тоже должен проверять,
    // но сервер остаётся источником правды.
    if (password.length < 8) {
      return NextResponse.json({ error: "Пароль должен быть не менее 8 символов." }, { status: 400 });
    }

    // Service role нужен здесь осознанно: route создаёт auth user через admin API
    // и пишет staff_profiles/staff_invites независимо от клиентской сессии.
    const supabase = createServiceRoleClient();
    const codeHash = hashCode(invite_code);
    const now = new Date().toISOString();

    // Проверяем invite gate до создания Auth user. Код должен существовать,
    // быть неиспользованным, неотозванным и не истекшим.
    const { data: invite, error: inviteError } = await supabase
      .from("staff_invites")
      .select("id, role, expires_at, used_at, revoked_at")
      .eq("code_hash", codeHash)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Неверный код приглашения." }, { status: 400 });
    }

    if (invite.used_at) {
      return NextResponse.json({ error: "Приглашение уже использовано." }, { status: 400 });
    }

    if (invite.revoked_at) {
      return NextResponse.json({ error: "Приглашение отозвано." }, { status: 400 });
    }

    if (new Date(invite.expires_at) < new Date(now)) {
      return NextResponse.json({ error: "Срок действия приглашения истёк." }, { status: 400 });
    }

    // Создаём пользователя через Supabase Auth admin API.
    // email_confirm=false оставляет стандартный flow подтверждения email.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: false,
    });

    if (authError || !authData.user) {
      if (authError?.message?.includes("already registered")) {
        return NextResponse.json({ error: "Этот email уже зарегистрирован." }, { status: 400 });
      }
      return NextResponse.json({ error: "Ошибка создания аккаунта." }, { status: 500 });
    }

    // Создаём рабочий профиль сотрудника. Роль берём только из invite,
    // а не из request body, чтобы пользователь не мог повысить себя до admin.
    const { error: profileError } = await supabase
      .from("staff_profiles")
      .insert({
        user_id: authData.user.id,
        display_name: display_name.trim(),
        role: invite.role,
        is_active: true,
      });

    if (profileError) {
      // Компенсационный rollback: если staff_profiles не создался, удаляем
      // только что созданного Auth user, чтобы не оставлять полурегистрацию.
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: "Ошибка создания профиля. Попробуйте снова." }, { status: 500 });
    }

    // Помечаем инвайт использованным после успешного создания Auth user + staff_profile.
    // used_by связывает invite с созданным auth.users.id для аудита.
    await supabase
      .from("staff_invites")
      .update({ used_at: now, used_by: authData.user.id })
      .eq("id", invite.id);

    // Клиент дальше показывает экран "проверьте email".
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Внутренняя ошибка сервера." }, { status: 500 });
  }
}

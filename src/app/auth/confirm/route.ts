import { createClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!code) {
    // Нет code — ссылка некорректная, идём на логин.
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();

  // Обмениваем code на сессию на сервере.
  // Здесь нет проблем с PKCE verifier — сервер не зависит от localStorage.
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Code невалидный или истёк — возвращаем на логин.
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  // Сессия установлена в cookies — теперь пользователь залогинен.
  // next различает сценарии: registration confirmation ведёт в приложение,
  // password reset ведёт на страницу нового пароля.
  return NextResponse.redirect(`${origin}${safeNext}`);
}

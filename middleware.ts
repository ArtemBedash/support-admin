import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // NextResponse.next() — значит "продолжить запрос как обычно".
  // Мы создаём его заранее, чтобы иметь возможность записать cookies в ответ.
  let response = NextResponse.next({
    request,
  });

  // Создаём Supabase клиент специально для middleware.
  // Здесь нет next/headers — cookies читаем из request, пишем в response.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Шаг 1: записываем cookies в сам запрос (для следующих операций в этом же цикле).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Шаг 2: пересоздаём response с обновлёнными cookies запроса.
          response = NextResponse.next({ request });
          // Шаг 3: записываем cookies в ответ, чтобы браузер их сохранил.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Проверяем сессию пользователя.
  // Оборачиваем в try/catch — если токен протух или невалидный, getUser() бросает ошибку.
  // В таком случае считаем пользователя неавторизованным и редиректим на /login.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  const { pathname } = request.nextUrl;

  // Если пользователь не залогинен и пытается открыть защищённую страницу — на /login.
  const publicPaths = ["/login", "/forgot-password", "/reset-password", "/auth/confirm", "/register"];
  if (!user && !publicPaths.includes(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Если пользователь уже залогинен и открывает /login — на главную.
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

// Указываем для каких роутов запускать middleware.
// Исключаем статические файлы и _next (внутренние файлы Next.js) — их проверять не нужно.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

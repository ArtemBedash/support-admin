import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Серверный клиент — читает сессию из cookies HTTP-запроса.
// Используется в server components и API route handlers.
// Принимает cookies() из next/headers — это стандартный Next.js способ
// получить доступ к cookies на сервере.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Supabase вызывает getAll чтобы прочитать текущую сессию из cookies.
        getAll() {
          return cookieStore.getAll();
        },
        // Supabase вызывает setAll когда нужно обновить сессию (например, refresh token).
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

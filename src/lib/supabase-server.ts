import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Серверный клиент — читает сессию из cookies HTTP-запроса.
// Используется в server components и API route handlers.
// Принимает cookies() из next/headers — это стандартный Next.js способ
// получить доступ к cookies на сервере.
// Service role клиент — обходит RLS, используется только на сервере.
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }),
      },
      cookies: {
        // Supabase вызывает getAll чтобы прочитать текущую сессию из cookies.
        getAll() {
          return cookieStore.getAll();
        },
        // Supabase вызывает setAll когда нужно обновить сессию (например, refresh token).
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // В Server Component куки менять нельзя — это нормально.
            // Supabase вызывает setAll при refresh токена; игнорируем если не в Route Handler.
          }
        },
      },
    }
  );
}

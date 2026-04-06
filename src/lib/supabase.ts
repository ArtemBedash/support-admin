import { createBrowserClient } from "@supabase/ssr";

// Браузерный клиент — хранит сессию в cookies, работает в "use client" компонентах.
// Вызываем как функцию, а не создаём один глобальный объект,
// потому что каждый компонент должен получать свежий экземпляр с актуальными cookies.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

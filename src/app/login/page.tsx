"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type ThemeMode = "light" | "dark" | "modern-dark";

const AUTH_ERRORS: Record<string, string> = {
  inactive: "Доступ отключен. Обратитесь к администратору.",
  no_profile: "Профиль сотрудника не найден. Обратитесь к администратору за приглашением.",
};

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode && AUTH_ERRORS[errorCode]) {
      setError(AUTH_ERRORS[errorCode]);
    }
  }, [searchParams]);

  useEffect(() => {
    const saved = window.localStorage.getItem("admin_theme_mode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isSavedTheme = saved === "dark" || saved === "light" || saved === "modern-dark";
    const mode: ThemeMode = isSavedTheme ? saved : prefersDark ? "dark" : "light";
    setThemeMode(mode);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.body.dataset.theme = themeMode;
    window.localStorage.setItem("admin_theme_mode", themeMode);
  }, [themeMode]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      // Базовая клиентская валидация формы.
      setError("Введите email и пароль.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        // Supabase возвращает error.message на английском — показываем понятное сообщение.
        setError("Неверный email или пароль.");
        return;
      }

      // Вход успешен — сессия сохранена в cookies, идём на главную.
      router.push("/");
      router.refresh(); // обновляем серверные компоненты чтобы они увидели новую сессию
    } catch {
      setError("Не удалось выполнить вход. Попробуйте снова.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-shell min-h-screen px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-lg">
        <section className="mb-4 flex justify-end">
          <div className="flex w-fit gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1.5">
            <button
              type="button"
              onClick={() => setThemeMode("light")}
              className={`tab-btn ${themeMode === "light" ? "tab-btn--active" : ""}`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setThemeMode("dark")}
              className={`tab-btn ${themeMode === "dark" ? "tab-btn--active" : ""}`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setThemeMode("modern-dark")}
              className={`tab-btn ${themeMode === "modern-dark" ? "tab-btn--active" : ""}`}
            >
              Modern Dark
            </button>
          </div>
        </section>

        <section className="panel p-6 sm:p-8">
          <p className="text-xs tracking-[0.22em] text-[var(--muted)] uppercase">Support Admin</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Вход в админ-панель</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Авторизуйтесь, чтобы открыть консоль поддержки и диалоги пользователей.
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Email</span>
              <input
                type="email"
                className="input"
                placeholder="admin@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Пароль</span>
              <input
                type="password"
                className="input"
                placeholder="Введите пароль"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>

            <button type="submit" className="action-btn w-full" disabled={submitting}>
              {submitting ? "Входим..." : "Войти"}
            </button>
          </form>

          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

          <p className="mt-6 text-sm text-[var(--muted)]">
            Забыли пароль?{" "}
            <Link href="/forgot-password" className="font-semibold text-[var(--accent)] hover:underline">
              Восстановление пароля
            </Link>
          </p>

          <p className="mt-3 text-sm text-[var(--muted)]">
            Есть приглашение?{" "}
            <Link href="/register" className="font-semibold text-[var(--accent)] hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}

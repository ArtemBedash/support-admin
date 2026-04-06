"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();

    // К этому моменту сессия уже установлена через /auth/confirm.
    // Просто обновляем пароль текущего пользователя.
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("Не удалось обновить пароль. Попробуйте снова.");
      setSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="admin-shell min-h-screen px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-lg">
        <section className="panel p-6 sm:p-8">
          <p className="text-xs tracking-[0.22em] text-[var(--muted)] uppercase">Support Admin</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Новый пароль</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Введите новый пароль для вашего аккаунта.
          </p>

          {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Новый пароль
              </span>
              <input
                type="password"
                className="input"
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>

            <button type="submit" className="action-btn w-full" disabled={submitting}>
              {submitting ? "Сохраняем..." : "Сохранить пароль"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

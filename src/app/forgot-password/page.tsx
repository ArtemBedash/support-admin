"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("Введите email.");
      return;
    }

    setError(null);

    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      // После перехода по ссылке из письма — Supabase редиректит сюда.
      // Здесь пользователь сможет ввести новый пароль.
      redirectTo: `${window.location.origin}/auth/confirm`,
    });

    if (error) {
      setError("Не удалось отправить письмо. Попробуйте снова.");
      return;
    }

    // Не говорим явно "такой email не найден" — это утечка информации.
    // Всегда показываем одно и то же сообщение.
    setSent(true);
  }

  return (
    <main className="admin-shell min-h-screen px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-lg">
        <section className="panel p-6 sm:p-8">
          <p className="text-xs tracking-[0.22em] text-[var(--muted)] uppercase">Support Admin</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Восстановление пароля</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Укажите email администратора, и мы отправим инструкцию по сбросу.
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

            <button type="submit" className="action-btn w-full">
              Отправить ссылку
            </button>
          </form>

          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          {sent && (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Если email существует в системе, письмо для сброса уже отправлено.
            </p>
          )}

          <p className="mt-6 text-sm text-[var(--muted)]">
            <Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">
              Вернуться ко входу
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

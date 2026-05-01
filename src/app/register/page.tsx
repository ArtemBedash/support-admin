"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

function RegisterForm() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const code = searchParams.get("invite");
    if (code) setInviteCode(code);
  }, [searchParams]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !displayName.trim() || !password || !confirmPassword || !inviteCode.trim()) {
      setError("Все поля обязательны.");
      return;
    }

    if (password.length < 8) {
      setError("Пароль должен быть не менее 8 символов.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        email: email.trim(),
        display_name: displayName.trim(),
        password,
        invite_code: inviteCode.trim(),
      };

      const validateRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, mode: "validate" }),
      });

      const validateJson = await validateRes.json();

      if (!validateRes.ok) {
        setError(validateJson.error ?? "Ошибка регистрации.");
        return;
      }

      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: payload.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (signUpError || !data.user) {
        setError(signUpError?.message ?? "Ошибка создания аккаунта.");
        return;
      }

      const completeRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, user_id: data.user.id }),
      });

      const completeJson = await completeRes.json();

      if (!completeRes.ok) {
        setError(completeJson.error ?? "Ошибка регистрации.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Не удалось выполнить регистрацию. Попробуйте снова.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <section className="panel p-6 sm:p-8">
        <p className="text-xs tracking-[0.22em] text-[var(--muted)] uppercase">Support Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Проверьте почту</h1>
        <p className="mt-4 text-sm text-[var(--muted)] leading-relaxed">
          Мы отправили письмо с подтверждением на{" "}
          <span className="font-semibold text-[var(--text)]">{email}</span>.
          После подтверждения вы сможете войти.
        </p>
        <p className="mt-6">
          <Link href="/login" className="text-sm font-semibold text-[var(--accent)] hover:underline">
            Перейти к входу
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="panel p-6 sm:p-8">
      <p className="text-xs tracking-[0.22em] text-[var(--muted)] uppercase">Support Admin</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Регистрация</h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Создайте аккаунт сотрудника по приглашению.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Email</span>
          <input
            type="email"
            className="input"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Имя в системе</span>
          <input
            type="text"
            className="input"
            placeholder="Иван Иванов"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Пароль</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="input pr-16"
              placeholder="Минимум 8 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--text)]"
            >
              {showPassword ? "Скрыть" : "Показать"}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Подтвердите пароль</span>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              className="input pr-16"
              placeholder="Повторите пароль"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--text)]"
            >
              {showConfirm ? "Скрыть" : "Показать"}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Код приглашения</span>
          <input
            type="text"
            className="input font-mono"
            placeholder="Введите или вставьте код"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            autoComplete="off"
          />
        </label>

        <button type="submit" className="action-btn w-full" disabled={submitting}>
          {submitting ? "Регистрация..." : "Создать аккаунт"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <p className="mt-6 text-sm text-[var(--muted)]">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">
          Войти
        </Link>
      </p>
    </section>
  );
}

export default function RegisterPage() {
  return (
    <main className="admin-shell min-h-screen px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-lg">
        <Suspense>
          <RegisterForm />
        </Suspense>
      </div>
    </main>
  );
}

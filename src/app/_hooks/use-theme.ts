/**
 * useTheme — хук управления темой интерфейса.
 *
 * Поддерживает три режима: light / dark / modern-dark.
 *
 * Флоу:
 *   1. При монтировании читаем тему из localStorage.
 *   2. Если в localStorage ничего нет — берём системную тему (prefers-color-scheme).
 *   3. При смене темы: записываем data-theme на <html> и <body> (CSS переменные реагируют на это),
 *      и сохраняем выбор в localStorage чтобы запомнить между сессиями.
 */

"use client";

import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "modern-dark";

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("admin_theme_mode");
  if (saved === "dark" || saved === "light" || saved === "modern-dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);

  // Эффект запускается при каждом изменении themeMode.
  // Применяем тему в DOM и сохраняем в localStorage.
  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.body.dataset.theme = themeMode;
    window.localStorage.setItem("admin_theme_mode", themeMode);
  }, [themeMode]);

  return { themeMode, setThemeMode };
}

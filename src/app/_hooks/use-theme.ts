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

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");

  // Эффект запускается один раз при монтировании.
  // Читаем сохранённую тему или определяем по системным настройкам.
  useEffect(() => {
    const saved = window.localStorage.getItem("admin_theme_mode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isValid = saved === "dark" || saved === "light" || saved === "modern-dark";
    setThemeMode(isValid ? saved : prefersDark ? "dark" : "light");
  }, []);

  // Эффект запускается при каждом изменении themeMode.
  // Применяем тему в DOM и сохраняем в localStorage.
  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.body.dataset.theme = themeMode;
    window.localStorage.setItem("admin_theme_mode", themeMode);
  }, [themeMode]);

  return { themeMode, setThemeMode };
}

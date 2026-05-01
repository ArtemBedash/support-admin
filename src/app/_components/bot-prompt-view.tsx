"use client";

import { useEffect, useState } from "react";
import type { BotPromptVersion } from "../_types/staff";

export function BotPromptView() {
  const [versions, setVersions] = useState<BotPromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [behaviorFallback, setBehaviorFallback] = useState("");
  const [activateAfterSave, setActivateAfterSave] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);

  async function loadVersions() {
    setLoading(true);
    try {
      const res = await fetch("/api/bot-prompt");
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      setVersions(json.versions);
    } catch {
      setError("Не удалось загрузить версии.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadVersions(); }, []);

  function loadVersionIntoEditor(version: BotPromptVersion) {
    setTitle(`${version.title} (копия)`);
    setSystemPrompt(version.system_prompt);
    setBehaviorFallback(version.behavior_fallback);
    setSaveError(null);
  }

  function resetEditor() {
    setTitle("");
    setSystemPrompt("");
    setBehaviorFallback("");
    setSaveError(null);
  }

  async function handleSave() {
    if (!title.trim() || !systemPrompt.trim() || !behaviorFallback.trim()) {
      setSaveError("Заполните все поля.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/bot-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          system_prompt: systemPrompt,
          behavior_fallback: behaviorFallback,
          activate: activateAfterSave,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setSaveError(json.error); return; }
      await loadVersions();
      resetEditor();
    } catch {
      setSaveError("Не удалось сохранить версию.");
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(id: string) {
    setActivating(id);
    try {
      const res = await fetch(`/api/bot-prompt/${id}/activate`, { method: "POST" });
      if (res.ok) await loadVersions();
    } finally {
      setActivating(null);
    }
  }

  if (loading) {
    return <div className="panel p-6 text-sm text-[var(--muted)]">Загрузка...</div>;
  }

  if (error) {
    return <div className="panel p-6 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      {/* Редактор */}
      <section className="panel p-6">
        <h2 className="text-xl font-semibold mb-4">Новая версия промпта</h2>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Название версии</span>
            <input
              type="text"
              className="input"
              placeholder="Например: v2 — больше шуток"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[var(--muted)]">System prompt</span>
            <p className="mb-2 text-xs text-[var(--muted)]">Используется когда найден контекст в базе знаний (RAG режим).</p>
            <textarea
              className="input min-h-40 resize-y font-mono text-xs leading-relaxed"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Системный промпт для RAG режима..."
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Behavior fallback</span>
            <p className="mb-2 text-xs text-[var(--muted)]">Используется когда база знаний не дала результата.</p>
            <textarea
              className="input min-h-32 resize-y font-mono text-xs leading-relaxed"
              value={behaviorFallback}
              onChange={(e) => setBehaviorFallback(e.target.value)}
              placeholder="Промпт для режима без контекста..."
            />
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={activateAfterSave}
              onChange={(e) => setActivateAfterSave(e.target.checked)}
              className="w-4 h-4 accent-[var(--accent)]"
            />
            <span className="text-sm text-[var(--text)]">Activate after save</span>
          </label>
        </div>

        {saveError && <p className="mt-3 text-sm text-red-700">{saveError}</p>}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="action-btn"
          >
            {saving ? "Сохраняем..." : "Сохранить как новую"}
          </button>
          <button
            type="button"
            onClick={resetEditor}
            className="h-[42px] px-4 rounded-xl border border-[var(--line)] text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            Сбросить
          </button>
        </div>
      </section>

      {/* Список версий */}
      <section className="panel p-6">
        <h2 className="text-xl font-semibold mb-4">Версии</h2>
        {versions.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Версий нет.</p>
        ) : (
          <ul className="space-y-3">
            {versions.map((v) => (
              <li key={v.id} className="border border-[var(--line)] rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{v.title}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {new Date(v.created_at).toLocaleString("ru-RU")}
                    </p>
                  </div>
                  {v.is_active && (
                    <span className="shrink-0 text-xs bg-green-100 text-green-800 border border-green-300 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => loadVersionIntoEditor(v)}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    Загрузить в редактор
                  </button>
                  {!v.is_active && (
                    <button
                      type="button"
                      onClick={() => handleActivate(v.id)}
                      disabled={activating === v.id}
                      className="text-xs text-[var(--muted)] hover:text-[var(--text)] hover:underline"
                    >
                      {activating === v.id ? "..." : "Активировать"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

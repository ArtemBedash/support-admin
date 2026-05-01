"use client";

import { useEffect, useState } from "react";

type KbEntry = {
  id: number;
  file: string;
  heading: string;
  content: string;
  created_at: string;
};

export function KnowledgeBaseView() {
  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/knowledge-base")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setEntries(json.entries ?? []);
      })
      .catch(() => setError("Не удалось загрузить базу знаний."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="panel p-6 text-sm text-[var(--muted)]">Загрузка...</div>;
  if (error) return <div className="panel p-6 text-sm text-red-700">{error}</div>;

  const byFile = entries.reduce<Record<string, KbEntry[]>>((acc, e) => {
    acc[e.file] = acc[e.file] ?? [];
    acc[e.file].push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(byFile).map(([file, fileEntries]) => (
        <section key={file} className="panel p-5">
          <h2 className="text-base font-semibold mb-3 text-[var(--muted)] uppercase tracking-[0.14em] text-xs">
            {file}
          </h2>
          <ul className="space-y-2">
            {fileEntries.map((entry) => (
              <li key={entry.id} className="border border-[var(--line)] rounded-xl overflow-hidden">
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-[var(--surface)]/60 transition-colors"
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  <span className="text-sm font-medium">{entry.heading}</span>
                  <span className="text-xs text-[var(--muted)] shrink-0">
                    {expandedId === entry.id ? "▲" : "▼"}
                  </span>
                </button>
                {expandedId === entry.id && (
                  <div className="px-4 pb-4 pt-1 border-t border-[var(--line)]">
                    <p className="text-sm text-[var(--text)] whitespace-pre-wrap leading-relaxed">
                      {entry.content}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

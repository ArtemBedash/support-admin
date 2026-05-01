"use client";

import { useEffect, useState } from "react";
import type { StaffInvite, StaffRole } from "../_types/staff";

type StaffEntry = {
  user_id: string;
  display_name: string;
  role: StaffRole;
  is_active: boolean;
  email: string | null;
  created_at: string;
};

type NewInvite = {
  id: string;
  plain_code: string;
  role: StaffRole;
  expires_at: string;
};

const ROLE_LABEL: Record<StaffRole, string> = { admin: "Admin", manager: "Manager" };

export function StaffView() {
  const [staffList, setStaffList] = useState<StaffEntry[]>([]);
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite creation
  const [newInviteRole, setNewInviteRole] = useState<StaffRole>("manager");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [newInvite, setNewInvite] = useState<NewInvite | null>(null);
  const [copied, setCopied] = useState(false);

  // Staff editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<StaffRole>("manager");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [staffRes, invitesRes] = await Promise.all([
        fetch("/api/staff"),
        fetch("/api/invites"),
      ]);
      const [staffJson, invitesJson] = await Promise.all([staffRes.json(), invitesRes.json()]);
      if (staffRes.ok) setStaffList(staffJson.staff ?? []);
      if (invitesRes.ok) setInvites(invitesJson.invites ?? []);
    } catch {
      setError("Не удалось загрузить данные.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function createInvite() {
    setCreatingInvite(true);
    setNewInvite(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newInviteRole }),
      });
      const json = await res.json();
      if (res.ok) {
        setNewInvite(json);
        await loadAll();
      }
    } finally {
      setCreatingInvite(false);
    }
  }

  async function revokeInvite(id: string) {
    await fetch(`/api/invites/${id}`, { method: "DELETE" });
    await loadAll();
  }

  async function regenerateInvite(id: string, role: StaffRole) {
    await fetch(`/api/invites/${id}`, { method: "DELETE" });
    setCreatingInvite(true);
    setNewInvite(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (res.ok) setNewInvite(json);
      await loadAll();
    } finally {
      setCreatingInvite(false);
    }
  }

  function startEdit(s: StaffEntry) {
    setEditingId(s.user_id);
    setEditName(s.display_name);
    setEditRole(s.role);
    setEditError(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/staff/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: editName, role: editRole }),
      });
      const json = await res.json();
      if (!res.ok) { setEditError(json.error); return; }
      setEditingId(null);
      await loadAll();
    } finally {
      setEditSaving(false);
    }
  }

  async function toggleActive(s: StaffEntry) {
    const res = await fetch(`/api/staff/${s.user_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !s.is_active }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error);
      return;
    }
    await loadAll();
  }

  function copyInviteLink(code: string) {
    const link = `${window.location.origin}/register?invite=${code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-green-100 text-green-800 border-green-300",
      used: "bg-gray-100 text-gray-600 border-gray-300",
      expired: "bg-yellow-100 text-yellow-800 border-yellow-300",
      revoked: "bg-red-100 text-red-700 border-red-300",
    };
    return (
      <span className={`text-xs border px-2 py-0.5 rounded-full ${map[status] ?? ""}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) return <div className="panel p-6 text-sm text-[var(--muted)]">Загрузка...</div>;
  if (error) return <div className="panel p-6 text-sm text-red-700">{error}</div>;

  return (
    <div className="space-y-5">
      {/* Staff list */}
      <section className="panel p-6">
        <h2 className="text-xl font-semibold mb-4">Сотрудники</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-[var(--muted)] border-b border-[var(--line)]">
                <th className="pb-3 pr-4">Имя</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Роль</th>
                <th className="pb-3 pr-4">Статус</th>
                <th className="pb-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((s) => (
                <tr key={s.user_id} className="border-b border-[var(--line)] last:border-0">
                  <td className="py-3 pr-4">
                    {editingId === s.user_id ? (
                      <input
                        className="input text-sm py-1"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    ) : (
                      <span className="font-medium">{s.display_name}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-[var(--muted)]">{s.email ?? "—"}</td>
                  <td className="py-3 pr-4">
                    {editingId === s.user_id ? (
                      <select
                        className="input text-sm py-1"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as StaffRole)}
                      >
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className="text-[var(--muted)]">{ROLE_LABEL[s.role]}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs border px-2 py-0.5 rounded-full ${
                      s.is_active
                        ? "bg-green-100 text-green-800 border-green-300"
                        : "bg-gray-100 text-gray-500 border-gray-300"
                    }`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3">
                    {editingId === s.user_id ? (
                      <div className="flex gap-2 items-center">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={editSaving}
                          className="text-xs text-[var(--accent)] hover:underline"
                        >
                          {editSaving ? "..." : "Сохранить"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-xs text-[var(--muted)] hover:underline"
                        >
                          Отмена
                        </button>
                        {editError && <span className="text-xs text-red-700">{editError}</span>}
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className="text-xs text-[var(--accent)] hover:underline"
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(s)}
                          className="text-xs text-[var(--muted)] hover:text-[var(--text)] hover:underline"
                        >
                          {s.is_active ? "Деактивировать" : "Активировать"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Invite creation */}
      <section className="panel p-6">
        <h2 className="text-xl font-semibold mb-4">Новое приглашение</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Роль</span>
            <select
              className="input"
              value={newInviteRole}
              onChange={(e) => setNewInviteRole(e.target.value as StaffRole)}
            >
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button
            type="button"
            onClick={createInvite}
            disabled={creatingInvite}
            className="action-btn"
          >
            {creatingInvite ? "Создаём..." : "Создать приглашение"}
          </button>
        </div>

        {newInvite && (
          <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="text-xs text-[var(--muted)] mb-2">Код показывается только один раз:</p>
            <p className="font-mono text-sm font-bold tracking-wider mb-3">{newInvite.plain_code}</p>
            <button
              type="button"
              onClick={() => copyInviteLink(newInvite.plain_code)}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              {copied ? "Скопировано!" : "Скопировать ссылку приглашения"}
            </button>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Действует до {new Date(newInvite.expires_at).toLocaleString("ru-RU")}
            </p>
          </div>
        )}
      </section>

      {/* Invites list */}
      <section className="panel p-6">
        <h2 className="text-xl font-semibold mb-4">Приглашения</h2>
        {invites.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Нет приглашений.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.14em] text-[var(--muted)] border-b border-[var(--line)]">
                  <th className="pb-3 pr-4">Роль</th>
                  <th className="pb-3 pr-4">Статус</th>
                  <th className="pb-3 pr-4">Создан</th>
                  <th className="pb-3 pr-4">Использован</th>
                  <th className="pb-3">Действия</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="py-3 pr-4">{ROLE_LABEL[inv.role]}</td>
                    <td className="py-3 pr-4">{statusBadge(inv.status)}</td>
                    <td className="py-3 pr-4 text-[var(--muted)]">
                      {inv.created_by_name ?? "—"}
                      <br />
                      <span className="text-xs">{new Date(inv.created_at).toLocaleDateString("ru-RU")}</span>
                    </td>
                    <td className="py-3 pr-4 text-[var(--muted)]">
                      {inv.used_by_name ? (
                        <>
                          {inv.used_by_name}
                          <br />
                          <span className="text-xs">{inv.used_at ? new Date(inv.used_at).toLocaleDateString("ru-RU") : ""}</span>
                        </>
                      ) : "—"}
                    </td>
                    <td className="py-3">
                      {inv.status === "active" && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => revokeInvite(inv.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Отозвать
                          </button>
                          <button
                            type="button"
                            onClick={() => regenerateInvite(inv.id, inv.role)}
                            className="text-xs text-[var(--accent)] hover:underline"
                          >
                            Обновить
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

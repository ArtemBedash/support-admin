"use client";

import { useState } from "react";
import { SignOutButton } from "./sign-out-button";
import type { StaffProfile, StaffRole } from "../_types/staff";

type View = "dialogs" | "search" | "bot-prompt" | "staff";

type Props = {
  currentStaff: StaffProfile;
  activeView: View;
  onNavigate: (view: View) => void;
};

const NAV_ITEMS: { view: View; label: string; adminOnly: boolean }[] = [
  { view: "dialogs", label: "Диалоги", adminOnly: false },
  { view: "search", label: "Семантический поиск", adminOnly: false },
  { view: "bot-prompt", label: "Настройки бота", adminOnly: true },
  { view: "staff", label: "Сотрудники", adminOnly: true },
];

const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "Admin",
  manager: "Manager",
};

export function Sidebar({ currentStaff, activeView, onNavigate }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || currentStaff.role === "admin"
  );

  const navContent = (
    <nav className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4 border-b border-[var(--line)]">
        <p className="text-[10px] tracking-[0.22em] text-[var(--muted)] uppercase">Support Admin</p>
        <p className="mt-2 text-base font-semibold leading-tight text-[var(--text)]">
          {currentStaff.display_name}
        </p>
        <span className="mt-1 inline-block text-[11px] text-[var(--muted)] border border-[var(--line)] rounded-full px-2 py-0.5">
          {ROLE_LABEL[currentStaff.role]}
        </span>
      </div>

      <ul className="flex-1 px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => (
          <li key={item.view}>
            <button
              type="button"
              onClick={() => { onNavigate(item.view); setMobileOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                activeView === item.view
                  ? "bg-[var(--accent)] text-white font-semibold shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
              }`}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="px-5 py-4 border-t border-[var(--line)]">
        <SignOutButton />
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 panel overflow-hidden">
        {navContent}
      </aside>

      {/* Mobile toggle */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="fixed top-4 left-4 z-50 flex items-center gap-2 panel px-3 py-2 text-sm font-medium text-[var(--text)] shadow-sm"
        >
          <span className="text-base leading-none">{mobileOpen ? "✕" : "☰"}</span>
          <span className="text-xs">Меню</span>
        </button>

        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="fixed left-0 top-0 bottom-0 z-50 w-64 panel flex flex-col overflow-hidden shadow-2xl">
              {navContent}
            </aside>
          </>
        )}
      </div>
    </>
  );
}

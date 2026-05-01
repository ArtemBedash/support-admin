"use client";

import React, { useState } from "react";
import { SignOutButton } from "./sign-out-button";
import type { StaffProfile, StaffRole } from "../_types/staff";

type View = "dialogs" | "search" | "bot-prompt" | "knowledge-base" | "staff";

type Props = {
  currentStaff: StaffProfile;
  activeView: View;
  onNavigate: (view: View) => void;
};

function IconDialogs() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}
function IconBot() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 11V7"/><circle cx="12" cy="5" r="2"/><path d="M8 15h.01M16 15h.01"/>
    </svg>
  );
}
function IconKnowledge() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}
function IconStaff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

const NAV_ITEMS: { view: View; label: string; adminOnly: boolean; Icon: () => React.ReactElement }[] = [
  { view: "dialogs", label: "Диалоги", adminOnly: false, Icon: IconDialogs },
  { view: "search", label: "Семантический поиск", adminOnly: false, Icon: IconSearch },
  { view: "bot-prompt", label: "Настройки бота", adminOnly: true, Icon: IconBot },
  { view: "knowledge-base", label: "База знаний", adminOnly: true, Icon: IconKnowledge },
  { view: "staff", label: "Сотрудники", adminOnly: true, Icon: IconStaff },
];

const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "Admin",
  manager: "Manager",
};

export function Sidebar({ currentStaff, activeView, onNavigate }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || currentStaff.role === "admin"
  );

  const navContent = (
    <nav className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-4 border-b border-[var(--line)] flex items-start justify-between gap-2">
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.22em] text-[var(--muted)] uppercase">Support Admin</p>
            <p className="mt-1.5 text-sm font-semibold leading-tight text-[var(--text)] truncate">
              {currentStaff.display_name}
            </p>
            <span className="mt-1 inline-block text-[11px] text-[var(--muted)] border border-[var(--line)] rounded-full px-2 py-0.5">
              {ROLE_LABEL[currentStaff.role]}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="shrink-0 mt-0.5 text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          title={collapsed ? "Развернуть" : "Свернуть"}
        >
          {collapsed ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          )}
        </button>
      </div>

      <ul className="flex-1 px-2 py-3 space-y-0.5 overflow-hidden">
        {visibleItems.map((item) => (
          <li key={item.view}>
            <button
              type="button"
              onClick={() => onNavigate(item.view)}
              title={collapsed ? item.label : undefined}
              className={`cursor-pointer w-full rounded-xl text-sm transition-all duration-150 flex items-center ${
                collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
              } ${
                activeView === item.view
                  ? "bg-[var(--accent)] text-white font-semibold shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
              }`}
            >
              <item.Icon />
              {!collapsed && item.label}
            </button>
          </li>
        ))}
      </ul>

      {!collapsed && (
        <div className="px-4 py-4 border-t border-[var(--line)]">
          <SignOutButton />
        </div>
      )}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 panel overflow-hidden transition-all duration-200 ${
          collapsed ? "w-12" : "w-56"
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile toggle */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="cursor-pointer fixed top-4 left-4 z-50 flex items-center gap-2 panel px-3 py-2 text-sm font-medium text-[var(--text)] shadow-sm"
        >
          {collapsed ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          )}
          {collapsed && <span className="text-xs">Меню</span>}
        </button>

        {!collapsed && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setCollapsed(true)}
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

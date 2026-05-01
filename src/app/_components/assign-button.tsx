"use client";

import type { StaffProfile, StaffRole } from "../_types/staff";

type StaffOption = { user_id: string; display_name: string; role: StaffRole };

type Props = {
  assignedTo: string | null;
  assignedToName: string | null;
  currentStaff: StaffProfile;
  staffList: StaffOption[];
  onAssignTo: (userId: string) => void;
  onUnassign: () => void;
};

export function AssignButton({ assignedTo, assignedToName, currentStaff, staffList, onAssignTo, onUnassign }: Props) {
  const isAdmin = currentStaff.role === "admin";
  const isMine = assignedTo === currentStaff.user_id;

  if (!assignedTo) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onAssignTo(currentStaff.user_id)}
          className="text-xs text-[var(--accent)] hover:underline"
        >
          Взять на себя
        </button>
        {isAdmin && staffList.length > 1 && (
          <select
            className="text-xs border border-[var(--line)] rounded-lg px-1.5 py-0.5 bg-[var(--surface-soft)] text-[var(--muted)] max-w-[140px]"
            defaultValue=""
            onChange={(e) => { if (e.target.value) onAssignTo(e.target.value); }}
          >
            <option value="" disabled>Назначить на...</option>
            {staffList.map((s) => (
              <option key={s.user_id} value={s.user_id}>{s.display_name}</option>
            ))}
          </select>
        )}
      </div>
    );
  }

  if (isMine) {
    return (
      <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-green-600">Вы</span>
        <button
          type="button"
          onClick={onUnassign}
          className="text-xs text-[var(--muted)] hover:underline"
        >
          Снять
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <span className="text-xs text-[var(--muted)]">
        {assignedToName ?? "Назначен"}
      </span>
      <button
        type="button"
        onClick={() => onAssignTo(currentStaff.user_id)}
        className="text-xs text-[var(--accent)] hover:underline"
      >
        Взять на себя
      </button>
      {isAdmin && (
        <>
          <button
            type="button"
            onClick={onUnassign}
            className="text-xs text-[var(--muted)] hover:underline"
          >
            Снять
          </button>
          <select
            className="text-xs border border-[var(--line)] rounded-lg px-1.5 py-0.5 bg-[var(--surface-soft)] text-[var(--muted)] max-w-[140px]"
            defaultValue=""
            onChange={(e) => { if (e.target.value) onAssignTo(e.target.value); }}
          >
            <option value="" disabled>Переназначить на...</option>
            {staffList.filter((s) => s.user_id !== assignedTo).map((s) => (
              <option key={s.user_id} value={s.user_id}>{s.display_name}</option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}

"use client";

type Props = {
  assignedTo: string | null;
  currentUserId: string | null;
  onAssign: () => void;
  onUnassign: () => void;
};

// Кнопка назначения менеджера на диалог.
// Показывает разный UI в зависимости от того, кто назначен.
export function AssignButton({ assignedTo, currentUserId, onAssign, onUnassign }: Props) {
  if (!assignedTo) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAssign(); }}
        className="mt-2 cursor-pointer text-xs text-[var(--accent)] hover:underline"
      >
        Взять на себя
      </button>
    );
  }

  if (assignedTo === currentUserId) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-green-600">Вы</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onUnassign(); }}
          className="cursor-pointer text-xs text-[var(--muted)] hover:underline"
        >
          Снять
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-xs text-[var(--muted)]">Назначен</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAssign(); }}
        className="cursor-pointer text-xs text-[var(--accent)] hover:underline"
      >
        Переназначить на себя
      </button>
    </div>
  );
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getCurrentStaff } from "@/lib/staff";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const staff = await getCurrentStaff();
    if (!staff || !staff.is_active) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { assigned_to } = await req.json();

    if (assigned_to !== null && typeof assigned_to !== "string") {
      return NextResponse.json({ error: "assigned_to must be a uuid string or null." }, { status: 400 });
    }

    const supabase = await createClient();

    // Читаем текущее состояние диалога
    const { data: dialog } = await supabase
      .from("dialogs")
      .select("id, assigned_to, assigned_at, last_staff_reply_at")
      .eq("id", id)
      .single();

    if (!dialog) {
      return NextResponse.json({ error: "Диалог не найден." }, { status: 404 });
    }

    // Правила для manager
    if (staff.role === "manager") {
      const currentlyAssigned = dialog.assigned_to;
      const isMine = currentlyAssigned === staff.user_id;
      const isFree = currentlyAssigned === null;

      if (assigned_to === null) {
        // Снять назначение — только со своего диалога
        if (!isMine) {
          return NextResponse.json({ error: "Можно снять назначение только со своего диалога." }, { status: 403 });
        }
      } else if (assigned_to === staff.user_id) {
        // Взять диалог — только свободный или просроченный
        if (!isFree && !isMine) {
          // Проверяем stale: 24ч без ответа сотрудника
          const referenceTime = dialog.last_staff_reply_at ?? dialog.assigned_at;
          if (!referenceTime) {
            return NextResponse.json({ error: "Диалог назначен другому сотруднику." }, { status: 403 });
          }
          const staleMs = Date.now() - new Date(referenceTime).getTime();
          if (staleMs < 24 * 60 * 60 * 1000) {
            return NextResponse.json({ error: "Диалог назначен другому сотруднику." }, { status: 403 });
          }
        }
      } else {
        // Manager не может назначать на других
        return NextResponse.json({ error: "Менеджер не может назначать диалог другому сотруднику." }, { status: 403 });
      }
    }
    // Admin может делать всё — без дополнительных проверок

    const updates: Record<string, unknown> = {
      assigned_to,
      assigned_at: assigned_to ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from("dialogs")
      .update(updates)
      .eq("id", id)
      .select("id, assigned_to, assigned_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ dialog: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

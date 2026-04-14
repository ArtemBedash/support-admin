/**
 * PATCH /api/dialogs/[id]/assign — назначить менеджера на диалог.
 *
 * Body: { assigned_to: "uuid" }  — назначить менеджера
 *       { assigned_to: null }    — снять назначение
 *
 * Флоу:
 *   1. Берём id диалога из URL параметра [id].
 *   2. Берём assigned_to из тела запроса.
 *   3. Обновляем поле assigned_to в таблице dialogs.
 *   4. Возвращаем обновлённый диалог.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

type Params = {
  // id — это UUID диалога из URL: /api/dialogs/[id]/assign
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, { params }: Params) {
  try {
    // Достаём id диалога из URL.
    const { id } = await params;

    // Достаём assigned_to из тела запроса.
    // assigned_to — это UUID менеджера из auth.users, или null чтобы снять назначение.
    const { assigned_to } = await req.json();

    // Валидация: принимаем только строку (uuid) или null.
    if (assigned_to !== null && typeof assigned_to !== "string") {
      return NextResponse.json(
        { error: "assigned_to must be a uuid string or null." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Обновляем одну запись в dialogs по id.
    // .select() после .update() — возвращаем обновлённые данные сразу.
    // .single() — ожидаем ровно одну строку.
    const { data, error } = await supabase
      .from("dialogs")
      .update({ assigned_to })
      .eq("id", id)
      .select("id, assigned_to")
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

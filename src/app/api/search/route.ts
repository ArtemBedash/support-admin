import { NextResponse } from "next/server";
import { createEmbedding } from "@/lib/openai";
import { searchMessagesByVector } from "@/lib/vector-search";

export const dynamic = "force-dynamic";

type SearchBody = {
  query?: string;
  chatId?: number | null;
  limit?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SearchBody;
    const query = body.query?.trim() ?? "";

    if (!query) {
      return NextResponse.json({ error: "Query is required." }, { status: 400 });
    }

    const limit = Math.min(Math.max(body.limit ?? 8, 1), 20);
    const chatId = typeof body.chatId === "number" ? body.chatId : null;

    const embedding = await createEmbedding(query);
    const results = await searchMessagesByVector({ embedding, limit, chatId });

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

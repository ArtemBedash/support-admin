import { NextResponse } from "next/server";
import { createEmbedding } from "@/lib/openai";
import { createChatAnswer } from "@/lib/openai-chat";
import { searchMessagesByVector } from "@/lib/vector-search";

export const dynamic = "force-dynamic";

type ChatBody = {
  message?: string;
  chatId?: number | null;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatBody;
    const message = body.message?.trim() ?? "";

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const chatId = typeof body.chatId === "number" ? body.chatId : null;
    const embedding = await createEmbedding(message);
    const contextResults = await searchMessagesByVector({
      embedding,
      limit: 8,
      chatId,
    });

    const contextBlock = contextResults.length
      ? contextResults
          .map((item, idx) => {
            const user = [item.first_name, item.last_name].filter(Boolean).join(" ") || item.username || "Unknown";
            return `${idx + 1}. [score=${item.similarity.toFixed(3)}] user=${user} chat_id=${item.telegram_chat_id} text=${item.text}`;
          })
          .join("\n")
      : "No relevant messages found.";

    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

    const messages = [
      {
        role: "system" as const,
        content:
          "You are a support assistant for New Era AI Support Board. Reply in Russian unless user writes in another language. Use the provided context from Telegram messages when relevant. If context is missing, say it clearly and ask a clarifying question.",
      },
      {
        role: "system" as const,
        content: `Context from semantic search:\n${contextBlock}`,
      },
      ...history.map((item) => ({ role: item.role, content: item.content })),
      { role: "user" as const, content: message },
    ];

    const answer = await createChatAnswer(messages);

    return NextResponse.json({
      answer,
      references: contextResults.map((item) => ({
        id: item.id,
        chat_id: item.telegram_chat_id,
        text: item.text,
        similarity: Number(item.similarity.toFixed(3)),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

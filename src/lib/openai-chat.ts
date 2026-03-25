const DEFAULT_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function createChatAnswer(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_CHAT_MODEL,
      messages,
      temperature: 0.4,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat API failed (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const answer = payload?.choices?.[0]?.message?.content;
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("Chat API returned empty answer.");
  }

  return answer.trim();
}

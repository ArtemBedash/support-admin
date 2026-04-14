/**
 * openai.ts — утилита для генерации embeddings через OpenAI API.
 *
 * Embedding — числовой вектор из 1536 чисел, который представляет смысл текста.
 * Похожие по смыслу тексты дают похожие векторы — это основа семантического поиска.
 *
 * Используется в:
 *   - /api/search — превращаем поисковый запрос менеджера в вектор
 *   - /api/chat — превращаем вопрос менеджера в вектор для поиска контекста
 */

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMS = 1536;

/**
 * Принимает строку текста, возвращает массив из 1536 чисел.
 * Бросает ошибку если OpenAI недоступен или вернул неожиданный формат.
 */
export async function createEmbedding(input: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing.");

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
    // no-store — не кешируем, каждый запрос должен давать свежий вектор.
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API failed (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const embedding = payload?.data?.[0]?.embedding;

  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMS) {
    throw new Error("Embedding dimension mismatch.");
  }

  return embedding;
}

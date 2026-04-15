/**
 * sync-kb.mjs — синхронизация базы знаний с Supabase.
 *
 * Запускается как prebuild шаг на Vercel (и локально через `node scripts/sync-kb.mjs`).
 *
 * Флоу:
 *   1. Читаем все .md файлы из папки knowledge-base/
 *   2. Чанкуем по ## заголовкам
 *   3. Для каждого чанка генерируем эмбеддинг через OpenAI
 *   4. Делаем upsert в таблицу knowledge_base по (file, heading)
 */

import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_DIR = join(__dirname, "../knowledge-base");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !OPENAI_API_KEY) {
  console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, OPENAI_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

/** Разбивает markdown на чанки по ## заголовкам */
function chunkByHeadings(content, filename) {
  const chunks = [];
  const lines = content.split("\n");

  let currentHeading = null;
  let currentLines = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentHeading !== null && currentLines.length > 0) {
        chunks.push({
          file: filename,
          heading: currentHeading,
          content: currentLines.join("\n").trim(),
        });
      }
      currentHeading = line.replace(/^##\s+/, "").trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Последний чанк
  if (currentHeading !== null && currentLines.length > 0) {
    chunks.push({
      file: filename,
      heading: currentHeading,
      content: currentLines.join("\n").trim(),
    });
  }

  return chunks;
}

/** Генерирует эмбеддинг через OpenAI text-embedding-3-small */
async function getEmbedding(text) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI embeddings error: ${err}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function main() {
  console.log("🔄 Syncing knowledge base...");

  const files = (await readdir(KB_DIR)).filter((f) => f.endsWith(".md"));
  console.log(`Found ${files.length} files: ${files.join(", ")}`);

  let totalChunks = 0;

  for (const filename of files) {
    const content = await readFile(join(KB_DIR, filename), "utf-8");
    const chunks = chunkByHeadings(content, filename);

    console.log(`  ${filename}: ${chunks.length} chunks`);

    for (const chunk of chunks) {
      const embedding = await getEmbedding(`${chunk.heading}\n\n${chunk.content}`);

      const { error } = await supabase
        .from("knowledge_base")
        .upsert(
          {
            file: chunk.file,
            heading: chunk.heading,
            content: chunk.content,
            embedding,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "file,heading" }
        );

      if (error) {
        console.error(`  ❌ Error upserting "${chunk.heading}":`, error.message);
      } else {
        console.log(`  ✅ ${chunk.heading}`);
      }
    }

    totalChunks += chunks.length;
  }

  console.log(`\n✅ Done. Synced ${totalChunks} chunks.`);
}

main().catch((err) => {
  console.error("sync-kb failed:", err);
  process.exit(1);
});

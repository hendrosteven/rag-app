import OpenAI from "openai";
import "dotenv/config";

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "[WARNING] OPENAI_API_KEY belum diset. Buat file .env berdasarkan .env.example."
  );
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
export const CHAT_MODEL = process.env.CHAT_MODEL || "gpt-4o-mini";

/** Ambil embedding untuk banyak teks sekaligus (batch), lebih efisien daripada satu-satu. */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  // OpenAI membatasi jumlah input per request; batch per 100 untuk aman.
  const BATCH_SIZE = 100;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    for (const item of response.data) {
      results.push(item.embedding);
    }
  }

  return results;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const [embedding] = await getEmbeddings([text]);
  return embedding;
}

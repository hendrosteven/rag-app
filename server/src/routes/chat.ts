import { Router } from "express";
import { getAllChunksWithDocuments } from "../db.js";
import { getEmbedding, openai, CHAT_MODEL } from "../openaiClient.js";
import { cosineSimilarity } from "../similarity.js";
import type { ChatMessage, RetrievedChunk } from "../types.js";

export const chatRouter = Router();

const TOP_K = 5;

function retrieveRelevantChunks(queryEmbedding: number[]): RetrievedChunk[] {
  const allChunks = getAllChunksWithDocuments();

  const scored = allChunks.map((c) => {
    const embedding = JSON.parse(c.embedding) as number[];
    return {
      documentId: c.documentId,
      documentName: c.documentName,
      chunkIndex: c.chunkIndex,
      content: c.content,
      score: cosineSimilarity(queryEmbedding, embedding),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, TOP_K);
}

function buildPrompt(question: string, context: RetrievedChunk[]): string {
  const contextBlock = context
    .map(
      (c, i) =>
        `[Sumber ${i + 1}: ${c.documentName}, bagian ${c.chunkIndex + 1}]\n${c.content}`
    )
    .join("\n\n---\n\n");

  return `Berikut adalah potongan-potongan dokumen yang relevan dengan pertanyaan pengguna:

${contextBlock}

---

Berdasarkan konteks di atas, jawab pertanyaan berikut dengan akurat dan ringkas.
Jika informasi yang dibutuhkan tidak ada dalam konteks, katakan dengan jujur bahwa kamu tidak menemukan jawabannya dalam dokumen, jangan mengarang.
Saat menjawab, sebutkan sumber (nomor sumber) yang kamu gunakan jika relevan.

Pertanyaan: ${question}`;
}

// POST /api/chat - tanya jawab berbasis dokumen yang sudah diupload
chatRouter.post("/", async (req, res) => {
  const { question, history } = req.body as {
    question?: string;
    history?: ChatMessage[];
  };

  if (!question || question.trim().length === 0) {
    return res.status(400).json({ error: "Pertanyaan tidak boleh kosong." });
  }

  try {
    const queryEmbedding = await getEmbedding(question);
    const relevantChunks = retrieveRelevantChunks(queryEmbedding);

    if (relevantChunks.length === 0) {
      return res.json({
        answer:
          "Belum ada dokumen yang bisa dijadikan referensi. Silakan upload dokumen terlebih dahulu.",
        sources: [],
      });
    }

    const prompt = buildPrompt(question, relevantChunks);

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      {
        role: "system",
        content:
          "Kamu adalah asisten yang menjawab pertanyaan HANYA berdasarkan konteks dokumen yang diberikan.",
      },
      ...(history || []).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: prompt },
    ];

    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      temperature: 0.3,
    });

    const answer = completion.choices[0]?.message?.content ?? "Maaf, tidak ada jawaban yang dihasilkan.";

    res.json({
      answer,
      sources: relevantChunks.map((c) => ({
        documentName: c.documentName,
        chunkIndex: c.chunkIndex,
        score: Number(c.score.toFixed(3)),
        preview: c.content.slice(0, 150) + (c.content.length > 150 ? "..." : ""),
      })),
    });
  } catch (err) {
    console.error("Gagal memproses chat:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Gagal memproses pertanyaan.",
    });
  }
});

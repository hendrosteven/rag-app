import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  createDocument,
  setDocumentStatus,
  listDocuments,
  deleteDocument,
  insertChunk,
} from "../db.js";
import { extractText } from "../documentProcessor.js";
import { chunkText } from "../chunking.js";
import { getEmbeddings } from "../openaiClient.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

export const documentsRouter = Router();

// GET /api/documents - list semua dokumen
documentsRouter.get("/", (_req, res) => {
  const docs = listDocuments();
  res.json({ documents: docs });
});

// POST /api/documents/upload - upload & proses dokumen jadi chunk + embedding
documentsRouter.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "Tidak ada file yang diunggah." });
  }

  const documentId = createDocument(file.originalname, file.mimetype);

  try {
    const rawText = await extractText(file.path, file.mimetype, file.originalname);

    if (!rawText || rawText.trim().length === 0) {
      throw new Error("Dokumen tidak mengandung teks yang bisa dibaca.");
    }

    const chunks = chunkText(rawText);
    if (chunks.length === 0) {
      throw new Error("Gagal memecah dokumen menjadi chunk.");
    }

    const embeddings = await getEmbeddings(chunks);

    chunks.forEach((chunk, i) => {
      insertChunk(documentId, i, chunk, embeddings[i]);
    });

    setDocumentStatus(documentId, "ready");

    res.status(201).json({
      message: "Dokumen berhasil diproses.",
      documentId,
      chunkCount: chunks.length,
    });
  } catch (err) {
    console.error("Gagal memproses dokumen:", err);
    setDocumentStatus(documentId, "failed");
    res.status(500).json({
      error: err instanceof Error ? err.message : "Gagal memproses dokumen.",
    });
  } finally {
    // Hapus file sementara setelah teksnya diekstrak (tidak perlu simpan file asli)
    await fs.unlink(file.path).catch(() => {});
  }
});

// DELETE /api/documents/:id - hapus dokumen beserta chunk-nya
documentsRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "ID dokumen tidak valid." });
  }
  deleteDocument(id);
  res.json({ message: "Dokumen dihapus." });
});

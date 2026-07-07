import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { ChunkRow, DocumentRecord } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "rag.db");
export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// --- Schema ---
db.exec(`
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing'
);

CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
`);

// --- Documents ---
export function createDocument(originalName: string, mimeType: string): number {
  const stmt = db.prepare(
    `INSERT INTO documents (original_name, mime_type, uploaded_at, status)
     VALUES (?, ?, ?, 'processing')`
  );
  const info = stmt.run(originalName, mimeType, new Date().toISOString());
  return Number(info.lastInsertRowid);
}

export function setDocumentStatus(id: number, status: "ready" | "failed") {
  db.prepare(`UPDATE documents SET status = ? WHERE id = ?`).run(status, id);
}

export function listDocuments(): DocumentRecord[] {
  const rows = db
    .prepare(
      `SELECT d.id as id,
              d.original_name as originalName,
              d.mime_type as mimeType,
              d.uploaded_at as uploadedAt,
              d.status as status,
              COUNT(c.id) as chunkCount
       FROM documents d
       LEFT JOIN chunks c ON c.document_id = d.id
       GROUP BY d.id
       ORDER BY d.uploaded_at DESC`
    )
    .all() as DocumentRecord[];
  return rows;
}

export function deleteDocument(id: number) {
  db.prepare(`DELETE FROM chunks WHERE document_id = ?`).run(id);
  db.prepare(`DELETE FROM documents WHERE id = ?`).run(id);
}

// --- Chunks ---
export function insertChunk(documentId: number, chunkIndex: number, content: string, embedding: number[]) {
  db.prepare(
    `INSERT INTO chunks (document_id, chunk_index, content, embedding) VALUES (?, ?, ?, ?)`
  ).run(documentId, chunkIndex, content, JSON.stringify(embedding));
}

export function getAllChunksWithDocuments(): (ChunkRow & { documentName: string })[] {
  const rows = db
    .prepare(
      `SELECT c.id as id,
              c.document_id as documentId,
              c.chunk_index as chunkIndex,
              c.content as content,
              c.embedding as embedding,
              d.original_name as documentName
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
       WHERE d.status = 'ready'`
    )
    .all() as (ChunkRow & { documentName: string })[];
  return rows;
}

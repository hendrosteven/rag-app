export interface DocumentRecord {
  id: number;
  originalName: string;
  mimeType: string;
  uploadedAt: string;
  chunkCount: number;
  status: "processing" | "ready" | "failed";
}

export interface ChunkRow {
  id: number;
  documentId: number;
  chunkIndex: number;
  content: string;
  embedding: string; // JSON-encoded number[] di SQLite
}

export interface RetrievedChunk {
  documentId: number;
  documentName: string;
  chunkIndex: number;
  content: string;
  score: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

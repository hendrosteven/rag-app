export interface DocumentInfo {
  id: number;
  originalName: string;
  mimeType: string;
  uploadedAt: string;
  status: "processing" | "ready" | "failed";
  chunkCount: number;
}

export interface ChatSource {
  documentName: string;
  chunkIndex: number;
  score: number;
  preview: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}

export async function fetchDocuments(): Promise<DocumentInfo[]> {
  const res = await fetch("/api/documents");
  if (!res.ok) throw new Error("Gagal mengambil daftar dokumen");
  const data = await res.json();
  return data.documents;
}

export async function uploadDocument(file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/documents/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload gagal" }));
    throw new Error(err.error || "Upload gagal");
  }
}

export async function deleteDocument(id: number): Promise<void> {
  const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Gagal menghapus dokumen");
}

export async function askQuestion(
  question: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Gagal mendapatkan jawaban" }));
    throw new Error(err.error || "Gagal mendapatkan jawaban");
  }

  return res.json();
}

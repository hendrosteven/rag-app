import { useCallback, useEffect, useRef, useState } from "react";
import {
  DocumentInfo,
  deleteDocument,
  fetchDocuments,
  uploadDocument,
} from "../api";

const STATUS_LABEL: Record<DocumentInfo["status"], string> = {
  processing: "Memproses...",
  ready: "Siap",
  failed: "Gagal",
};

export default function UploadPanel({ onDocumentsChange }: { onDocumentsChange?: () => void }) {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
      onDocumentsChange?.();
    } catch (err) {
      console.error(err);
    }
  }, [onDocumentsChange]);

  useEffect(() => {
    loadDocuments();
    // Poll setiap 3 detik selagi ada dokumen yang masih "processing"
    const interval = setInterval(() => {
      loadDocuments();
    }, 3000);
    return () => clearInterval(interval);
  }, [loadDocuments]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      await uploadDocument(file);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteDocument(id);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus dokumen");
    }
  };

  return (
    <div className="panel upload-panel">
      <h2>Dokumen</h2>

      <label className="upload-button">
        {isUploading ? "Mengunggah..." : "+ Upload Dokumen"}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={handleFileChange}
          disabled={isUploading}
          hidden
        />
      </label>

      {error && <p className="error-text">{error}</p>}

      <ul className="document-list">
        {documents.length === 0 && <li className="empty-state">Belum ada dokumen.</li>}
        {documents.map((doc) => (
          <li key={doc.id} className={`document-item status-${doc.status}`}>
            <div className="document-info">
              <span className="document-name">{doc.originalName}</span>
              <span className="document-meta">
                {STATUS_LABEL[doc.status]}
                {doc.status === "ready" && ` · ${doc.chunkCount} chunk`}
              </span>
            </div>
            <button className="delete-button" onClick={() => handleDelete(doc.id)} title="Hapus dokumen">
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

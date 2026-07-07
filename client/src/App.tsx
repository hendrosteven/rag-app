import { useState } from "react";
import UploadPanel from "./components/UploadPanel";
import ChatPanel from "./components/ChatPanel";
import { fetchDocuments } from "./api";

function App() {
  const [hasReadyDocuments, setHasReadyDocuments] = useState(false);

  const checkDocuments = async () => {
    try {
      const docs = await fetchDocuments();
      setHasReadyDocuments(docs.some((d) => d.status === "ready"));
    } catch {
      // abaikan, biarkan state seperti sebelumnya
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>📚 RAG Chat</h1>
        <p>Upload dokumen, lalu tanya apa saja tentang isinya.</p>
      </header>

      <main className="app-main">
        <UploadPanel onDocumentsChange={checkDocuments} />
        <ChatPanel hasDocuments={hasReadyDocuments} />
      </main>
    </div>
  );
}

export default App;

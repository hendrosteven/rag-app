import { useRef, useState, useEffect } from "react";
import { askQuestion, ChatSource } from "../api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

export default function ChatPanel({ hasDocuments }: { hasDocuments: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: question }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const history = newMessages
        .slice(-6) // batasi history biar prompt tidak terlalu panjang
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await askQuestion(question, history);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.answer, sources: response.sources },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Terjadi kesalahan: ${err instanceof Error ? err.message : "tidak diketahui"}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="panel chat-panel">
      <h2>Tanya Jawab</h2>

      <div className="messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="empty-state">
            {hasDocuments
              ? "Silakan ajukan pertanyaan tentang dokumen yang sudah diupload."
              : "Upload dokumen terlebih dahulu, lalu ajukan pertanyaan di sini."}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message message-${msg.role}`}>
            <div className="message-bubble">{msg.content}</div>
            {msg.sources && msg.sources.length > 0 && (
              <details className="sources">
                <summary>Sumber ({msg.sources.length})</summary>
                <ul>
                  {msg.sources.map((s, j) => (
                    <li key={j}>
                      <strong>{s.documentName}</strong> (bagian {s.chunkIndex + 1}, skor{" "}
                      {s.score}) — {s.preview}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="message message-assistant">
            <div className="message-bubble typing">Sedang berpikir...</div>
          </div>
        )}
      </div>

      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tulis pertanyaan tentang dokumen kamu..."
          rows={2}
          disabled={isLoading}
        />
        <button onClick={handleSend} disabled={isLoading || !input.trim()}>
          Kirim
        </button>
      </div>
    </div>
  );
}

import "dotenv/config";
import express from "express";
import cors from "cors";
import { documentsRouter } from "./routes/documents.js";
import { chatRouter } from "./routes/chat.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/documents", documentsRouter);
app.use("/api/chat", chatRouter);

app.listen(PORT, () => {
  console.log(`🚀 RAG server berjalan di http://localhost:${PORT}`);
});

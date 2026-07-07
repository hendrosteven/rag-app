import fs from "node:fs/promises";
// @ts-ignore - pdf-parse tidak punya types resmi yang sempurna untuk ESM
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export async function extractText(filePath: string, mimeType: string, originalName: string): Promise<string> {
  const lowerName = originalName.toLowerCase();

  if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
    const buffer = await fs.readFile(filePath);
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (lowerName.endsWith(".txt") || lowerName.endsWith(".md") || mimeType.startsWith("text/")) {
    return fs.readFile(filePath, "utf-8");
  }

  throw new Error(`Tipe file tidak didukung: ${mimeType || lowerName}`);
}

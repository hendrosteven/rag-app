/**
 * Memecah teks panjang menjadi chunk-chunk lebih kecil dengan overlap,
 * supaya konteks antar chunk tidak terputus sepenuhnya.
 *
 * Pendekatan ini berbasis jumlah karakter (proxy sederhana untuk token)
 * agar tidak butuh tokenizer tambahan. Untuk teks bahasa Inggris/Indonesia,
 * kira-kira 1 token ~ 4 karakter.
 */
export function chunkText(
  text: string,
  chunkSize = 1200, // karakter per chunk (~300 token)
  overlap = 200 // karakter overlap antar chunk
): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  if (cleaned.length <= chunkSize) {
    return cleaned.length > 0 ? [cleaned] : [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    let end = Math.min(start + chunkSize, cleaned.length);

    // Coba potong di batas paragraf/kalimat terdekat supaya tidak memotong di tengah kata
    if (end < cleaned.length) {
      const lastParagraph = cleaned.lastIndexOf("\n\n", end);
      const lastSentence = cleaned.lastIndexOf(". ", end);
      const boundary = Math.max(lastParagraph, lastSentence);
      if (boundary > start + chunkSize * 0.5) {
        end = boundary + 1;
      }
    }

    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);

    if (end >= cleaned.length) break;
    start = end - overlap;
    if (start < 0) start = 0;
  }

  return chunks;
}

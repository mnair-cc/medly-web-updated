/* eslint-disable @typescript-eslint/no-require-imports */
const pdfParse = require("pdf-parse");

interface PdfParseResult {
  numpages: number;
  text: string;
  info: Record<string, unknown>;
}

/**
 * Extract text content from a PDF file (server-side)
 * @param file - PDF file as Buffer or ArrayBuffer
 * @returns Extracted text content
 */
export async function extractPdfText(file: Buffer | ArrayBuffer): Promise<string> {
  // Convert ArrayBuffer to Buffer if needed
  const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

  const data: PdfParseResult = await pdfParse(buffer);

  return data.text;
}

/**
 * Document conversion utility for converting non-PDF files to PDF
 * Uses CloudConvert API v2 for reliable document conversion
 */

const CONVERTIBLE_EXTENSIONS = [
  ".docx",
  ".pptx",
  ".odt",
  ".rtf",
  ".txt",
  ".html",
  ".htm",
  ".md",
  ".markdown",
  ".tex",
  ".epub"
];

export const SUPPORTED_EXTENSIONS = [".pdf", ...CONVERTIBLE_EXTENSIONS];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const SUPPORTED_FILE_ACCEPT = SUPPORTED_EXTENSIONS.join(",");

export class ConversionError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "ConversionError";
  }
}

/**
 * Get the file extension without the dot
 */
function getFileExtension(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || '';
  return ext;
}

/**
 * Convert a document buffer to PDF using CloudConvert API v2
 */
export async function convertToPdf(
  buffer: Buffer,
  filename: string
): Promise<Buffer> {
  const apiKey = process.env.CLOUDCONVERT_API_KEY;

  if (!apiKey) {
    throw new ConversionError(
      "CloudConvert API key is not configured. Please upload a PDF file."
    );
  }

  const inputFormat = getFileExtension(filename);

  try {
    // Step 1: Create a job with upload, convert, and export tasks
    const jobResponse = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          "upload-task": {
            operation: "import/upload"
          },
          "convert-task": {
            operation: "convert",
            input: "upload-task",
            input_format: inputFormat,
            output_format: "pdf"
          },
          "export-task": {
            operation: "export/url",
            input: "convert-task"
          }
        }
      }),
    });

    if (!jobResponse.ok) {
      const errorData = await jobResponse.json().catch(() => ({ message: "Unknown error" }));
      throw new ConversionError(
        `Failed to create conversion job: ${errorData.message || errorData.error || "Unknown error"}`,
        jobResponse.status
      );
    }

    const jobData = await jobResponse.json();
    const jobId = jobData.data.id;
    const uploadTask = jobData.data.tasks.find((t: any) => t.name === "upload-task");

    if (!uploadTask || !uploadTask.result?.form) {
      throw new ConversionError("Failed to get upload URL from CloudConvert");
    }

    // Step 2: Upload the file
    const uploadFormData = new FormData();

    // Add all form parameters from CloudConvert
    Object.entries(uploadTask.result.form.parameters).forEach(([key, value]) => {
      uploadFormData.append(key, value as string);
    });

    // Add the actual file
    uploadFormData.append("file", new Blob([new Uint8Array(buffer)]), filename);

    const uploadResponse = await fetch(uploadTask.result.form.url, {
      method: uploadTask.result.form.method || "POST",
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      throw new ConversionError(
        `Failed to upload file to CloudConvert: ${uploadResponse.statusText}`,
        uploadResponse.status
      );
    }

    // Step 3: Wait for the job to complete (with timeout of 5 minutes)
    const waitResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}/wait`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(300000), // 5 minute timeout
    });

    if (!waitResponse.ok) {
      const errorData = await waitResponse.json().catch(() => ({ message: "Unknown error" }));
      throw new ConversionError(
        `Conversion job failed: ${errorData.message || errorData.error || "Unknown error"}`,
        waitResponse.status
      );
    }

    const completedJob = await waitResponse.json();

    // Check if job failed
    if (completedJob.data.status === "error") {
      const failedTask = completedJob.data.tasks.find((t: any) => t.status === "error");
      const errorMessage = failedTask?.message || "Conversion failed";
      throw new ConversionError(`CloudConvert error: ${errorMessage}`);
    }

    const exportTask = completedJob.data.tasks.find((t: any) => t.name === "export-task");

    if (!exportTask || !exportTask.result?.files?.[0]?.url) {
      throw new ConversionError("Failed to get download URL from CloudConvert");
    }

    // Step 4: Download the converted PDF
    const pdfResponse = await fetch(exportTask.result.files[0].url);

    if (!pdfResponse.ok) {
      throw new ConversionError(
        `Failed to download converted PDF: ${pdfResponse.statusText}`,
        pdfResponse.status
      );
    }

    return Buffer.from(await pdfResponse.arrayBuffer());

  } catch (error) {
    if (error instanceof ConversionError) {
      throw error;
    }

    // Handle timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ConversionError("Document conversion timed out. Please try a smaller file.");
    }

    console.error("CloudConvert conversion error:", error);
    throw new ConversionError(
      `Document conversion failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate a thumbnail from a PDF buffer using CloudConvert
 */
export async function generateThumbnailFromPdf(
  pdfBuffer: Buffer,
  width: number = 400
): Promise<Buffer> {
  const apiKey = process.env.CLOUDCONVERT_API_KEY;
  if (!apiKey) {
    throw new ConversionError("CloudConvert API key not configured");
  }

  try {
    // Step 1: Create a job with upload, thumbnail, and export tasks
    const jobResponse = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          "upload-task": {
            operation: "import/upload"
          },
          "thumbnail-task": {
            operation: "thumbnail",
            input: "upload-task",
            input_format: "pdf",
            output_format: "jpg",
            width: width,
            fit: "max"
          },
          "export-task": {
            operation: "export/url",
            input: "thumbnail-task"
          }
        }
      }),
    });

    if (!jobResponse.ok) {
      const errorData = await jobResponse.json().catch(() => ({ message: "Unknown error" }));
      throw new ConversionError(
        `Failed to create thumbnail job: ${errorData.message || errorData.error || "Unknown error"}`,
        jobResponse.status
      );
    }

    const jobData = await jobResponse.json();
    const jobId = jobData.data.id;
    const uploadTask = jobData.data.tasks.find((t: any) => t.name === "upload-task");

    if (!uploadTask || !uploadTask.result?.form) {
      throw new ConversionError("Failed to get upload URL from CloudConvert");
    }

    // Step 2: Upload the PDF file
    const uploadFormData = new FormData();
    Object.entries(uploadTask.result.form.parameters).forEach(([key, value]) => {
      uploadFormData.append(key, value as string);
    });
    uploadFormData.append("file", new Blob([new Uint8Array(pdfBuffer)]), "document.pdf");

    const uploadResponse = await fetch(uploadTask.result.form.url, {
      method: uploadTask.result.form.method || "POST",
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      throw new ConversionError(
        `Failed to upload file to CloudConvert: ${uploadResponse.statusText}`,
        uploadResponse.status
      );
    }

    // Step 3: Wait for the job to complete (with timeout of 2 minutes for thumbnail)
    const waitResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}/wait`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(120000), // 2 minute timeout
    });

    if (!waitResponse.ok) {
      const errorData = await waitResponse.json().catch(() => ({ message: "Unknown error" }));
      throw new ConversionError(
        `Thumbnail job failed: ${errorData.message || errorData.error || "Unknown error"}`,
        waitResponse.status
      );
    }

    const completedJob = await waitResponse.json();

    if (completedJob.data.status === "error") {
      const failedTask = completedJob.data.tasks.find((t: any) => t.status === "error");
      const errorMessage = failedTask?.message || "Thumbnail generation failed";
      throw new ConversionError(`CloudConvert error: ${errorMessage}`);
    }

    const exportTask = completedJob.data.tasks.find((t: any) => t.name === "export-task");

    if (!exportTask || !exportTask.result?.files?.[0]?.url) {
      throw new ConversionError("Failed to get thumbnail download URL from CloudConvert");
    }

    // Step 4: Download the thumbnail
    const thumbnailResponse = await fetch(exportTask.result.files[0].url);

    if (!thumbnailResponse.ok) {
      throw new ConversionError(
        `Failed to download thumbnail: ${thumbnailResponse.statusText}`,
        thumbnailResponse.status
      );
    }

    return Buffer.from(await thumbnailResponse.arrayBuffer());

  } catch (error) {
    if (error instanceof ConversionError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ConversionError("Thumbnail generation timed out");
    }

    console.error("CloudConvert thumbnail error:", error);
    throw new ConversionError(
      `Thumbnail generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Check if a file needs conversion (is a supported non-PDF format)
 */
export function needsConversion(filename: string): boolean {
  const lowerName = filename.toLowerCase();
  return CONVERTIBLE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

/**
 * Check if a file format is supported (PDF or convertible)
 */
export function isSupportedFormat(filename: string): boolean {
  const lowerName = filename.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

/**
 * Get human-readable list of supported formats
 */
export function getSupportedFormatsMessage(): string {
  return "Supported formats: PDF, Word (.docx), PowerPoint (.pptx), OpenDocument Text (.odt), Rich Text (.rtf), Plain Text (.txt), HTML (.html), Markdown (.md), LaTeX (.tex), EPUB (.epub)";
}
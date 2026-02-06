/**
 * Captures a hybrid screenshot of the PDF page with overlay elements.
 *
 * This combines:
 * 1. Manual PDF canvas capture (draws PDF canvases to temp canvas)
 * 2. Overlay capture using modern-screenshot (annotations, drawings, etc.)
 * 3. Composite of both layers
 * 4. Compression to 50% resolution, JPEG 0.85 quality
 */

export interface HybridScreenshotResult {
  pageScreenshot: string | null;
  debugScreenshots?: {
    pdfCanvas?: string;
    overlayCapture?: string;
    finalComposite?: string;
  };
}

export async function captureHybridScreenshot(
  scrollContainer: HTMLElement | null
): Promise<HybridScreenshotResult> {
  const result: HybridScreenshotResult = {
    pageScreenshot: null,
    debugScreenshots: {},
  };

  if (!scrollContainer) {
    console.warn("📸 No scroll container provided");
    return result;
  }

  try {
    // Wait for PDF to render
    let pdfRendered = false;
    let attempts = 0;
    const maxAttempts = 30; // 3 seconds max wait

    while (!pdfRendered && attempts < maxAttempts) {
      const pdfCanvases = scrollContainer.querySelectorAll("canvas");
      if (pdfCanvases.length > 0) {
        const hasContent = Array.from(pdfCanvases).some((canvas) => {
          if (canvas.width === 0 || canvas.height === 0) return false;
          try {
            const ctx = canvas.getContext("2d");
            if (!ctx) return false;
            const imageData = ctx.getImageData(
              0,
              0,
              Math.min(canvas.width, 50),
              Math.min(canvas.height, 50)
            );
            return imageData.data.some(
              (pixel, index) => index % 4 === 3 && pixel > 0
            );
          } catch {
            return canvas.width > 100 && canvas.height > 100;
          }
        });
        pdfRendered = hasContent;
      }

      if (!pdfRendered) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }
    }

    if (!pdfRendered) {
      console.warn("📸 PDF not rendered after waiting");
      return result;
    }

    // Additional wait for animations/transitions
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Find PDF viewer container
    const viewerContainer = scrollContainer.querySelector(
      '[data-testid="core__viewer"]'
    ) as HTMLElement;

    if (!viewerContainer) {
      console.warn("📸 No PDF viewer container found");
      return result;
    }

    // Find visible PDF page layer
    const pageLayers = Array.from(
      viewerContainer.querySelectorAll(".rpv-core__page-layer")
    ) as HTMLElement[];
    const containerRect = scrollContainer.getBoundingClientRect();

    let bestArea = -1;
    let bestEl: HTMLElement | null = null;
    pageLayers.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const xOverlap = Math.max(
        0,
        Math.min(containerRect.right, rect.right) -
          Math.max(containerRect.left, rect.left)
      );
      const yOverlap = Math.max(
        0,
        Math.min(containerRect.bottom, rect.bottom) -
          Math.max(containerRect.top, rect.top)
      );
      const area = xOverlap * yOverlap;
      if (area > bestArea) {
        bestArea = area;
        bestEl = el;
      }
    });
    const visiblePageEl = bestEl || viewerContainer;

    // Get PDF canvases from visible page
    const pdfCanvases = (
      Array.from(visiblePageEl.querySelectorAll("canvas")) as HTMLCanvasElement[]
    ).filter((c) => c.offsetParent !== null && c.width > 0 && c.height > 0);

    if (pdfCanvases.length === 0) {
      console.warn("📸 No PDF canvases found");
      return result;
    }

    // Create PDF-only canvas
    const pdfOnlyCanvas = document.createElement("canvas");
    pdfOnlyCanvas.width = scrollContainer.clientWidth;
    pdfOnlyCanvas.height = scrollContainer.clientHeight;
    const pdfCtx = pdfOnlyCanvas.getContext("2d");

    if (!pdfCtx) {
      console.warn("📸 Could not get PDF canvas context");
      return result;
    }

    // Fill with white background
    pdfCtx.fillStyle = "#ffffff";
    pdfCtx.fillRect(0, 0, pdfOnlyCanvas.width, pdfOnlyCanvas.height);

    // Draw each PDF canvas
    pdfCanvases.forEach((pdfCanvas, idx) => {
      try {
        const rect = pdfCanvas.getBoundingClientRect();
        const x = rect.left - containerRect.left;
        const y = rect.top - containerRect.top;
        pdfCtx.drawImage(pdfCanvas, x, y, rect.width, rect.height);
      } catch (err) {
        console.warn(`📸 Failed to draw PDF canvas ${idx}:`, err);
      }
    });

    result.debugScreenshots!.pdfCanvas = pdfOnlyCanvas.toDataURL("image/png");

    // Capture overlay using modern-screenshot
    try {
      const originalBg = scrollContainer.style.backgroundColor;
      scrollContainer.style.backgroundColor = "transparent";

      const { domToDataUrl } = await import("modern-screenshot");
      const containerDataUrl = await domToDataUrl(scrollContainer, {
        scale: 1,
        backgroundColor: null,
        filter: (node) => {
          if (node instanceof HTMLImageElement) return false;
          if (
            node instanceof HTMLElement &&
            node.getAttribute("data-testid") === "core__viewer"
          ) {
            return false;
          }
          if (
            node instanceof HTMLElement &&
            node.classList.contains("rpv-core__page-layer")
          ) {
            return false;
          }
          return true;
        },
      });

      scrollContainer.style.backgroundColor = originalBg;
      result.debugScreenshots!.overlayCapture = containerDataUrl;

      // Load overlay image
      const overlayImg = new Image();
      await new Promise<void>((resolve, reject) => {
        overlayImg.onload = () => resolve();
        overlayImg.onerror = reject;
        overlayImg.src = containerDataUrl;
      });

      // Create composite canvas
      const compositeCanvas = document.createElement("canvas");
      compositeCanvas.width = scrollContainer.clientWidth;
      compositeCanvas.height = scrollContainer.clientHeight;

      // Expose size for coordinate scaling
      try {
        (window as any).__medlyScreenshotSize = {
          width: compositeCanvas.width,
          height: compositeCanvas.height,
        };
      } catch {}

      const ctx = compositeCanvas.getContext("2d");
      if (!ctx) {
        console.warn("📸 Could not get composite canvas context");
        return result;
      }

      // Draw PDF first, then overlay
      ctx.drawImage(pdfOnlyCanvas, 0, 0);
      ctx.drawImage(overlayImg, 0, 0);

      // Compress to 50% resolution
      const compressedCanvas = document.createElement("canvas");
      compressedCanvas.width = Math.floor(compositeCanvas.width * 0.5);
      compressedCanvas.height = Math.floor(compositeCanvas.height * 0.5);
      const compressedCtx = compressedCanvas.getContext("2d");

      if (compressedCtx) {
        compressedCtx.drawImage(
          compositeCanvas,
          0,
          0,
          compressedCanvas.width,
          compressedCanvas.height
        );
        result.pageScreenshot = compressedCanvas.toDataURL("image/jpeg", 0.85);
      } else {
        result.pageScreenshot = compositeCanvas.toDataURL("image/jpeg", 0.85);
      }

      result.debugScreenshots!.finalComposite = result.pageScreenshot;

      console.log("📸 Hybrid screenshot captured:", {
        success: !!result.pageScreenshot,
        size: result.pageScreenshot?.length,
        dimensions: `${compressedCanvas.width}x${compressedCanvas.height}`,
      });
    } catch (overlayError) {
      console.warn("📸 Failed to capture overlay, using PDF only:", overlayError);
      // Fallback to PDF-only screenshot
      const compressedCanvas = document.createElement("canvas");
      compressedCanvas.width = Math.floor(pdfOnlyCanvas.width * 0.5);
      compressedCanvas.height = Math.floor(pdfOnlyCanvas.height * 0.5);
      const compressedCtx = compressedCanvas.getContext("2d");

      if (compressedCtx) {
        compressedCtx.drawImage(
          pdfOnlyCanvas,
          0,
          0,
          compressedCanvas.width,
          compressedCanvas.height
        );
        result.pageScreenshot = compressedCanvas.toDataURL("image/jpeg", 0.85);
      }
    }
  } catch (error) {
    console.error("📸 Hybrid screenshot failed:", error);
  }

  return result;
}

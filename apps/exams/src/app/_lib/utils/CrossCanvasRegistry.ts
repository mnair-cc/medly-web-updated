// Lightweight singleton registry to coordinate cross-canvas erase/preview between
// page-level CustomSketchCanvas and Desmos HandwritingLayer.

export type EraserPoint = { x: number; y: number };

type CanvasType = 'page' | 'desmos';

export interface RegistryCanvasHandle {
  // Points provided are in the LOCAL coordinate system of the registered element
  previewEraseLocal: (points: EraserPoint[]) => void;
  performEraseLocal: (points: EraserPoint[]) => Promise<void> | void;
  clearErasePreview: () => void;
}

interface RegisteredCanvas {
  id: string;
  type: CanvasType;
  element: HTMLElement;
  getHandle: () => RegistryCanvasHandle | null;
}

class CrossCanvasRegistryImpl {
  private canvases: Map<string, RegisteredCanvas> = new Map();

  registerCanvas(id: string, type: CanvasType, element: HTMLElement, getHandle: () => RegistryCanvasHandle | null): void {
    if (!id || !element) return;
    this.canvases.set(id, { id, type, element, getHandle });
  }

  unregisterCanvas(id: string): void {
    this.canvases.delete(id);
  }

  updateElement(id: string, element: HTMLElement): void {
    const existing = this.canvases.get(id);
    if (existing) {
      existing.element = element;
      this.canvases.set(id, existing);
    }
  }

  clearAllPreviews(): void {
    for (const entry of this.canvases.values()) {
      const handle = entry.getHandle();
      try { handle?.clearErasePreview(); } catch {}
    }
  }

  private transformPoints(fromEl: HTMLElement, toEl: HTMLElement, points: EraserPoint[]): EraserPoint[] {
    // Use DOMMatrix to account for scroll/zoom/transform
    // Fallback to rect math when DOM APIs aren't available
    try {
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      return points.map((p) => {
        const globalX = fromRect.left + p.x;
        const globalY = fromRect.top + p.y;
        return { x: globalX - toRect.left, y: globalY - toRect.top };
      });
    } catch {
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      return points.map((p) => ({ x: fromRect.left + p.x - toRect.left, y: fromRect.top + p.y - toRect.top }));
    }
  }

  previewGlobalErase(originId: string, pointsInOrigin: EraserPoint[]): void {
    const origin = this.canvases.get(originId);
    if (!origin || pointsInOrigin.length === 0) return;

    for (const entry of this.canvases.values()) {
      if (entry.id === originId) continue;
      // Only broadcast across different canvas types to avoid duplicating existing intra-type logic
      if (entry.type === origin.type) continue;
      const handle = entry.getHandle();
      if (!handle) continue;
      try {
        const transformed = this.transformPoints(origin.element, entry.element, pointsInOrigin);
        handle.previewEraseLocal(transformed);
      } catch {}
    }
  }

  async performGlobalErase(originId: string, pointsInOrigin: EraserPoint[]): Promise<void> {
    const origin = this.canvases.get(originId);
    if (!origin || pointsInOrigin.length === 0) return;

    const tasks: Array<Promise<void> | void> = [];
    for (const entry of this.canvases.values()) {
      if (entry.id === originId) continue;
      if (entry.type === origin.type) continue;
      const handle = entry.getHandle();
      if (!handle) continue;
      try {
        const transformed = this.transformPoints(origin.element, entry.element, pointsInOrigin);
        tasks.push(handle.performEraseLocal(transformed));
      } catch {}
    }
    await Promise.all(tasks);
  }
}

// Export a singleton instance
export const CrossCanvasRegistry = new CrossCanvasRegistryImpl();



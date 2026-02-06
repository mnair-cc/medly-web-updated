import { useCallback, useEffect, useRef, useState } from "react";

interface UseFlashcardDragOptions {
  onReorder: (newOrder: string[]) => void;
}

export function useFlashcardDrag({ onReorder }: UseFlashcardDragOptions) {
  const [draggedIndex, setDraggedIndex] = useState<number>(-1);
  const [targetIndex, setTargetIndex] = useState<number>(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTranslateY, setDraggedTranslateY] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const itemHeightsRef = useRef<number[]>([]);
  const cardOrderRef = useRef<string[]>([]);

  const GAP = 16; // gap between cards (matches space-y-4)

  const dragPointerOffsetYRef = useRef(0);
  const dragInitialItemTopRef = useRef(0);
  const pendingClientYRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const draggedIndexRef = useRef<number>(-1);

  // Measure all item heights
  const measureHeights = useCallback((cardIds: string[]) => {
    const heights: number[] = [];
    cardIds.forEach((id) => {
      const el = itemRefs.current.get(id);
      heights.push(el?.offsetHeight || 100);
    });
    itemHeightsRef.current = heights;
    cardOrderRef.current = cardIds;
  }, []);

  const updateDraggedTranslateFromClientY = useCallback((clientY: number) => {
    if (!containerRef.current || itemHeightsRef.current.length === 0 || draggedIndexRef.current === -1) return;

    // Calculate the raw translate value
    const rawTranslateY =
      clientY - dragPointerOffsetYRef.current - dragInitialItemTopRef.current;

    // Calculate bounds
    const draggedIdx = draggedIndexRef.current;

    // Calculate the original position of the dragged item relative to container
    let originalTop = 0;
    for (let i = 0; i < draggedIdx; i++) {
      originalTop += itemHeightsRef.current[i] + 16; // GAP = 16
    }

    // Min: Allow slight upward movement (20px buffer above original position)
    // This prevents the card from going too far above its starting point
    const minTranslateY = Math.max(-originalTop, -20);

    // Max: Allow dragging down to the bottom (after the last item position)
    // Calculate total height of all items
    const totalHeight = itemHeightsRef.current.reduce((sum, h, i) => {
      return sum + h + (i > 0 ? 16 : 0); // GAP = 16
    }, 0);
    // Maximum translate is the distance from current position to bottom, with small buffer
    const maxTranslateY = Math.max(0, totalHeight - originalTop - itemHeightsRef.current[draggedIdx] - 16);

    // Clamp the translate value within bounds
    const clampedTranslateY = Math.max(minTranslateY, Math.min(maxTranslateY, rawTranslateY));
    setDraggedTranslateY(clampedTranslateY);
  }, []);

  const scheduleDraggedTranslateUpdate = useCallback(
    (clientY: number) => {
      pendingClientYRef.current = clientY;
      if (rafIdRef.current != null) return;

      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (pendingClientYRef.current == null) return;
        updateDraggedTranslateFromClientY(pendingClientYRef.current);
      });
    },
    [updateDraggedTranslateFromClientY],
  );

  // Calculate target index from Y position
  const getTargetIndex = useCallback(
    (clientY: number): number => {
      if (!containerRef.current) return -1;

      const containerRect = containerRef.current.getBoundingClientRect();
      const relativeY = clientY - containerRect.top + containerRef.current.scrollTop;

      const heights = itemHeightsRef.current;
      if (heights.length === 0) return -1;

      let currentY = 0;
      for (let i = 0; i < heights.length; i++) {
        const itemHeight = heights[i];
        const midpoint = currentY + itemHeight / 2;

        if (relativeY < midpoint) {
          return i;
        }

        currentY += itemHeight + GAP;
      }

      return heights.length - 1;
    },
    [GAP],
  );

  // Calculate translateY offset for an item at given index
  const getTranslateY = useCallback(
    (index: number): number => {
      if (!isDragging || draggedIndex === -1 || targetIndex === -1) return 0;
      if (index === draggedIndex) return draggedTranslateY;

      const draggedHeight = itemHeightsRef.current[draggedIndex] || 100;
      const offset = draggedHeight + GAP;

      if (draggedIndex < targetIndex) {
        // Dragging down: items between draggedIndex+1 and targetIndex move up
        if (index > draggedIndex && index <= targetIndex) {
          return -offset;
        }
      } else if (draggedIndex > targetIndex) {
        // Dragging up: items between targetIndex and draggedIndex-1 move down
        if (index >= targetIndex && index < draggedIndex) {
          return offset;
        }
      }

      return 0;
    },
    [isDragging, draggedIndex, targetIndex, GAP, draggedTranslateY],
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (params: { index: number; cardIds: string[]; clientY: number }) => {
      const { index, cardIds, clientY } = params;
      measureHeights(cardIds);

      const draggedCardId = cardIds[index];
      const draggedEl = draggedCardId ? itemRefs.current.get(draggedCardId) : null;

      // Calculate offsets before setting state to avoid jumps
      if (draggedEl) {
        const rect = draggedEl.getBoundingClientRect();
        dragInitialItemTopRef.current = rect.top;
        // Store the exact offset from where the pointer is to the top of the element
        dragPointerOffsetYRef.current = clientY - rect.top;
      } else {
        dragInitialItemTopRef.current = clientY;
        dragPointerOffsetYRef.current = 0;
      }

      setDraggedIndex(index);
      draggedIndexRef.current = index;
      setTargetIndex(index);
      setIsDragging(true);
      // Start with no translation to avoid initial jump
      setDraggedTranslateY(0);
    },
    [measureHeights],
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!isDragging) return;
      scheduleDraggedTranslateUpdate(clientY);
      const newTarget = getTargetIndex(clientY);
      if (newTarget !== -1 && newTarget !== targetIndex) {
        setTargetIndex(newTarget);
      }
    },
    [isDragging, targetIndex, getTargetIndex, scheduleDraggedTranslateUpdate],
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;

    if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
      // Compute new order
      const currentOrder = [...cardOrderRef.current];
      const [removed] = currentOrder.splice(draggedIndex, 1);
      currentOrder.splice(targetIndex, 0, removed);
      onReorder(currentOrder);
    }

    setIsDragging(false);
    setDraggedIndex(-1);
    setTargetIndex(-1);
    setDraggedTranslateY(0);
  }, [isDragging, draggedIndex, targetIndex, onReorder]);

  // Set ref for an item
  const setItemRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      itemRefs.current.set(id, el);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  // Create drag start handler for a specific index
  const createDragStartHandler = useCallback(
    (index: number, cardIds: string[]) => {
      return (e: React.PointerEvent) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        handleDragStart({ index, cardIds, clientY: e.clientY });
      };
    },
    [handleDragStart],
  );

  // Global event listeners for drag
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      handleDragMove(e.clientY);
    };

    const handlePointerUp = () => {
      handleDragEnd();
    };

    const handlePointerCancel = () => {
      handleDragEnd();
    };

    // Disable text selection during drag
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerCancel);

      if (rafIdRef.current != null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      pendingClientYRef.current = null;
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  return {
    isDragging,
    draggedIndex,
    containerRef,
    setItemRef,
    getTranslateY,
    createDragStartHandler,
  };
}

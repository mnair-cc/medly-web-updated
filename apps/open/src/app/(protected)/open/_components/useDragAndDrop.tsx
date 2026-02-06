import { useCallback, useEffect, useRef, useState } from "react";

export interface DragItem {
  id: string;
  type: "document" | "folder";
  collectionId: string;
  folderId: string | null;
}

export interface DragPosition {
  x: number;
  y: number;
}

export interface DropTarget {
  type: "folder" | "collection-root";
  id: string; // folderId or collectionId
}

export function useDragAndDrop() {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<DragPosition | null>(null);
  const [hoveredFolder, setHoveredFolderState] = useState<string | null>(null);
  const [hoveredDocument, setHoveredDocumentState] = useState<string | null>(
    null,
  );
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [itemPositions, setItemPositions] = useState<Record<string, number>>(
    {},
  );
  const [itemHeights, setItemHeights] = useState<Record<string, number>>({});
  const [draggedFromIndex, setDraggedFromIndex] = useState<number>(-1);
  const [lastTargetIndex, setLastTargetIndex] = useState<number>(-1);

  // Touch handling state
  const [initialTouchPos, setInitialTouchPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [hasMoved, setHasMoved] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Refs to avoid stale state in global event handlers
  const isDraggingRef = useRef<boolean>(false);
  const draggedItemRef = useRef<DragItem | null>(null);
  const hoveredFolderRef = useRef<string | null>(null);
  const hoveredDocumentRef = useRef<string | null>(null);
  const draggedFromIndexRef = useRef<number>(-1);
  const lastTargetIndexRef = useRef<number>(-1);
  const itemHeightsRef = useRef<Record<string, number>>({});

  // Keep refs in sync with state
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);
  useEffect(() => {
    draggedItemRef.current = draggedItem;
  }, [draggedItem]);
  useEffect(() => {
    hoveredFolderRef.current = hoveredFolder;
  }, [hoveredFolder]);
  useEffect(() => {
    hoveredDocumentRef.current = hoveredDocument;
  }, [hoveredDocument]);
  useEffect(() => {
    draggedFromIndexRef.current = draggedFromIndex;
  }, [draggedFromIndex]);
  useEffect(() => {
    lastTargetIndexRef.current = lastTargetIndex;
  }, [lastTargetIndex]);
  useEffect(() => {
    itemHeightsRef.current = itemHeights;
  }, [itemHeights]);

  const GAP = 6;
  const DRAG_THRESHOLD = 10;

  // Calculate cumulative positions based on actual heights
  const calculatePositions = useCallback(
    (order: string[], heights: Record<string, number>) => {
      const positions: Record<string, number> = {};
      let currentY = 0;

      order.forEach((itemId) => {
        positions[itemId] = currentY;
        const itemHeight = heights[itemId] || 48;
        currentY += itemHeight + GAP;
      });

      return positions;
    },
    [GAP],
  );

  // Calculate target index based on drag position
  const getTargetIndex = useCallback(
    (clientY: number, currentOrder: string[]) => {
      if (!containerRef.current || Object.keys(itemHeights).length === 0)
        return -1;

      const containerRect = containerRef.current.getBoundingClientRect();
      // IMPORTANT: This is a scroll container. `clientY - top` is viewport-relative.
      // We need to convert to *content* coordinates by adding scrollTop, otherwise
      // dragging near the bottom of a scrolled list will compute wrong indices and
      // items will "shift" incorrectly.
      const relativeY =
        clientY - containerRect.top + (containerRef.current.scrollTop ?? 0);

      let currentY = 0;
      for (let i = 0; i < currentOrder.length; i++) {
        const item = currentOrder[i];
        const itemHeight = itemHeights[item] || 48;
        const itemEnd = currentY + itemHeight + GAP;

        if (relativeY < currentY + itemHeight / 2) {
          return i;
        } else if (relativeY < itemEnd) {
          // insertion index (can be at end)
          return Math.min(i + 1, currentOrder.length);
        }

        currentY = itemEnd;
      }

      // past the end: insert at end
      return currentOrder.length;
    },
    [itemHeights, GAP],
  );

  // Animate items to their new positions
  const animateItemsToNewPositions = useCallback(
    (
      fromIndex: number,
      toIndex: number,
      currentOrder: string[],
      draggedItemId: string,
    ) => {
      if (Object.keys(itemHeights).length === 0) return;

      console.log("🔄 animateItemsToNewPositions:", {
        fromIndex,
        toIndex,
        draggedItemId,
      });

      const newOrder = [...currentOrder];
      newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, draggedItemId);

      console.log("📐 New order:", newOrder);

      const newPositions = calculatePositions(newOrder, itemHeights);

      console.log("📍 New positions:", newPositions);
      setItemPositions(newPositions);
    },
    [itemHeights, calculatePositions],
  );

  // Animate root items as if an external (nested) item is inserted at target index
  const animateExternalInsertPositions = useCallback(
    (toIndex: number, currentOrder: string[], draggedItemId: string) => {
      if (Object.keys(itemHeightsRef.current).length === 0) return;

      console.log("🔄 animateExternalInsertPositions:", {
        toIndex,
        draggedItemId,
      });
      const newOrderWithGhost = [...currentOrder];
      newOrderWithGhost.splice(
        Math.max(0, Math.min(toIndex, currentOrder.length)),
        0,
        draggedItemId,
      );

      const newPositions = calculatePositions(
        newOrderWithGhost,
        itemHeightsRef.current,
      );
      // Only keep positions for actual items in currentOrder (ignore the ghost item)
      const filteredPositions: Record<string, number> = {};
      currentOrder.forEach((id) => {
        filteredPositions[id] = newPositions[id];
      });

      console.log("📍 New positions (external insert):", filteredPositions);
      setItemPositions(filteredPositions);
    },
    [calculatePositions],
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (item: DragItem, clientX: number, clientY: number, fromIndex: number) => {
      console.log("🚀 Drag START:", { item, fromIndex });
      // Global flag used by other parts of the Open UI (e.g. DocumentPage selection box)
      // to ignore mouse events while sidebar drag-and-drop is active.
      try {
        (window as any).__medlyOpenSidebarDndActive = true;
      } catch {
        // no-op (SSR / non-browser)
      }
      setDraggedItem(item);
      setDraggedFromIndex(fromIndex);
      // Sync refs immediately to avoid race conditions
      draggedItemRef.current = item;
      draggedFromIndexRef.current = fromIndex;
      setIsDragging(true);
      setLastTargetIndex(fromIndex);
      isDraggingRef.current = true;
      lastTargetIndexRef.current = fromIndex;

      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        setDragPosition({
          x: clientX - containerRect.left,
          // keep y in content coordinates so it stays consistent while scrolling
          y:
            clientY -
            containerRect.top +
            (containerRef.current.scrollTop ?? 0),
        });
      }
    },
    [],
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (clientX: number, clientY: number, currentOrder: string[]) => {
      if (!isDragging || !draggedItem || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      setDragPosition({
        x: clientX - containerRect.left,
        y:
          clientY -
          containerRect.top +
          (containerRef.current.scrollTop ?? 0),
      });

      const targetIndex = getTargetIndex(clientY, currentOrder);

      // Skip animation if dragged item is not in currentOrder (e.g., nested document)
      const isInOrder = currentOrder.includes(draggedItem.id);
      if (!isInOrder) {
        console.log(
          "⏭️ External drag (nested → root), targetIndex:",
          targetIndex,
        );
        if (targetIndex >= 0) {
          if (targetIndex !== lastTargetIndexRef.current) {
            console.log("✅ Target changed (external), animating...");
            animateExternalInsertPositions(
              targetIndex,
              currentOrder,
              draggedItem.id,
            );
            setLastTargetIndex(targetIndex);
            lastTargetIndexRef.current = targetIndex;
          }
        } else {
          // Reset to original positions when no valid target
          const resetPositions = calculatePositions(
            currentOrder,
            itemHeightsRef.current,
          );
          setItemPositions(resetPositions);
          setLastTargetIndex(-1);
          lastTargetIndexRef.current = -1;
        }
        return;
      }

      // Compute the actual index of the dragged item in the current order to avoid mismatches
      const fromIndexActual = currentOrder.indexOf(draggedItem.id);
      console.log("👆 Drag MOVE:", {
        targetIndex,
        lastTargetIndex,
        draggedFromIndex,
        fromIndexActual,
      });

      if (targetIndex !== lastTargetIndex && targetIndex >= 0) {
        console.log("✅ Target changed, animating...");
        animateItemsToNewPositions(
          fromIndexActual,
          targetIndex,
          currentOrder,
          draggedItem.id,
        );
        setLastTargetIndex(targetIndex);
        lastTargetIndexRef.current = targetIndex;
      }
    },
    [
      isDragging,
      draggedItem,
      draggedFromIndex,
      lastTargetIndex,
      getTargetIndex,
      animateItemsToNewPositions,
      animateExternalInsertPositions,
      calculatePositions,
    ],
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (
      currentOrder: string[],
      onDrop?: (
        newOrder: string[],
        fromIndex: number,
        toIndex: number,
        targetIndex: number,
      ) => void,
    ) => {
      // Read from refs to ensure we use the latest values (avoids stale closure issues)
      const isDraggingNow = isDraggingRef.current;
      const activeDraggedItem = draggedItemRef.current;
      const currentHoveredFolder = hoveredFolderRef.current;
      const currentHoveredDocument = hoveredDocumentRef.current;
      const fromIndex = draggedFromIndexRef.current;
      const targetIndexLatest = lastTargetIndexRef.current;

      if (!isDraggingNow || !activeDraggedItem) return;

      console.log("🛑 Drag END:", {
        draggedFromIndex: fromIndex,
        lastTargetIndex: targetIndexLatest,
        draggedItem: activeDraggedItem,
        hoveredFolder: currentHoveredFolder,
        isDragging: isDraggingNow,
        currentOrder,
      });

      // Check if dragged item is in currentOrder and compute its actual index
      const fromIndexActual = currentOrder.indexOf(activeDraggedItem.id);
      const isInOrder = fromIndexActual >= 0;

      if (onDrop) {
        // If we're hovering a folder while dropping a document, prioritize folder drop
        if (currentHoveredFolder && activeDraggedItem.type === "document") {
          console.log(
            "📁 Folder hover detected on drop - prioritizing folder move",
          );
          const safeTargetIndex =
            targetIndexLatest >= 0 ? targetIndexLatest : 0;
          onDrop(
            currentOrder,
            fromIndexActual,
            safeTargetIndex,
            safeTargetIndex,
          );
        } else if (
          currentHoveredDocument &&
          activeDraggedItem.type === "document"
        ) {
          // Dropping onto another document → grouping flow
          console.log(
            "📄 Document hover detected on drop - prioritizing group into folder",
          );
          const safeTargetIndex =
            targetIndexLatest >= 0 ? targetIndexLatest : 0;
          onDrop(
            currentOrder,
            fromIndexActual,
            safeTargetIndex,
            safeTargetIndex,
          );
        } else if (
          isInOrder &&
          targetIndexLatest !== fromIndexActual &&
          targetIndexLatest >= 0
        ) {
          // Reordering within existing order
          const newOrder = [...currentOrder];
          newOrder.splice(fromIndexActual, 1);
          newOrder.splice(targetIndexLatest, 0, activeDraggedItem.id);

          console.log("💾 Persisting reorder:", newOrder);
          onDrop(
            newOrder,
            fromIndexActual,
            targetIndexLatest,
            targetIndexLatest,
          );
        } else if (!isInOrder && targetIndexLatest >= 0) {
          // Moving from outside order (e.g., nested document to root)
          console.log(
            "💾 Persisting move from nested, targetIndex:",
            targetIndexLatest,
          );
          onDrop(currentOrder, -1, -1, targetIndexLatest);
        } else {
          console.log("🔙 No change");
          const resetPositions = calculatePositions(
            currentOrder,
            itemHeightsRef.current,
          );
          setItemPositions(resetPositions);
        }
      } else {
        console.log("🔙 No drop handler, resetting to original order");
        const resetPositions = calculatePositions(
          currentOrder,
          itemHeightsRef.current,
        );
        setItemPositions(resetPositions);
      }

      setIsDragging(false);
      setDragPosition(null);
      setDraggedItem(null);
      setDraggedFromIndex(-1);
      setLastTargetIndex(-1);
      setHoveredFolderState(null);
      setHoveredDocumentState(null);

      // Reset refs
      isDraggingRef.current = false;
      draggedItemRef.current = null;
      draggedFromIndexRef.current = -1;
      lastTargetIndexRef.current = -1;
      hoveredFolderRef.current = null;
      hoveredDocumentRef.current = null;

      // Clear global drag flag
      try {
        (window as any).__medlyOpenSidebarDndActive = false;
      } catch {
        // no-op
      }
    },
    [calculatePositions],
  );

  // Mouse event handlers
  const onMouseDown = useCallback(
    (e: React.MouseEvent, item: DragItem, index: number) => {
      e.stopPropagation();
      handleDragStart(item, e.clientX, e.clientY, index);
    },
    [handleDragStart],
  );

  // Touch event handlers
  const onTouchStart = useCallback(
    (e: React.TouchEvent, item: DragItem, index: number) => {
      e.stopPropagation();
      if (e.touches[0]) {
        const touch = e.touches[0];
        setInitialTouchPos({ x: touch.clientX, y: touch.clientY });
        setHasMoved(false);
        setDraggedItem(item);
        setDraggedFromIndex(index);
      }
    },
    [],
  );

  return {
    // State
    draggedItem,
    isDragging,
    dragPosition,
    hoveredFolder,
    hoveredDocument,
    dropTarget,
    itemPositions,
    itemHeights,
    draggedFromIndex,
    targetIndex: lastTargetIndex,

    // Refs
    containerRef,
    itemRefs,

    // Methods
    setItemHeights,
    setItemPositions,
    setHoveredFolder: useCallback((value: string | null) => {
      hoveredFolderRef.current = value;
      setHoveredFolderState(value);
    }, []),
    setHoveredDocument: useCallback((value: string | null) => {
      hoveredDocumentRef.current = value;
      setHoveredDocumentState(value);
    }, []),
    setDropTarget,
    calculatePositions,
    onMouseDown,
    onTouchStart,
    handleDragMove,
    handleDragEnd,

    // Constants
    GAP,
  };
}

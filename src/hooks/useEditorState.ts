import { useState, useCallback, useRef, useEffect } from 'react';
import type { EditorState, PlacedImage, AspectRatio, TextOverlay, ShapeOverlay, BackgroundConfig } from '../types';
import { DEFAULT_BACKGROUND } from '../types';

const MAX_HISTORY = 50;

/** Fields that are tracked by undo/redo (content-only, not navigation/export state). */
type UndoableState = Pick<EditorState, 'selectedLayoutId' | 'images' | 'aspectRatio' | 'textOverlays' | 'shapeOverlays' | 'background'>;

function extractUndoable(s: EditorState): UndoableState {
  return {
    selectedLayoutId: s.selectedLayoutId,
    images: s.images,
    aspectRatio: s.aspectRatio,
    textOverlays: s.textOverlays,
    shapeOverlays: s.shapeOverlays,
    background: s.background,
  };
}

function applyUndoable(s: EditorState, u: UndoableState): EditorState {
  return { ...s, ...u };
}

export function useEditorState() {
  const [state, setState] = useState<EditorState>({
    selectedLayoutId: null,
    images: {},
    currentSlide: 0,
    isExporting: false,
    aspectRatio: '1:1',
    textOverlays: [],
    shapeOverlays: [],
    background: { ...DEFAULT_BACKGROUND },
  });

  // ─── Undo / Redo history (stored in refs to avoid re-renders) ────
  const pastRef = useRef<UndoableState[]>([]);
  const futureRef = useRef<UndoableState[]>([]);

  // ─── Blob URL tracking ───────────────────────────────────────────
  const blobUrlsRef = useRef<Set<string>>(new Set());

  // Track a new blob URL
  const trackBlobUrl = useCallback((url: string) => {
    blobUrlsRef.current.add(url);
  }, []);

  // Revoke all blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current.clear();
    };
  }, []);

  /** Wrapper: push history, then apply a state update. */
  const updateWithHistory = useCallback(
    (updater: (prev: EditorState) => EditorState) => {
      setState((prev) => {
        // Push snapshot before the change
        const snapshot = extractUndoable(prev);
        const past = pastRef.current;
        past.push(snapshot);
        if (past.length > MAX_HISTORY) past.shift();
        futureRef.current = [];
        return updater(prev);
      });
    },
    []
  );

  // ─── Undo / Redo ─────────────────────────────────────────────────

  const undo = useCallback(() => {
    setState((prev) => {
      const past = pastRef.current;
      if (past.length === 0) return prev;
      const snapshot = past.pop()!;
      futureRef.current.push(extractUndoable(prev));
      return applyUndoable(prev, snapshot);
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      const future = futureRef.current;
      if (future.length === 0) return prev;
      const snapshot = future.pop()!;
      pastRef.current.push(extractUndoable(prev));
      return applyUndoable(prev, snapshot);
    });
  }, []);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  // ─── Layout selection ────────────────────────────────────────────

  const selectLayout = useCallback((layoutId: string) => {
    updateWithHistory((prev) => ({
      ...prev,
      selectedLayoutId: layoutId,
      images: {},
      currentSlide: 0,
      textOverlays: [],
      shapeOverlays: [],
    }));
  }, [updateWithHistory]);

  // ─── Image operations ────────────────────────────────────────────

  const setImage = useCallback((slotId: string, file: File) => {
    const url = URL.createObjectURL(file);
    trackBlobUrl(url);
    const placedImage: PlacedImage = {
      slotId,
      file,
      url,
      offsetX: 50,
      offsetY: 50,
      scale: 1,
    };
    updateWithHistory((prev) => ({
      ...prev,
      images: { ...prev.images, [slotId]: placedImage },
    }));
  }, [updateWithHistory, trackBlobUrl]);

  const removeImage = useCallback((slotId: string) => {
    updateWithHistory((prev) => {
      const newImages = { ...prev.images };
      delete newImages[slotId];
      return { ...prev, images: newImages };
    });
  }, [updateWithHistory]);

  // ─── Batch image upload ──────────────────────────────────────────

  const batchSetImages = useCallback((files: File[], slotIds: string[]) => {
    updateWithHistory((prev) => {
      const newImages = { ...prev.images };
      // Find empty slots in order
      const emptySlotIds = slotIds.filter((id) => !newImages[id]);
      const count = Math.min(files.length, emptySlotIds.length);
      for (let i = 0; i < count; i++) {
        const url = URL.createObjectURL(files[i]);
        trackBlobUrl(url);
        newImages[emptySlotIds[i]] = {
          slotId: emptySlotIds[i],
          file: files[i],
          url,
          offsetX: 50,
          offsetY: 50,
          scale: 1,
        };
      }
      return { ...prev, images: newImages };
    });
  }, [updateWithHistory, trackBlobUrl]);

  // ─── Image offset (pan/zoom) operations ───────────────────────────────

  const updateImageOffsetNoHistory = useCallback((slotId: string, updates: { offsetX?: number; offsetY?: number; scale?: number }) => {
    setState((prev) => {
      const img = prev.images[slotId];
      if (!img) return prev;
      return {
        ...prev,
        images: { ...prev.images, [slotId]: { ...img, ...updates } },
      };
    });
  }, []);

  // ─── Slide navigation (no history) ──────────────────────────────

  const setCurrentSlide = useCallback((slide: number) => {
    setState((prev) => ({ ...prev, currentSlide: slide }));
  }, []);

  // ─── Export state (no history) ───────────────────────────────────

  const setExporting = useCallback((isExporting: boolean) => {
    setState((prev) => ({ ...prev, isExporting }));
  }, []);

  // ─── Aspect ratio ────────────────────────────────────────────────

  const setAspectRatio = useCallback((aspectRatio: AspectRatio) => {
    updateWithHistory((prev) => ({ ...prev, aspectRatio }));
  }, [updateWithHistory]);

  // ─── Text overlay operations ─────────────────────────────────────

  const addTextOverlay = useCallback((overlay: TextOverlay) => {
    updateWithHistory((prev) => ({
      ...prev,
      textOverlays: [...prev.textOverlays, overlay],
    }));
  }, [updateWithHistory]);

  const updateTextOverlay = useCallback((id: string, updates: Partial<TextOverlay>) => {
    updateWithHistory((prev) => ({
      ...prev,
      textOverlays: prev.textOverlays.map((o) =>
        o.id === id ? { ...o, ...updates } : o
      ),
    }));
  }, [updateWithHistory]);

  /**
   * Push a snapshot of the current state to the undo stack WITHOUT applying any change.
   * Call this once at the START of a drag to capture the "before" state.
   */
  const pushHistorySnapshot = useCallback(() => {
    setState((prev) => {
      const snapshot = extractUndoable(prev);
      const past = pastRef.current;
      past.push(snapshot);
      if (past.length > MAX_HISTORY) past.shift();
      futureRef.current = [];
      return prev; // no state change
    });
  }, []);

  /**
   * Update a text overlay WITHOUT pushing history.
   * Used during drag mousemove so each pixel doesn't create an undo entry.
   */
  const updateTextOverlayNoHistory = useCallback((id: string, updates: Partial<TextOverlay>) => {
    setState((prev) => ({
      ...prev,
      textOverlays: prev.textOverlays.map((o) =>
        o.id === id ? { ...o, ...updates } : o
      ),
    }));
  }, []);

  const removeTextOverlay = useCallback((id: string) => {
    updateWithHistory((prev) => ({
      ...prev,
      textOverlays: prev.textOverlays.filter((o) => o.id !== id),
    }));
  }, [updateWithHistory]);

  // ─── Shape overlay operations ────────────────────────────────

  const addShapeOverlay = useCallback((shape: ShapeOverlay) => {
    updateWithHistory((prev) => ({
      ...prev,
      shapeOverlays: [...prev.shapeOverlays, shape],
    }));
  }, [updateWithHistory]);

  const updateShapeOverlay = useCallback((id: string, updates: Partial<ShapeOverlay>) => {
    updateWithHistory((prev) => ({
      ...prev,
      shapeOverlays: prev.shapeOverlays.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  }, [updateWithHistory]);

  const updateShapeOverlayNoHistory = useCallback((id: string, updates: Partial<ShapeOverlay>) => {
    setState((prev) => ({
      ...prev,
      shapeOverlays: prev.shapeOverlays.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  }, []);

  const removeShapeOverlay = useCallback((id: string) => {
    updateWithHistory((prev) => ({
      ...prev,
      shapeOverlays: prev.shapeOverlays.filter((s) => s.id !== id),
    }));
  }, [updateWithHistory]);

  // ─── Z-order operations (works for both text and shape overlays) ──

  const bringForward = useCallback((id: string, kind: 'text' | 'shape') => {
    updateWithHistory((prev) => {
      // Build a unified sorted list of all overlays with their kind + id
      const all: { id: string; kind: 'text' | 'shape'; zIndex: number }[] = [
        ...prev.textOverlays.map((o) => ({ id: o.id, kind: 'text' as const, zIndex: o.zIndex })),
        ...prev.shapeOverlays.map((o) => ({ id: o.id, kind: 'shape' as const, zIndex: o.zIndex })),
      ];
      all.sort((a, b) => a.zIndex - b.zIndex);

      const idx = all.findIndex((o) => o.id === id && o.kind === kind);
      if (idx < 0 || idx >= all.length - 1) return prev; // not found or already on top

      // Swap with the item directly above
      const temp = all[idx].zIndex;
      all[idx].zIndex = all[idx + 1].zIndex;
      all[idx + 1].zIndex = temp;
      // If they had the same zIndex, ensure the promoted one is actually higher
      if (all[idx].zIndex === all[idx + 1].zIndex) {
        all[idx].zIndex = all[idx + 1].zIndex + 1;
      }

      // Apply back
      const zMap = new Map(all.map((o) => [`${o.kind}:${o.id}`, o.zIndex]));
      return {
        ...prev,
        textOverlays: prev.textOverlays.map((o) => ({ ...o, zIndex: zMap.get(`text:${o.id}`) ?? o.zIndex })),
        shapeOverlays: prev.shapeOverlays.map((o) => ({ ...o, zIndex: zMap.get(`shape:${o.id}`) ?? o.zIndex })),
      };
    });
  }, [updateWithHistory]);

  const sendBackward = useCallback((id: string, kind: 'text' | 'shape') => {
    updateWithHistory((prev) => {
      const all: { id: string; kind: 'text' | 'shape'; zIndex: number }[] = [
        ...prev.textOverlays.map((o) => ({ id: o.id, kind: 'text' as const, zIndex: o.zIndex })),
        ...prev.shapeOverlays.map((o) => ({ id: o.id, kind: 'shape' as const, zIndex: o.zIndex })),
      ];
      all.sort((a, b) => a.zIndex - b.zIndex);

      const idx = all.findIndex((o) => o.id === id && o.kind === kind);
      if (idx <= 0) return prev; // not found or already at bottom

      // Swap with the item directly below
      const temp = all[idx].zIndex;
      all[idx].zIndex = all[idx - 1].zIndex;
      all[idx - 1].zIndex = temp;
      // If they had the same zIndex, ensure the demoted one is actually lower
      if (all[idx].zIndex === all[idx - 1].zIndex) {
        all[idx].zIndex = all[idx - 1].zIndex - 1;
      }

      const zMap = new Map(all.map((o) => [`${o.kind}:${o.id}`, o.zIndex]));
      return {
        ...prev,
        textOverlays: prev.textOverlays.map((o) => ({ ...o, zIndex: zMap.get(`text:${o.id}`) ?? o.zIndex })),
        shapeOverlays: prev.shapeOverlays.map((o) => ({ ...o, zIndex: zMap.get(`shape:${o.id}`) ?? o.zIndex })),
      };
    });
  }, [updateWithHistory]);

  // ─── Background ──────────────────────────────────────────────────

  const setBackground = useCallback((background: BackgroundConfig) => {
    updateWithHistory((prev) => ({ ...prev, background }));
  }, [updateWithHistory]);

  // ─── Clear all ───────────────────────────────────────────────────

  const clearAll = useCallback(() => {
    updateWithHistory((prev) => ({
      ...prev,
      images: {},
      currentSlide: 0,
      textOverlays: [],
      shapeOverlays: [],
      background: { ...DEFAULT_BACKGROUND },
    }));
  }, [updateWithHistory]);

  // ─── Restore full state (for project load) ──────────────────────

  const restoreState = useCallback((restored: Partial<EditorState>) => {
    // Track any blob URLs from restored images
    if (restored.images) {
      Object.values(restored.images).forEach((img) => trackBlobUrl(img.url));
    }
    updateWithHistory((prev) => ({
      ...prev,
      ...restored,
    }));
  }, [updateWithHistory, trackBlobUrl]);

  return {
    state,
    selectLayout,
    setImage,
    removeImage,
    batchSetImages,
    updateImageOffsetNoHistory,
    setCurrentSlide,
    setExporting,
    setAspectRatio,
    clearAll,
    // Text overlays
    addTextOverlay,
    updateTextOverlay,
    updateTextOverlayNoHistory,
    pushHistorySnapshot,
    removeTextOverlay,
    // Shape overlays
    addShapeOverlay,
    updateShapeOverlay,
    updateShapeOverlayNoHistory,
    removeShapeOverlay,
    // Z-order
    bringForward,
    sendBackward,
    // Background
    setBackground,
    // Undo / Redo
    undo,
    redo,
    canUndo,
    canRedo,
    // Project restore
    restoreState,
  };
}

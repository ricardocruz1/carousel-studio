import { useState, useCallback, useRef, useEffect } from 'react';
import type { EditorState, PlacedImage, AspectRatio, TextOverlay, ShapeOverlay, BackgroundConfig, ImageFilters, Layer, CarouselLayout } from '../types';
import { DEFAULT_BACKGROUND, DEFAULT_IMAGE_FILTERS, createDefaultLayer, MAX_LAYERS } from '../types';

const MAX_HISTORY = 50;

/** Fields that are tracked by undo/redo (content-only, not navigation/export state). */
type UndoableState = Pick<EditorState, 'selectedLayoutId' | 'images' | 'aspectRatio' | 'textOverlays' | 'shapeOverlays' | 'background' | 'layers' | 'activeLayerId'>;

function extractUndoable(s: EditorState): UndoableState {
  return {
    selectedLayoutId: s.selectedLayoutId,
    images: s.images,
    aspectRatio: s.aspectRatio,
    textOverlays: s.textOverlays,
    shapeOverlays: s.shapeOverlays,
    background: s.background,
    layers: s.layers,
    activeLayerId: s.activeLayerId,
  };
}

function applyUndoable(s: EditorState, u: UndoableState): EditorState {
  return { ...s, ...u };
}

// ─── Layer helpers ──────────────────────────────────────────

function isCustom(state: EditorState): boolean {
  return state.selectedLayoutId === 'custom';
}

/** Get the active layer, or null if not in custom mode or no layers. */
function getActiveLayer(state: EditorState): Layer | null {
  if (!isCustom(state) || state.layers.length === 0) return null;
  return state.layers.find((l) => l.id === state.activeLayerId) ?? state.layers[0];
}

/** Update the active layer immutably. */
function updateActiveLayer(state: EditorState, updater: (layer: Layer) => Layer): EditorState {
  const activeId = state.activeLayerId;
  return {
    ...state,
    layers: state.layers.map((l) => l.id === activeId ? updater(l) : l),
  };
}

/** Get images from the right source (active layer for custom, state.images for preset). */
function getActiveImages(state: EditorState): Record<string, PlacedImage> {
  const layer = getActiveLayer(state);
  return layer ? layer.images : state.images;
}

/** Get text overlays from the right source. */
function getActiveTextOverlays(state: EditorState): TextOverlay[] {
  const layer = getActiveLayer(state);
  return layer ? layer.textOverlays : state.textOverlays;
}

/** Get shape overlays from the right source. */
function getActiveShapeOverlays(state: EditorState): ShapeOverlay[] {
  const layer = getActiveLayer(state);
  return layer ? layer.shapeOverlays : state.shapeOverlays;
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
    layers: [],
    activeLayerId: null,
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
      // If switching to custom, initialize with one empty layer.
      // If switching away from custom, clear layers.
      layers: layoutId === 'custom' ? [createDefaultLayer('layer-1', 'Layer 1', 2)] : [],
      activeLayerId: layoutId === 'custom' ? 'layer-1' : null,
    }));
  }, [updateWithHistory]);

  // ─── Image operations (layer-aware) ──────────────────────────────

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
      filters: { ...DEFAULT_IMAGE_FILTERS },
    };
    updateWithHistory((prev) => {
      if (isCustom(prev)) {
        return updateActiveLayer(prev, (layer) => ({
          ...layer,
          images: { ...layer.images, [slotId]: placedImage },
        }));
      }
      return { ...prev, images: { ...prev.images, [slotId]: placedImage } };
    });
  }, [updateWithHistory, trackBlobUrl]);

  const removeImage = useCallback((slotId: string) => {
    updateWithHistory((prev) => {
      if (isCustom(prev)) {
        return updateActiveLayer(prev, (layer) => {
          const newImages = { ...layer.images };
          delete newImages[slotId];
          return { ...layer, images: newImages };
        });
      }
      const newImages = { ...prev.images };
      delete newImages[slotId];
      return { ...prev, images: newImages };
    });
  }, [updateWithHistory]);

  // ─── Batch image upload ──────────────────────────────────────────

  const batchSetImages = useCallback((files: File[], slotIds: string[]) => {
    updateWithHistory((prev) => {
      const source = isCustom(prev) ? (getActiveLayer(prev)?.images ?? {}) : prev.images;
      const newImages = { ...source };
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
          filters: { ...DEFAULT_IMAGE_FILTERS },
        };
      }
      if (isCustom(prev)) {
        return updateActiveLayer(prev, (layer) => ({ ...layer, images: newImages }));
      }
      return { ...prev, images: newImages };
    });
  }, [updateWithHistory, trackBlobUrl]);

  // ─── Image offset (pan/zoom) operations ───────────────────────────────

  const updateImageOffsetNoHistory = useCallback((slotId: string, updates: { offsetX?: number; offsetY?: number; scale?: number }) => {
    setState((prev) => {
      if (isCustom(prev)) {
        const layer = getActiveLayer(prev);
        if (!layer) return prev;
        const img = layer.images[slotId];
        if (!img) return prev;
        return updateActiveLayer(prev, (l) => ({
          ...l,
          images: { ...l.images, [slotId]: { ...img, ...updates } },
        }));
      }
      const img = prev.images[slotId];
      if (!img) return prev;
      return { ...prev, images: { ...prev.images, [slotId]: { ...img, ...updates } } };
    });
  }, []);

  // ─── Image filters ──────────────────────────────────────────────

  const updateImageFilters = useCallback((slotId: string, filters: Partial<ImageFilters>) => {
    updateWithHistory((prev) => {
      if (isCustom(prev)) {
        const layer = getActiveLayer(prev);
        if (!layer) return prev;
        const img = layer.images[slotId];
        if (!img) return prev;
        return updateActiveLayer(prev, (l) => ({
          ...l,
          images: { ...l.images, [slotId]: { ...img, filters: { ...img.filters, ...filters } } },
        }));
      }
      const img = prev.images[slotId];
      if (!img) return prev;
      return { ...prev, images: { ...prev.images, [slotId]: { ...img, filters: { ...img.filters, ...filters } } } };
    });
  }, [updateWithHistory]);

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

  // ─── Text overlay operations (layer-aware) ───────────────────────

  const addTextOverlay = useCallback((overlay: TextOverlay) => {
    updateWithHistory((prev) => {
      if (isCustom(prev)) {
        return updateActiveLayer(prev, (layer) => ({
          ...layer,
          textOverlays: [...layer.textOverlays, overlay],
        }));
      }
      return { ...prev, textOverlays: [...prev.textOverlays, overlay] };
    });
  }, [updateWithHistory]);

  const updateTextOverlay = useCallback((id: string, updates: Partial<TextOverlay>) => {
    updateWithHistory((prev) => {
      if (isCustom(prev)) {
        return updateActiveLayer(prev, (layer) => ({
          ...layer,
          textOverlays: layer.textOverlays.map((o) => o.id === id ? { ...o, ...updates } : o),
        }));
      }
      return { ...prev, textOverlays: prev.textOverlays.map((o) => o.id === id ? { ...o, ...updates } : o) };
    });
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
    setState((prev) => {
      if (isCustom(prev)) {
        return updateActiveLayer(prev, (layer) => ({
          ...layer,
          textOverlays: layer.textOverlays.map((o) => o.id === id ? { ...o, ...updates } : o),
        }));
      }
      return { ...prev, textOverlays: prev.textOverlays.map((o) => o.id === id ? { ...o, ...updates } : o) };
    });
  }, []);

  const removeTextOverlay = useCallback((id: string) => {
    updateWithHistory((prev) => {
      if (isCustom(prev)) {
        return updateActiveLayer(prev, (layer) => ({
          ...layer,
          textOverlays: layer.textOverlays.filter((o) => o.id !== id),
        }));
      }
      return { ...prev, textOverlays: prev.textOverlays.filter((o) => o.id !== id) };
    });
  }, [updateWithHistory]);

  // ─── Shape overlay operations (layer-aware) ────────────────────

  const addShapeOverlay = useCallback((shape: ShapeOverlay) => {
    updateWithHistory((prev) => {
      if (isCustom(prev)) {
        return updateActiveLayer(prev, (layer) => ({
          ...layer,
          shapeOverlays: [...layer.shapeOverlays, shape],
        }));
      }
      return { ...prev, shapeOverlays: [...prev.shapeOverlays, shape] };
    });
  }, [updateWithHistory]);

  const updateShapeOverlay = useCallback((id: string, updates: Partial<ShapeOverlay>) => {
    updateWithHistory((prev) => {
      if (isCustom(prev)) {
        return updateActiveLayer(prev, (layer) => ({
          ...layer,
          shapeOverlays: layer.shapeOverlays.map((s) => s.id === id ? { ...s, ...updates } : s),
        }));
      }
      return { ...prev, shapeOverlays: prev.shapeOverlays.map((s) => s.id === id ? { ...s, ...updates } : s) };
    });
  }, [updateWithHistory]);

  const updateShapeOverlayNoHistory = useCallback((id: string, updates: Partial<ShapeOverlay>) => {
    setState((prev) => {
      if (isCustom(prev)) {
        return updateActiveLayer(prev, (layer) => ({
          ...layer,
          shapeOverlays: layer.shapeOverlays.map((s) => s.id === id ? { ...s, ...updates } : s),
        }));
      }
      return { ...prev, shapeOverlays: prev.shapeOverlays.map((s) => s.id === id ? { ...s, ...updates } : s) };
    });
  }, []);

  const removeShapeOverlay = useCallback((id: string) => {
    updateWithHistory((prev) => {
      if (isCustom(prev)) {
        return updateActiveLayer(prev, (layer) => ({
          ...layer,
          shapeOverlays: layer.shapeOverlays.filter((s) => s.id !== id),
        }));
      }
      return { ...prev, shapeOverlays: prev.shapeOverlays.filter((s) => s.id !== id) };
    });
  }, [updateWithHistory]);

  // ─── Z-order operations (layer-aware) ────────────────────────────

  const bringForward = useCallback((id: string, kind: 'text' | 'shape') => {
    updateWithHistory((prev) => {
      const textOvls = isCustom(prev) ? (getActiveLayer(prev)?.textOverlays ?? []) : prev.textOverlays;
      const shapeOvls = isCustom(prev) ? (getActiveLayer(prev)?.shapeOverlays ?? []) : prev.shapeOverlays;

      const all: { id: string; kind: 'text' | 'shape'; zIndex: number }[] = [
        ...textOvls.map((o) => ({ id: o.id, kind: 'text' as const, zIndex: o.zIndex })),
        ...shapeOvls.map((o) => ({ id: o.id, kind: 'shape' as const, zIndex: o.zIndex })),
      ];
      all.sort((a, b) => a.zIndex - b.zIndex);

      const idx = all.findIndex((o) => o.id === id && o.kind === kind);
      if (idx < 0 || idx >= all.length - 1) return prev;

      const temp = all[idx].zIndex;
      all[idx].zIndex = all[idx + 1].zIndex;
      all[idx + 1].zIndex = temp;
      if (all[idx].zIndex === all[idx + 1].zIndex) {
        all[idx].zIndex = all[idx + 1].zIndex + 1;
      }

      const zMap = new Map(all.map((o) => [`${o.kind}:${o.id}`, o.zIndex]));
      const applyZ = (textArr: TextOverlay[], shapeArr: ShapeOverlay[]) => ({
        textOverlays: textArr.map((o) => ({ ...o, zIndex: zMap.get(`text:${o.id}`) ?? o.zIndex })),
        shapeOverlays: shapeArr.map((o) => ({ ...o, zIndex: zMap.get(`shape:${o.id}`) ?? o.zIndex })),
      });

      if (isCustom(prev)) {
        return updateActiveLayer(prev, (layer) => {
          const result = applyZ(layer.textOverlays, layer.shapeOverlays);
          return { ...layer, ...result };
        });
      }
      const result = applyZ(prev.textOverlays, prev.shapeOverlays);
      return { ...prev, ...result };
    });
  }, [updateWithHistory]);

  const sendBackward = useCallback((id: string, kind: 'text' | 'shape') => {
    updateWithHistory((prev) => {
      const textOvls = isCustom(prev) ? (getActiveLayer(prev)?.textOverlays ?? []) : prev.textOverlays;
      const shapeOvls = isCustom(prev) ? (getActiveLayer(prev)?.shapeOverlays ?? []) : prev.shapeOverlays;

      const all: { id: string; kind: 'text' | 'shape'; zIndex: number }[] = [
        ...textOvls.map((o) => ({ id: o.id, kind: 'text' as const, zIndex: o.zIndex })),
        ...shapeOvls.map((o) => ({ id: o.id, kind: 'shape' as const, zIndex: o.zIndex })),
      ];
      all.sort((a, b) => a.zIndex - b.zIndex);

      const idx = all.findIndex((o) => o.id === id && o.kind === kind);
      if (idx <= 0) return prev;

      const temp = all[idx].zIndex;
      all[idx].zIndex = all[idx - 1].zIndex;
      all[idx - 1].zIndex = temp;
      if (all[idx].zIndex === all[idx - 1].zIndex) {
        all[idx].zIndex = all[idx - 1].zIndex - 1;
      }

      const zMap = new Map(all.map((o) => [`${o.kind}:${o.id}`, o.zIndex]));
      const applyZ = (textArr: TextOverlay[], shapeArr: ShapeOverlay[]) => ({
        textOverlays: textArr.map((o) => ({ ...o, zIndex: zMap.get(`text:${o.id}`) ?? o.zIndex })),
        shapeOverlays: shapeArr.map((o) => ({ ...o, zIndex: zMap.get(`shape:${o.id}`) ?? o.zIndex })),
      });

      if (isCustom(prev)) {
        return updateActiveLayer(prev, (layer) => {
          const result = applyZ(layer.textOverlays, layer.shapeOverlays);
          return { ...layer, ...result };
        });
      }
      const result = applyZ(prev.textOverlays, prev.shapeOverlays);
      return { ...prev, ...result };
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
      selectedLayoutId: null,
      images: {},
      currentSlide: 0,
      textOverlays: [],
      shapeOverlays: [],
      background: { ...DEFAULT_BACKGROUND },
      layers: [],
      activeLayerId: null,
    }));
  }, [updateWithHistory]);

  // ─── Layer CRUD ─────────────────────────────────────────────────

  const addLayer = useCallback(() => {
    updateWithHistory((prev) => {
      if (!isCustom(prev) || prev.layers.length >= MAX_LAYERS) return prev;
      const nextNum = prev.layers.length + 1;
      // Inherit slide count from layer 1 (all layers must have the same slide count)
      const slideCount = prev.layers[0]?.layout.slideCount ?? 2;
      const newLayer = createDefaultLayer(`layer-${Date.now()}`, `Layer ${nextNum}`, slideCount);
      return {
        ...prev,
        layers: [...prev.layers, newLayer],
        activeLayerId: newLayer.id,
      };
    });
  }, [updateWithHistory]);

  const removeLayer = useCallback((layerId: string) => {
    updateWithHistory((prev) => {
      if (!isCustom(prev) || prev.layers.length <= 1) return prev; // can't remove last layer
      const newLayers = prev.layers.filter((l) => l.id !== layerId);
      const newActiveId = prev.activeLayerId === layerId
        ? newLayers[newLayers.length - 1].id
        : prev.activeLayerId;
      return { ...prev, layers: newLayers, activeLayerId: newActiveId };
    });
  }, [updateWithHistory]);

  const setActiveLayer = useCallback((layerId: string) => {
    setState((prev) => ({ ...prev, activeLayerId: layerId }));
  }, []);

  const toggleLayerVisibility = useCallback((layerId: string) => {
    updateWithHistory((prev) => ({
      ...prev,
      layers: prev.layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      ),
    }));
  }, [updateWithHistory]);

  const renameLayer = useCallback((layerId: string, name: string) => {
    updateWithHistory((prev) => ({
      ...prev,
      layers: prev.layers.map((l) =>
        l.id === layerId ? { ...l, name } : l
      ),
    }));
  }, [updateWithHistory]);

  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    updateWithHistory((prev) => {
      if (!isCustom(prev)) return prev;
      const newLayers = [...prev.layers];
      const [moved] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, moved);
      return { ...prev, layers: newLayers };
    });
  }, [updateWithHistory]);

  /** Update the active layer's layout (called from CustomLayoutBuilder). */
  const setActiveLayerLayout = useCallback((layout: CarouselLayout) => {
    updateWithHistory((prev) => {
      if (!isCustom(prev)) return prev;
      return updateActiveLayer(prev, (layer) => ({ ...layer, layout }));
    });
  }, [updateWithHistory]);

  /** Initialize layers when entering custom mode (called from App after builder finishes). */
  const initCustomLayers = useCallback((layout: CarouselLayout) => {
    setState((prev) => {
      if (prev.layers.length > 0 && prev.selectedLayoutId === 'custom') {
        // Already has layers in custom mode — update the active layer's layout
        return updateActiveLayer(prev, (layer) => ({
          ...layer,
          layout,
          // Re-key images: builder may have changed slot IDs, so clear images
          // that no longer have matching slots
          images: Object.fromEntries(
            Object.entries(layer.images).filter(([slotId]) =>
              layout.slots.some((s) => s.id === slotId)
            )
          ),
        }));
      }
      // First time or switching to custom — create layer 1 with this layout
      const layer1: Layer = {
        id: 'layer-1',
        name: 'Layer 1',
        layout,
        images: {},
        textOverlays: [],
        shapeOverlays: [],
        visible: true,
      };
      return {
        ...prev,
        selectedLayoutId: 'custom',
        layers: [layer1],
        activeLayerId: 'layer-1',
      };
    });
  }, []);

  /** Update slide count across ALL layers (must stay in sync). */
  const setLayersSlideCount = useCallback((slideCount: number) => {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => ({
        ...l,
        layout: { ...l.layout, slideCount },
      })),
    }));
  }, []);

  // ─── Restore full state (for project load) ──────────────────────

  const restoreState = useCallback((restored: Partial<EditorState>) => {
    // Track any blob URLs from restored images
    if (restored.images) {
      Object.values(restored.images).forEach((img) => trackBlobUrl(img.url));
    }
    // Track blob URLs inside layers
    if (restored.layers) {
      restored.layers.forEach((layer) => {
        Object.values(layer.images).forEach((img) => trackBlobUrl(img.url));
      });
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
    updateImageFilters,
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
    // ─── Layer operations ──────────────
    addLayer,
    removeLayer,
    setActiveLayer,
    toggleLayerVisibility,
    renameLayer,
    reorderLayers,
    setActiveLayerLayout,
    initCustomLayers,
    setLayersSlideCount,
    // ─── Layer-aware getters ──────────
    getActiveImages: () => getActiveImages(state),
    getActiveTextOverlays: () => getActiveTextOverlays(state),
    getActiveShapeOverlays: () => getActiveShapeOverlays(state),
    getActiveLayer: () => getActiveLayer(state),
  };
}

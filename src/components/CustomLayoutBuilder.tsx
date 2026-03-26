import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { CarouselLayout, ImageSlot, AspectRatio } from '../types';
import { ASPECT_RATIOS, MAX_LAYERS } from '../types';
import { LayerPanel } from './LayerPanel';
import './CustomLayoutBuilder.css';

// ─── Constants ──────────────────────────────────────────────────────────────

const COLS_PER_SLIDE = 12;
const MIN_SPAN = 1;
const MAX_SLIDES = 20;
const MIN_SLIDES = 1;
const MAX_SLOTS = 20;
const IS_MOBILE = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
const MIN_CELL_SIZE = IS_MOBILE ? 14 : 20;
const MAX_CELL_SIZE = 44;
const PREFERRED_CANVAS_WIDTH = typeof window !== 'undefined' && window.innerWidth < 600
  ? Math.min(window.innerWidth - 56, 400)
  : 620;

const SLOT_COLORS = [
  '#6c5ce7', '#00cec9', '#fd79a8', '#fdcb6e', '#55efc4',
  '#74b9ff', '#ff7675', '#a29bfe', '#e17055', '#636e72',
  '#00b894', '#e84393', '#0984e3', '#d63031', '#fab1a0',
  '#81ecec', '#dfe6e9', '#ffeaa7', '#b2bec3', '#2d3436',
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface CustomSlot {
  id: string;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

/** Internal layer representation in the builder */
interface BuilderLayer {
  id: string;
  name: string;
  slots: CustomSlot[];
}

/** Data for a single layer as passed to/from the builder */
export interface BuilderLayerData {
  id: string;
  name: string;
  layout: CarouselLayout;
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

type Interaction =
  | { type: 'idle' }
  | { type: 'drawing'; startCol: number; startRow: number }
  | {
      type: 'moving';
      slotId: string;
      startCol: number;
      startRow: number;
      origCol: number;
      origRow: number;
    }
  | {
      type: 'resizing';
      slotId: string;
      handle: ResizeHandle;
      origSlot: CustomSlot;
      startCol: number;
      startRow: number;
    };

interface Props {
  onFinish: (layers: BuilderLayerData[]) => void;
  onCancel: () => void;
  /** Initial layers for editing. If provided, each layer's layout is converted to internal slots. */
  initialLayers?: BuilderLayerData[];
  aspectRatio: AspectRatio;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function slotColor(index: number) {
  return SLOT_COLORS[index % SLOT_COLORS.length];
}

function layoutToCustomSlots(layout: CarouselLayout, rows: number): CustomSlot[] {
  const totalCols = layout.slideCount * COLS_PER_SLIDE;
  return layout.slots.map((s, i) => ({
    id: `custom-${i + 1}`,
    col: Math.round((s.x / 100) * totalCols),
    row: Math.round((s.y / 100) * rows),
    colSpan: Math.max(MIN_SPAN, Math.round((s.width / 100) * totalCols)),
    rowSpan: Math.max(MIN_SPAN, Math.round((s.height / 100) * rows)),
  }));
}

function convertToLayout(slots: CustomSlot[], slideCount: number, rows: number): CarouselLayout {
  const totalCols = slideCount * COLS_PER_SLIDE;
  const imageSlots: ImageSlot[] = slots.map((s, i) => ({
    id: `slot-${i + 1}`,
    x: (s.col / totalCols) * 100,
    y: (s.row / rows) * 100,
    width: (s.colSpan / totalCols) * 100,
    height: (s.rowSpan / rows) * 100,
  }));

  return {
    id: 'custom',
    name: 'Custom',
    description: `Custom layout: ${slots.length} photos, ${slideCount} slides`,
    imageCount: slots.length,
    slideCount,
    slots: imageSlots,
    thumbnailSlots: imageSlots,
  };
}

const HANDLE_LIST: ResizeHandle[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
};

// ─── Component ──────────────────────────────────────────────────────────────

export const CustomLayoutBuilder: React.FC<Props> = ({
  onFinish,
  onCancel,
  initialLayers,
  aspectRatio,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const clickedSlotRef = useRef<string | null>(null);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);

  // Grid rows based on aspect ratio
  const ROWS = ASPECT_RATIOS[aspectRatio].gridRows;

  // ─── Helper: convert initial layers to BuilderLayer[] ──
  const initLayers = useCallback((): BuilderLayer[] => {
    if (initialLayers && initialLayers.length > 0) {
      return initialLayers.map((l) => ({
        id: l.id,
        name: l.name,
        slots: layoutToCustomSlots(l.layout, ROWS),
      }));
    }
    // Default: one empty layer
    return [{ id: 'layer-1', name: 'Layer 1', slots: [] }];
  }, [initialLayers, ROWS]);

  const initSlideCount = (): number => {
    if (initialLayers && initialLayers.length > 0) {
      return initialLayers[0].layout.slideCount;
    }
    return 2;
  };

  // ─── State ──────────────────────────────────────────────
  const [slideCount, setSlideCount] = useState(initSlideCount);
  const [layers, setLayers] = useState<BuilderLayer[]>(initLayers);
  const [activeLayerId, setActiveLayerId] = useState<string>(() =>
    initialLayers && initialLayers.length > 0 ? initialLayers[0].id : 'layer-1'
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [interaction, setInteraction] = useState<Interaction>({ type: 'idle' });
  const [mouseGrid, setMouseGrid] = useState<{ col: number; row: number } | null>(null);
  const [nextId, setNextId] = useState(() => {
    // Start the ID counter after the max existing slot count across all layers
    if (initialLayers && initialLayers.length > 0) {
      const maxSlots = Math.max(...initialLayers.map((l) => l.layout.slots.length));
      return maxSlots + 1;
    }
    return 1;
  });

  // ─── Detect mobile (coarse pointer = touch device) ─────
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ─── Active layer derived state ────────────────────────
  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const slots = activeLayer?.slots ?? [];

  // Helper to update the active layer's slots
  const setActiveSlots = useCallback((updater: (prev: CustomSlot[]) => CustomSlot[]) => {
    setLayers((prevLayers) =>
      prevLayers.map((l) =>
        l.id === activeLayerId ? { ...l, slots: updater(l.slots) } : l
      )
    );
  }, [activeLayerId]);

  // Helper to set the active layer's slots directly
  const replaceActiveSlots = useCallback((newSlots: CustomSlot[]) => {
    setLayers((prevLayers) =>
      prevLayers.map((l) =>
        l.id === activeLayerId ? { ...l, slots: newSlots } : l
      )
    );
  }, [activeLayerId]);

  // ─── Computed ───────────────────────────────────────────
  const totalCols = slideCount * COLS_PER_SLIDE;
  // Cell size is based on at most 2 slides so the canvas height stays
  // constant when adding more slides.  Extra slides extend the width and
  // scroll horizontally via builder__canvas-scroll.
  const referenceCols = Math.min(totalCols, 2 * COLS_PER_SLIDE);
  const cellSize = clamp(
    Math.floor(PREFERRED_CANVAS_WIDTH / referenceCols),
    MIN_CELL_SIZE,
    MAX_CELL_SIZE
  );
  const canvasWidth = cellSize * totalCols;
  const canvasHeight = cellSize * ROWS;

  // Convert pointer position to grid coordinates
  const getGrid = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { col: 0, row: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        col: clamp(Math.floor((e.clientX - rect.left) / cellSize), 0, totalCols - 1),
        row: clamp(Math.floor((e.clientY - rect.top) / cellSize), 0, ROWS - 1),
      };
    },
    [cellSize, totalCols]
  );

  // Compute visual slot positions during interactions (live preview)
  const visualSlots = useMemo(() => {
    if (!mouseGrid) return slots;

    if (interaction.type === 'moving') {
      return slots.map((s) => {
        if (s.id !== interaction.slotId) return s;
        const dCol = mouseGrid.col - interaction.startCol;
        const dRow = mouseGrid.row - interaction.startRow;
        return {
          ...s,
          col: clamp(interaction.origCol + dCol, 0, totalCols - s.colSpan),
          row: clamp(interaction.origRow + dRow, 0, ROWS - s.rowSpan),
        };
      });
    }

    if (interaction.type === 'resizing') {
      return slots.map((s) => {
        if (s.id !== interaction.slotId) return s;
        const dCol = mouseGrid.col - interaction.startCol;
        const dRow = mouseGrid.row - interaction.startRow;
        const orig = interaction.origSlot;
        const h = interaction.handle;

        let col = orig.col;
        let row = orig.row;
        let colSpan = orig.colSpan;
        let rowSpan = orig.rowSpan;

        if (h.includes('e')) colSpan = Math.max(MIN_SPAN, orig.colSpan + dCol);
        if (h.includes('s')) rowSpan = Math.max(MIN_SPAN, orig.rowSpan + dRow);
        if (h.includes('w')) {
          const nc = orig.col + dCol;
          const ns = orig.colSpan - dCol;
          if (ns >= MIN_SPAN && nc >= 0) {
            col = nc;
            colSpan = ns;
          }
        }
        if (h.includes('n')) {
          const nr = orig.row + dRow;
          const ns = orig.rowSpan - dRow;
          if (ns >= MIN_SPAN && nr >= 0) {
            row = nr;
            rowSpan = ns;
          }
        }

        // Clamp to canvas boundaries
        col = Math.max(0, col);
        row = Math.max(0, row);
        colSpan = Math.min(colSpan, totalCols - col);
        rowSpan = Math.min(rowSpan, ROWS - row);

        return { ...s, col, row, colSpan, rowSpan };
      });
    }

    return slots;
  }, [slots, interaction, mouseGrid, totalCols]);

  // Ghost rectangle for drawing mode
  const ghostRect = useMemo(() => {
    if (interaction.type !== 'drawing' || !mouseGrid) return null;
    const { startCol, startRow } = interaction;
    return {
      col: Math.min(startCol, mouseGrid.col),
      row: Math.min(startRow, mouseGrid.row),
      colSpan: Math.abs(mouseGrid.col - startCol) + 1,
      rowSpan: Math.abs(mouseGrid.row - startRow) + 1,
    };
  }, [interaction, mouseGrid]);

  // ─── Pointer Event Handlers ─────────────────────────────

  // Canvas: handles drawing on empty area and deselection
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (drawMode && slots.length < MAX_SLOTS) {
      const grid = getGrid(e);
      setInteraction({ type: 'drawing', startCol: grid.col, startRow: grid.row });
      drawStartRef.current = { x: e.clientX, y: e.clientY };
      canvasRef.current?.setPointerCapture(e.pointerId);
      e.preventDefault();
    } else if (!drawMode) {
      setSelectedId(null);
    }
  };

  // Slot: select and start moving, or let drawing pass through
  const handleSlotPointerDown = (e: React.PointerEvent, slotId: string) => {
    if (drawMode) {
      // Remember which slot was under the cursor; let the event
      // bubble to the canvas so drawing can start on top of slots.
      clickedSlotRef.current = slotId;
      return;
    }
    e.stopPropagation();

    const grid = getGrid(e);
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;

    setSelectedId(slotId);
    drawStartRef.current = { x: e.clientX, y: e.clientY };
    setInteraction({
      type: 'moving',
      slotId,
      startCol: grid.col,
      startRow: grid.row,
      origCol: slot.col,
      origRow: slot.row,
    });
    canvasRef.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  // Resize handle: start resizing
  const handleHandlePointerDown = (
    e: React.PointerEvent,
    slotId: string,
    handle: ResizeHandle
  ) => {
    e.stopPropagation();
    const grid = getGrid(e);
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;

    drawStartRef.current = { x: e.clientX, y: e.clientY };
    setInteraction({
      type: 'resizing',
      slotId,
      handle,
      origSlot: { ...slot },
      startCol: grid.col,
      startRow: grid.row,
    });
    canvasRef.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  // Global move: update mouse grid, throttled by grid cell changes
  const handlePointerMove = (e: React.PointerEvent) => {
    const grid = getGrid(e);
    setMouseGrid((prev) => {
      if (prev && prev.col === grid.col && prev.row === grid.row) return prev;
      return grid;
    });
  };

  // Global up: finalize the current interaction
  const handlePointerUp = (e: React.PointerEvent) => {
    if (interaction.type === 'drawing' && ghostRect) {
      // Use pixel distance to distinguish taps from drags (mobile finger
      // jitter can easily cross grid cell boundaries on a tap)
      const start = drawStartRef.current;
      drawStartRef.current = null;
      const dist = start ? Math.hypot(e.clientX - start.x, e.clientY - start.y) : 0;
      const isTap = dist < 10;

      if (isTap) {
        // Tap on an existing slot → select it and exit draw mode
        if (clickedSlotRef.current) {
          setSelectedId(clickedSlotRef.current);
          setDrawMode(false);
        }
        // Tap on empty space → do nothing (creation only happens on drag)
        clickedSlotRef.current = null;
        setInteraction({ type: 'idle' });
        return;
      }

      clickedSlotRef.current = null;

      const { col, row, colSpan, rowSpan } = ghostRect;

      const newSlot: CustomSlot = {
        id: `custom-${nextId}`,
        col,
        row,
        colSpan,
        rowSpan,
      };
      setActiveSlots((prev) => [...prev, newSlot]);
      setNextId((n) => n + 1);
      setSelectedId(newSlot.id);
    }

    if (interaction.type === 'moving' || interaction.type === 'resizing') {
      // Only commit position change if there was actual drag movement;
      // a tap (< 10px) just selects without moving/resizing
      const start = drawStartRef.current;
      drawStartRef.current = null;
      const dist = start ? Math.hypot(e.clientX - start.x, e.clientY - start.y) : 0;
      if (dist >= 10) {
        replaceActiveSlots(visualSlots);
      }
    }

    setInteraction({ type: 'idle' });
  };

  // ─── Keyboard Shortcuts ─────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drawMode) {
          setDrawMode(false);
        } else {
          setSelectedId(null);
        }
        setInteraction({ type: 'idle' });
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        setActiveSlots((prev) => prev.filter((s) => s.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, drawMode]);

  // ─── Actions ────────────────────────────────────────────

  const handleSlideChange = (delta: number) => {
    const newCount = clamp(slideCount + delta, MIN_SLIDES, MAX_SLIDES);
    if (newCount < slideCount) {
      const newTotalCols = newCount * COLS_PER_SLIDE;
      // Remove out-of-bounds slots from ALL layers
      setLayers((prevLayers) =>
        prevLayers.map((l) => ({
          ...l,
          slots: l.slots
            .filter((s) => s.col < newTotalCols)
            .map((s) => ({
              ...s,
              colSpan: Math.min(s.colSpan, newTotalCols - s.col),
            })),
        }))
      );
    }
    setSlideCount(newCount);
    setSelectedId(null);
  };

  const handleDeleteSlot = (id: string) => {
    setActiveSlots((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleClearAll = () => {
    setActiveSlots(() => []);
    setSelectedId(null);
    setDrawMode(false);
  };

  const handleFinish = () => {
    // At least one layer must have slots
    const hasAnySlots = layers.some((l) => l.slots.length > 0);
    if (!hasAnySlots) return;

    const layerData: BuilderLayerData[] = layers.map((l) => ({
      id: l.id,
      name: l.name,
      layout: convertToLayout(l.slots, slideCount, ROWS),
    }));
    onFinish(layerData);
  };

  // ─── Layer Management ──────────────────────────────────
  const handleAddLayer = useCallback(() => {
    if (layers.length >= MAX_LAYERS) return;
    const nextNum = layers.length + 1;
    const newId = `layer-${Date.now()}`;
    const newLayer: BuilderLayer = { id: newId, name: `Layer ${nextNum}`, slots: [] };
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newId);
    setSelectedId(null);
    setDrawMode(false);
  }, [layers.length]);

  const handleRemoveLayer = useCallback((layerId: string) => {
    if (layers.length <= 1) return;
    setLayers((prev) => {
      const newLayers = prev.filter((l) => l.id !== layerId);
      // If we removed the active layer, select the last remaining
      if (activeLayerId === layerId) {
        setActiveLayerId(newLayers[newLayers.length - 1].id);
      }
      return newLayers;
    });
    setSelectedId(null);
  }, [layers.length, activeLayerId]);

  const handleSelectLayer = useCallback((layerId: string) => {
    setActiveLayerId(layerId);
    setSelectedId(null);
    setDrawMode(false);
  }, []);

  const handleRenameLayer = useCallback((layerId: string, name: string) => {
    setLayers((prev) =>
      prev.map((l) => l.id === layerId ? { ...l, name } : l)
    );
  }, []);

  // Layers as Layer-like objects for the LayerPanel (need a `layout` and `visible` field)
  const layerPanelData = useMemo(() =>
    layers.map((l) => ({
      id: l.id,
      name: l.name,
      layout: convertToLayout(l.slots, slideCount, ROWS),
      images: {} as Record<string, never>,
      textOverlays: [],
      shapeOverlays: [],
      visible: true,
    })),
    [layers, slideCount, ROWS]
  );

  // Compute inactive layers' slots for dimmed rendering
  const inactiveLayerSlots = useMemo(() => {
    return layers
      .filter((l) => l.id !== activeLayerId)
      .flatMap((l) =>
        l.slots.map((s, i) => ({ ...s, layerName: l.name, globalIndex: i }))
      );
  }, [layers, activeLayerId]);

  // ─── Render ─────────────────────────────────────────────

  const totalSlotCount = layers.reduce((sum, l) => sum + l.slots.length, 0);

  return (
    <div className="builder">
      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="builder__toolbar">
        <div className="builder__toolbar-left">
          <div className="builder__control">
            <label className="builder__label">Slides</label>
            <div className="builder__stepper">
              <button
                className="builder__stepper-btn"
                onClick={() => handleSlideChange(-1)}
                disabled={slideCount <= MIN_SLIDES}
              >
                -
              </button>
              <span className="builder__stepper-value">{slideCount}</span>
              <button
                className="builder__stepper-btn"
                onClick={() => handleSlideChange(1)}
                disabled={slideCount >= MAX_SLIDES}
              >
                +
              </button>
            </div>
          </div>

          <button
            className={`builder__tool-btn ${drawMode ? 'builder__tool-btn--active' : ''}`}
            onClick={() => {
              setDrawMode(!drawMode);
              if (!drawMode) setSelectedId(null);
            }}
            disabled={slots.length >= MAX_SLOTS}
          >
            {drawMode ? (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M13 3L6 10L3 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Done Adding
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 3V13M3 8H13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Add Photo Slot
              </>
            )}
          </button>
        </div>

        <div className="builder__toolbar-right">
          <button
            className="builder__tool-btn builder__tool-btn--ghost"
            onClick={handleClearAll}
            disabled={slots.length === 0}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* ── Canvas + Layer Panel Row ───────────────────── */}
      <div className="builder__body">
        <div className="builder__canvas-wrapper">
          <div
            className="builder__canvas-scroll"
            style={{ height: canvasHeight + 64 }}
          >
          {/* Slide labels above canvas */}
          <div
            className="builder__slide-labels"
            style={{ width: canvasWidth }}
          >
            {Array.from({ length: slideCount }, (_, i) => (
              <div
                key={`label-${i}`}
                className="builder__slide-label"
                style={{
                  left: i * cellSize * COLS_PER_SLIDE,
                  width: cellSize * COLS_PER_SLIDE,
                }}
              >
                Slide {i + 1}
              </div>
            ))}
          </div>

          <div
            ref={canvasRef}
            className={`builder__canvas ${drawMode ? 'builder__canvas--draw' : ''} ${
              interaction.type !== 'idle' ? 'builder__canvas--interacting' : ''
            }`}
            style={{
              width: canvasWidth,
              height: canvasHeight,
              backgroundSize: `${cellSize}px ${cellSize}px`,
              touchAction: drawMode ? 'none' : undefined,
            }}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => setInteraction({ type: 'idle' })}
          >
            {/* Slide dividers */}
            {Array.from({ length: slideCount - 1 }, (_, i) => (
              <div
                key={`div-${i}`}
                className="builder__divider"
                style={{ left: (i + 1) * cellSize * COLS_PER_SLIDE }}
              />
            ))}

            {/* Empty state hint */}
            {slots.length === 0 && interaction.type !== 'drawing' && (
              <div className="builder__empty-hint">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect
                    x="4"
                    y="4"
                    width="32"
                    height="32"
                    rx="4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  <path
                    d="M20 13V27M13 20H27"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span>
                  {drawMode
                    ? (isMobile ? 'Tap and drag to draw a photo slot' : 'Click and drag to draw a photo slot')
                    : (isMobile ? 'Tap "Add Photo Slot" to start' : 'Click "Add Photo Slot" to start')}
                </span>
              </div>
            )}

            {/* Hover cell indicator in draw mode */}
            {drawMode &&
              mouseGrid &&
              interaction.type === 'idle' &&
              slots.length < MAX_SLOTS && (
                <div
                  className="builder__hover-cell"
                  style={{
                    left: mouseGrid.col * cellSize,
                    top: mouseGrid.row * cellSize,
                    width: cellSize,
                    height: cellSize,
                  }}
                />
              )}

            {/* Inactive layers' slots (dimmed, non-interactive) */}
            {inactiveLayerSlots.map((slot) => (
              <div
                key={`inactive-${slot.id}-${slot.layerName}`}
                className="builder__slot builder__slot--inactive"
                style={{
                  left: slot.col * cellSize,
                  top: slot.row * cellSize,
                  width: slot.colSpan * cellSize,
                  height: slot.rowSpan * cellSize,
                  '--slot-color': '#888',
                  '--slot-bg': 'rgba(128,128,128,0.08)',
                } as React.CSSProperties}
              >
                <span className="builder__slot-number" style={{ opacity: 0.4 }}>
                  {slot.globalIndex + 1}
                </span>
              </div>
            ))}

            {/* Active layer slots */}
            {visualSlots.map((slot, index) => {
              const isSelected = slot.id === selectedId;
              const color = slotColor(index);
              const isInteracting =
                interaction.type !== 'idle' &&
                'slotId' in interaction &&
                interaction.slotId === slot.id;

              return (
                <div
                  key={slot.id}
                  className={`builder__slot ${
                    isSelected ? 'builder__slot--selected' : ''
                  } ${isInteracting ? 'builder__slot--interacting' : ''}`}
                  style={{
                    left: slot.col * cellSize,
                    top: slot.row * cellSize,
                    width: slot.colSpan * cellSize,
                    height: slot.rowSpan * cellSize,
                    '--slot-color': color,
                    '--slot-bg': isSelected ? `${color}3a` : `${color}22`,
                    zIndex: isSelected ? 10 : 1,
                  } as React.CSSProperties}
                  onPointerDown={(e) => handleSlotPointerDown(e, slot.id)}
                >
                  <span className="builder__slot-number">{index + 1}</span>

                  {/* Size indicator */}
                  {isSelected && (
                    <span className="builder__slot-size">
                      {slot.colSpan}x{slot.rowSpan}
                    </span>
                  )}

                  {/* Delete button */}
                  {isSelected && (
                    <button
                      className="builder__slot-delete"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSlot(slot.id);
                      }}
                      title="Delete slot (Del)"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M3 3L9 9M9 3L3 9"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  )}

                  {/* Resize handles */}
                  {isSelected &&
                    interaction.type !== 'moving' &&
                    HANDLE_LIST.map((h) => (
                      <div
                        key={h}
                        className={`builder__handle builder__handle--${h}`}
                        style={{ cursor: HANDLE_CURSORS[h] }}
                        onPointerDown={(e) =>
                          handleHandlePointerDown(e, slot.id, h)
                        }
                      />
                    ))}
                </div>
              );
            })}

            {/* Ghost rect while drawing */}
            {ghostRect && (
              <div
                className="builder__ghost"
                style={{
                  left: ghostRect.col * cellSize,
                  top: ghostRect.row * cellSize,
                  width: ghostRect.colSpan * cellSize,
                  height: ghostRect.rowSpan * cellSize,
                }}
              >
                <span className="builder__ghost-size">
                  {ghostRect.colSpan}x{ghostRect.rowSpan}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* ── Layer Panel (inside builder) ──────────────── */}
        {!isMobile && (
          <LayerPanel
            layers={layerPanelData}
            activeLayerId={activeLayerId}
            isMobile={false}
            mode="builder"
            onSelectLayer={handleSelectLayer}
            onAddLayer={handleAddLayer}
            onRemoveLayer={handleRemoveLayer}
            onToggleVisibility={() => {/* visibility not used in builder */}}
            onRenameLayer={handleRenameLayer}
          />
        )}
      </div>

      {/* Mobile layer panel (below canvas) */}
      {isMobile && (
        <LayerPanel
          layers={layerPanelData}
          activeLayerId={activeLayerId}
          isMobile={true}
          mode="builder"
          onSelectLayer={handleSelectLayer}
          onAddLayer={handleAddLayer}
          onRemoveLayer={handleRemoveLayer}
          onToggleVisibility={() => {/* visibility not used in builder */}}
          onRenameLayer={handleRenameLayer}
        />
      )}

      {/* ── Footer ──────────────────────────────────────── */}
      <div className="builder__footer">
        <div className="builder__footer-info">
          {slots.length === 0 ? (
            <span className="builder__hint-text">
              {layers.length > 1
                ? `${activeLayer?.name ?? 'Layer'}: Draw slots for this layer`
                : 'Design your custom carousel layout'}
            </span>
          ) : (
            <span className="builder__count-text">
              {activeLayer?.name ?? 'Layer'}: {slots.length} slot{slots.length !== 1 ? 's' : ''} &middot;{' '}
              {slideCount} slide{slideCount !== 1 ? 's' : ''}
              {layers.length > 1 && ` \u00B7 ${totalSlotCount} total across ${layers.length} layers`}
              {selectedId &&
                !drawMode &&
                (isMobile
                  ? ' \u00B7 Tap \u00D7 to remove, drag to move'
                  : ' \u00B7 Press Del to remove, drag to move')}
            </span>
          )}
        </div>

        <div className="builder__footer-actions">
          <button
            className="builder__action-btn builder__action-btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="builder__action-btn builder__action-btn--finish"
            onClick={handleFinish}
            disabled={totalSlotCount === 0}
          >
            Use This Layout
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 4L10 8L6 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

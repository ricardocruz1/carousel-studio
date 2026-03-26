import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CarouselLayout, PlacedImage, AspectRatio, TextOverlay, ShapeOverlay, BackgroundConfig, ImageFilters } from '../types';
import { ASPECT_RATIOS, buildCssFilterString } from '../types';
import { useToast } from '../hooks/useToast';
import { compressImage } from '../utils/imageCompress';
import type { SnapGuide } from '../utils/snap';
import { TextOverlayLayer, FloatingToolbar } from './TextOverlayLayer';
import { ShapeOverlayLayer, ShapeToolbar } from './ShapeOverlayLayer';
import { ImageFilterToolbar } from './ImageFilterToolbar';
import './CarouselEditor.css';

/** Build a CSS background string from a BackgroundConfig. */
function bgToCSS(bg: BackgroundConfig): string {
  if (bg.type === 'gradient') {
    return `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientStart}, ${bg.gradientEnd})`;
  }
  return bg.color;
}

interface CarouselEditorProps {
  layout: CarouselLayout;
  images: Record<string, PlacedImage>;
  currentSlide: number;
  aspectRatio: AspectRatio;
  background: BackgroundConfig;
  textOverlays: TextOverlay[];
  shapeOverlays: ShapeOverlay[];
  onSetImage: (slotId: string, file: File) => void;
  onRemoveImage: (slotId: string) => void;
  onSetCurrentSlide: (slide: number) => void;
  onUpdateTextOverlay: (id: string, updates: Partial<TextOverlay>) => void;
  onUpdateTextOverlayNoHistory: (id: string, updates: Partial<TextOverlay>) => void;
  onPushHistorySnapshot: () => void;
  onRemoveTextOverlay: (id: string) => void;
  onUpdateShapeOverlay: (id: string, updates: Partial<ShapeOverlay>) => void;
  onUpdateShapeOverlayNoHistory: (id: string, updates: Partial<ShapeOverlay>) => void;
  onRemoveShapeOverlay: (id: string) => void;
  onBringForward: (id: string, kind: 'text' | 'shape') => void;
  onSendBackward: (id: string, kind: 'text' | 'shape') => void;
  onUpdateImageOffsetNoHistory: (slotId: string, updates: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onPushImageHistorySnapshot: () => void;
  onUpdateImageFilters: (slotId: string, filters: Partial<ImageFilters>) => void;
}

export const CarouselEditor: React.FC<CarouselEditorProps> = ({
  layout,
  images,
  currentSlide,
  aspectRatio,
  background,
  textOverlays,
  shapeOverlays,
  onSetImage,
  onRemoveImage,
  onSetCurrentSlide,
  onUpdateTextOverlay,
  onUpdateTextOverlayNoHistory,
  onPushHistorySnapshot,
  onRemoveTextOverlay,
  onUpdateShapeOverlay,
  onUpdateShapeOverlayNoHistory,
  onRemoveShapeOverlay,
  onBringForward,
  onSendBackward,
  onUpdateImageOffsetNoHistory,
  onPushImageHistorySnapshot,
  onUpdateImageFilters,
}) => {
  const slideOffset = -(currentSlide * (100 / layout.slideCount));
  const config = ASPECT_RATIOS[aspectRatio];
  const ratioFactor = config.width / config.height;
  const bgCSS = bgToCSS(background);

  // Unified selection: either a text overlay or a shape overlay is selected
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<'text' | 'shape' | null>(null);

  // Image filter editing state
  const [selectedFilterSlotId, setSelectedFilterSlotId] = useState<string | null>(null);
  const selectedFilterImage = selectedFilterSlotId ? images[selectedFilterSlotId] ?? null : null;

  const selectedTextOverlay = selectedKind === 'text' && selectedOverlayId
    ? textOverlays.find((o) => o.id === selectedOverlayId) ?? null
    : null;
  const selectedShapeOverlay = selectedKind === 'shape' && selectedOverlayId
    ? shapeOverlays.find((o) => o.id === selectedOverlayId) ?? null
    : null;

  // Snap guides state — set by overlay layers during drag, cleared on pointerup
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

  // Handlers that enforce mutual exclusion
  const handleSelectText = useCallback((id: string | null) => {
    setSelectedOverlayId(id);
    setSelectedKind(id ? 'text' : null);
    if (id) setSelectedFilterSlotId(null); // deselect filter when selecting overlay
  }, []);

  const handleSelectShape = useCallback((id: string | null) => {
    setSelectedOverlayId(id);
    setSelectedKind(id ? 'shape' : null);
    if (id) setSelectedFilterSlotId(null); // deselect filter when selecting overlay
  }, []);

  const handleFilterClick = useCallback((slotId: string) => {
    setSelectedFilterSlotId((prev) => (prev === slotId ? null : slotId));
    // Deselect overlays when opening filter
    setSelectedOverlayId(null);
    setSelectedKind(null);
  }, []);

  const handleFilterClose = useCallback(() => {
    setSelectedFilterSlotId(null);
  }, []);

  const handleFilterUpdate = useCallback((slotId: string, filters: Partial<ImageFilters>) => {
    onUpdateImageFilters(slotId, filters);
  }, [onUpdateImageFilters]);

  // Toolbar position — computed from the selected overlay element's bounding rect
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number; below: boolean } | null>(null);

  // Filter toolbar position — computed from the filter button's bounding rect (desktop only)
  const [filterToolbarPos, setFilterToolbarPos] = useState<{ top: number; left: number; below: boolean } | null>(null);

  // Deselect when changing slides
  useEffect(() => {
    setSelectedOverlayId(null);
    setSelectedKind(null);
    setSelectedFilterSlotId(null);
  }, [currentSlide]);

  // ── Detect mobile (coarse pointer = touch device) ───────────────────────
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Swipe navigation on mobile ──────────────────────────────────────────
  const viewportRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef<{ startX: number; startY: number; started: boolean } | null>(null);

  const handleSwipeStart = useCallback((e: React.PointerEvent) => {
    // Only handle single-finger touch (or mouse) — ignore if it started on an overlay or filled image
    if (e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-overlay-id], [data-shape-id], .shape-resize-handle, .image-slot--filled')) return;
    swipeRef.current = { startX: e.clientX, startY: e.clientY, started: true };
  }, []);

  const handleSwipeEnd = useCallback((e: React.PointerEvent) => {
    const swipe = swipeRef.current;
    if (!swipe || !swipe.started) return;
    swipeRef.current = null;

    const deltaX = e.clientX - swipe.startX;
    const deltaY = e.clientY - swipe.startY;
    const absDx = Math.abs(deltaX);
    const absDy = Math.abs(deltaY);

    // Must be a clear horizontal swipe: > 50px horizontal, and more horizontal than vertical
    if (absDx < 50 || absDy > absDx) return;

    if (deltaX < 0 && currentSlide < layout.slideCount - 1) {
      // Swipe left → next slide
      onSetCurrentSlide(currentSlide + 1);
    } else if (deltaX > 0 && currentSlide > 0) {
      // Swipe right → previous slide
      onSetCurrentSlide(currentSlide - 1);
    }
  }, [currentSlide, layout.slideCount, onSetCurrentSlide]);

  const handleSwipeCancel = useCallback(() => {
    swipeRef.current = null;
  }, []);

  // Keep toolbar position in sync with selected overlay element (desktop only)
  useLayoutEffect(() => {
    if (!selectedOverlayId || isMobile) {
      setToolbarPos(null);
      return;
    }

    const updatePos = () => {
      // Look for either text or shape overlay element
      const el = (
        document.querySelector(`[data-overlay-id="${selectedOverlayId}"]`) ||
        document.querySelector(`[data-shape-id="${selectedOverlayId}"]`)
      ) as HTMLElement | null;
      if (!el) {
        setToolbarPos(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      const spaceAbove = rect.top;
      const below = spaceAbove < 60;
      // Clamp left so toolbar stays within viewport (with 8px margin)
      const vw = window.innerWidth;
      const rawLeft = rect.left + rect.width / 2;
      const clampedLeft = Math.max(8, Math.min(vw - 8, rawLeft));
      setToolbarPos({
        top: below ? rect.bottom + 8 : rect.top - 8,
        left: clampedLeft,
        below,
      });
    };

    updatePos();

    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [selectedOverlayId, textOverlays, shapeOverlays]);

  // Keep filter toolbar position in sync with the filter button (desktop only)
  useLayoutEffect(() => {
    if (!selectedFilterSlotId || isMobile) {
      setFilterToolbarPos(null);
      return;
    }

    const updatePos = () => {
      const btn = document.querySelector(`[data-filter-slot="${selectedFilterSlotId}"]`) as HTMLElement | null;
      if (!btn) {
        setFilterToolbarPos(null);
        return;
      }
      const rect = btn.getBoundingClientRect();
      const spaceAbove = rect.top;
      // The filter toolbar is ~300px tall — prefer above, but go below if not enough room
      const below = spaceAbove < 320;
      const vw = window.innerWidth;
      const rawLeft = rect.left + rect.width / 2;
      const clampedLeft = Math.max(170, Math.min(vw - 170, rawLeft));
      setFilterToolbarPos({
        top: below ? rect.bottom + 8 : rect.top - 8,
        left: clampedLeft,
        below,
      });
    };

    updatePos();

    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [selectedFilterSlotId, isMobile, images]);

  return (
    <div className="carousel-editor">
      {/* Mobile-only: pinned toolbar above viewport */}
      {isMobile && selectedTextOverlay && (
        <div className="carousel-editor__pinned-toolbar" onPointerDown={(e) => e.stopPropagation()}>
          <FloatingToolbar
            overlay={selectedTextOverlay}
            onUpdate={onUpdateTextOverlay}
            onRemove={onRemoveTextOverlay}
            onBringForward={onBringForward}
            onSendBackward={onSendBackward}
          />
        </div>
      )}
      {isMobile && selectedShapeOverlay && (
        <div className="carousel-editor__pinned-toolbar" onPointerDown={(e) => e.stopPropagation()}>
          <ShapeToolbar
            shape={selectedShapeOverlay}
            onUpdate={onUpdateShapeOverlay}
            onRemove={onRemoveShapeOverlay}
            onBringForward={onBringForward}
            onSendBackward={onSendBackward}
          />
        </div>
      )}
      {isMobile && selectedFilterImage && selectedFilterSlotId && (
        <div className="carousel-editor__pinned-toolbar" onPointerDown={(e) => e.stopPropagation()}>
          <ImageFilterToolbar
            filters={selectedFilterImage.filters}
            onUpdate={(filters) => handleFilterUpdate(selectedFilterSlotId, filters)}
            onClose={handleFilterClose}
          />
        </div>
      )}

      <div
        className="carousel-editor__viewport"
        ref={viewportRef}
        style={{
          aspectRatio: config.cssRatio,
          maxWidth: `min(100%, calc(70vh * ${ratioFactor}))`,
          touchAction: 'pan-y',
        }}
        onPointerDown={handleSwipeStart}
        onPointerUp={handleSwipeEnd}
        onPointerCancel={handleSwipeCancel}
      >
        <div
          className="carousel-editor__canvas"
          style={{
            width: `${layout.slideCount * 100}%`,
            transform: `translateX(${slideOffset}%)`,
          }}
        >
          {/* Slide backgrounds */}
          {Array.from({ length: layout.slideCount }, (_, i) => (
            <div
              key={`slide-bg-${i}`}
              className="carousel-editor__slide-bg"
              style={{
                left: `${(i / layout.slideCount) * 100}%`,
                width: `${100 / layout.slideCount}%`,
                background: bgCSS,
              }}
            >
              {i > 0 && <div className="carousel-editor__slide-divider" />}
              <div className="carousel-editor__center-guide" />
            </div>
          ))}

          {/* Image slots */}
          {layout.slots.map((slot, index) => (
            <ImageSlot
              key={slot.id}
              slotId={slot.id}
              index={index}
              x={slot.x}
              y={slot.y}
              width={slot.width}
              height={slot.height}
              placedImage={images[slot.id]}
              isFilterOpen={selectedFilterSlotId === slot.id}
              onSetImage={onSetImage}
              onRemoveImage={onRemoveImage}
              onUpdateOffsetNoHistory={onUpdateImageOffsetNoHistory}
              onPushHistorySnapshot={onPushImageHistorySnapshot}
              onFilterClick={handleFilterClick}
            />
          ))}

          {/* Text overlay layer */}
          <TextOverlayLayer
            overlays={textOverlays}
            shapeOverlays={shapeOverlays}
            layout={layout}
            currentSlide={currentSlide}
            selectedId={selectedKind === 'text' ? selectedOverlayId : null}
            onSelectedIdChange={handleSelectText}
            onUpdateNoHistory={onUpdateTextOverlayNoHistory}
            onPushSnapshot={onPushHistorySnapshot}
            onRemove={onRemoveTextOverlay}
            onSnapGuidesChange={setSnapGuides}
          />

          {/* Shape overlay layer */}
          <ShapeOverlayLayer
            overlays={shapeOverlays}
            textOverlays={textOverlays}
            layout={layout}
            aspectRatio={aspectRatio}
            currentSlide={currentSlide}
            selectedId={selectedKind === 'shape' ? selectedOverlayId : null}
            onSelectedIdChange={handleSelectShape}
            onUpdateNoHistory={onUpdateShapeOverlayNoHistory}
            onPushSnapshot={onPushHistorySnapshot}
            onRemove={onRemoveShapeOverlay}
            onSnapGuidesChange={setSnapGuides}
          />

          {/* Snap guide lines */}
          {snapGuides.length > 0 && (
            <div className="snap-guide-layer" style={{ left: `${(currentSlide / layout.slideCount) * 100}%`, width: `${100 / layout.slideCount}%` }}>
              {snapGuides.map((g, i) => (
                <div
                  key={`${g.axis}-${g.position}-${i}`}
                  className={`snap-guide snap-guide--${g.axis}`}
                  style={
                    g.axis === 'x'
                      ? { left: `${g.position}%`, top: 0, bottom: 0 }
                      : { top: `${g.position}%`, left: 0, right: 0 }
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating toolbar — portal to body, positioned above the selected overlay (desktop only) */}
      {!isMobile && selectedTextOverlay && toolbarPos && createPortal(
        <div
          className="text-toolbar-portal"
          style={{
            position: 'fixed',
            top: `${toolbarPos.top}px`,
            left: `${toolbarPos.left}px`,
            transform: toolbarPos.below ? 'translateX(-50%)' : 'translate(-50%, -100%)',
            zIndex: 10000,
            maxWidth: 'calc(100vw - 16px)',
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <FloatingToolbar
            overlay={selectedTextOverlay}
            onUpdate={onUpdateTextOverlay}
            onRemove={onRemoveTextOverlay}
            onBringForward={onBringForward}
            onSendBackward={onSendBackward}
          />
        </div>,
        document.body,
      )}

      {/* Shape toolbar — portal to body (desktop only) */}
      {!isMobile && selectedShapeOverlay && toolbarPos && createPortal(
        <div
          className="text-toolbar-portal"
          style={{
            position: 'fixed',
            top: `${toolbarPos.top}px`,
            left: `${toolbarPos.left}px`,
            transform: toolbarPos.below ? 'translateX(-50%)' : 'translate(-50%, -100%)',
            zIndex: 10000,
            maxWidth: 'calc(100vw - 16px)',
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ShapeToolbar
            shape={selectedShapeOverlay}
            onUpdate={onUpdateShapeOverlay}
            onRemove={onRemoveShapeOverlay}
            onBringForward={onBringForward}
            onSendBackward={onSendBackward}
          />
        </div>,
        document.body,
      )}

      {/* Image filter toolbar — floating portal (desktop only) */}
      {!isMobile && selectedFilterImage && selectedFilterSlotId && filterToolbarPos && createPortal(
        <div
          className="text-toolbar-portal"
          style={{
            position: 'fixed',
            top: `${filterToolbarPos.top}px`,
            left: `${filterToolbarPos.left}px`,
            transform: filterToolbarPos.below ? 'translateX(-50%)' : 'translate(-50%, -100%)',
            zIndex: 10000,
            maxWidth: 'calc(100vw - 16px)',
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ImageFilterToolbar
            filters={selectedFilterImage.filters}
            onUpdate={(filters) => handleFilterUpdate(selectedFilterSlotId, filters)}
            onClose={handleFilterClose}
          />
        </div>,
        document.body,
      )}

      {/* Slide navigation */}
      <div className="carousel-editor__nav">
        <button
          className="carousel-editor__nav-btn"
          onClick={() => onSetCurrentSlide(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          aria-label="Previous slide"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="carousel-editor__dots">
          {Array.from({ length: layout.slideCount }, (_, i) => (
            <button
              key={i}
              className={`carousel-editor__dot ${i === currentSlide ? 'carousel-editor__dot--active' : ''}`}
              onClick={() => onSetCurrentSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        <button
          className="carousel-editor__nav-btn"
          onClick={() => onSetCurrentSlide(Math.min(layout.slideCount - 1, currentSlide + 1))}
          disabled={currentSlide === layout.slideCount - 1}
          aria-label="Next slide"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M8 5L13 10L8 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <p className="carousel-editor__hint">
        Slide {currentSlide + 1} of {layout.slideCount}
      </p>
    </div>
  );
};

// ─── ImageSlot ───────────────────────────────────────────────────────────────

/** One-time mobile check for static label text in ImageSlot */
const IS_MOBILE_SLOT = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

interface ImageSlotProps {
  slotId: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  placedImage?: PlacedImage;
  isFilterOpen: boolean;
  onSetImage: (slotId: string, file: File) => void;
  onRemoveImage: (slotId: string) => void;
  onUpdateOffsetNoHistory: (slotId: string, updates: { offsetX?: number; offsetY?: number; scale?: number }) => void;
  onPushHistorySnapshot: () => void;
  onFilterClick: (slotId: string) => void;
}

/** Pixel distance threshold to distinguish a tap from a drag. */
const PAN_DRAG_THRESHOLD = 4;

const ImageSlot: React.FC<ImageSlotProps> = ({
  slotId,
  index,
  x,
  y,
  width,
  height,
  placedImage,
  isFilterOpen,
  onSetImage,
  onRemoveImage,
  onUpdateOffsetNoHistory,
  onPushHistorySnapshot,
  onFilterClick,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { showToast } = useToast();

  // Track whether a pan drag is in progress (to suppress overlay/click on filled images)
  const [isPanning, setIsPanning] = useState(false);

  // Pan drag state (stored in ref to avoid re-render per pointermove)
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
    didDrag: boolean;
    historyPushed: boolean;
  } | null>(null);

  // Reset error state when a new image is placed
  useEffect(() => {
    setImgError(false);
  }, [placedImage?.url]);

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file size (max 50 MB)
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        showToast('Image is too large. Maximum file size is 50 MB.');
        return;
      }

      // Validate file type
      if (file.type && !file.type.startsWith('image/')) {
        showToast('Please select an image file (JPEG, PNG, WebP, etc.).');
        return;
      }

      // Reject SVG files
      if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        showToast('SVG files are not supported. Please use JPEG, PNG, or WebP.');
        return;
      }

      // Auto-compress: downsample to max 3240px on longest dimension
      try {
        const compressed = await compressImage(file);
        onSetImage(slotId, compressed);
      } catch {
        // If compression fails, use original file
        onSetImage(slotId, file);
      }
    },
    [slotId, onSetImage, showToast]
  );

  const handleClick = useCallback(() => {
    if (!placedImage) {
      inputRef.current?.click();
    }
  }, [placedImage]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemoveImage(slotId);
    },
    [slotId, onRemoveImage]
  );

  const handleReplace = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      inputRef.current?.click();
    },
    []
  );

  // ─── Drag-to-pan handlers ─────────────────────────────────────────

  const handlePanPointerDown = useCallback((e: React.PointerEvent) => {
    // Only start pan on filled image (not on action buttons)
    if (!placedImage || imgError) return;
    const target = e.target as HTMLElement;
    if (target.closest('.image-slot__action-btn')) return;

    panRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: placedImage.offsetX,
      startOffsetY: placedImage.offsetY,
      didDrag: false,
      historyPushed: false,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [placedImage, imgError]);

  const handlePanPointerMove = useCallback((e: React.PointerEvent) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return;
    if (!placedImage || !imgRef.current) return;

    const dx = e.clientX - pan.startX;
    const dy = e.clientY - pan.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!pan.didDrag && dist < PAN_DRAG_THRESHOLD) return;

    if (!pan.didDrag) {
      pan.didDrag = true;
      setIsPanning(true);
    }

    // Push undo snapshot once when drag actually starts
    if (!pan.historyPushed) {
      pan.historyPushed = true;
      onPushHistorySnapshot();
    }

    const img = imgRef.current;
    const slotEl = img.parentElement;
    if (!slotEl) return;

    const slotRect = slotEl.getBoundingClientRect();
    const slotW = slotRect.width;
    const slotH = slotRect.height;

    // Determine which dimension has overflow (image is cropped along this axis)
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const slotAspect = slotW / slotH;

    let newOffsetX = pan.startOffsetX;
    let newOffsetY = pan.startOffsetY;

    if (imgAspect > slotAspect) {
      // Image wider than slot — horizontal overflow, can pan horizontally
      // The visible width of the image in "slot pixels" if fully shown would be:
      // visibleFullWidth = slotH * imgAspect
      // The overflow in slot pixels = visibleFullWidth - slotW
      const overflowPx = slotH * imgAspect - slotW;
      if (overflowPx > 0) {
        // Drag right → image moves right → object-position X decreases
        const deltaPercent = (-dx / overflowPx) * 100;
        newOffsetX = Math.max(0, Math.min(100, pan.startOffsetX + deltaPercent));
      }
    } else {
      // Image taller than slot — vertical overflow, can pan vertically
      const overflowPx = (slotW / imgAspect) - slotH;
      if (overflowPx > 0) {
        // Drag down → image moves down → object-position Y decreases
        const deltaPercent = (-dy / overflowPx) * 100;
        newOffsetY = Math.max(0, Math.min(100, pan.startOffsetY + deltaPercent));
      }
    }

    onUpdateOffsetNoHistory(slotId, { offsetX: newOffsetX, offsetY: newOffsetY });
  }, [placedImage, slotId, onUpdateOffsetNoHistory, onPushHistorySnapshot]);

  const handlePanPointerUp = useCallback((e: React.PointerEvent) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return;

    // If it was a tap (not a drag), let the click handler deal with it
    if (!pan.didDrag) {
      panRef.current = null;
      return;
    }

    panRef.current = null;
    // Delay clearing isPanning to prevent the overlay from flash-showing on pointerup
    requestAnimationFrame(() => {
      setIsPanning(false);
    });
  }, []);

  const handlePanPointerCancel = useCallback((e: React.PointerEvent) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return;
    panRef.current = null;
    setIsPanning(false);
  }, []);

    // Compute CSS filter string for the image
    const cssFilter = placedImage ? buildCssFilterString(placedImage.filters) : 'none';

    const handleFilterBtn = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onFilterClick(slotId);
      },
      [slotId, onFilterClick]
    );

  return (
    <div
      className={`image-slot ${isDragOver ? 'image-slot--drag-over' : ''} ${placedImage ? 'image-slot--filled' : ''} ${isPanning ? 'image-slot--panning' : ''} ${isFilterOpen ? 'image-slot--filter-open' : ''}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPointerDown={handlePanPointerDown}
      onPointerMove={handlePanPointerMove}
      onPointerUp={handlePanPointerUp}
      onPointerCancel={handlePanPointerCancel}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="image-slot__input"
        onChange={handleFileChange}
      />

      {placedImage ? (
        <>
          {imgError ? (
            <div className="image-slot__error">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="6" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M12 14L20 22M20 14L12 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="image-slot__label">Failed to load</span>
              <span className="image-slot__sublabel">Try another image</span>
            </div>
          ) : (
            <img
              ref={imgRef}
              src={placedImage.url}
              alt={`Image ${index + 1}`}
              className="image-slot__image"
              draggable={false}
              onError={() => setImgError(true)}
              style={{
                objectPosition: `${placedImage.offsetX}% ${placedImage.offsetY}%`,
                filter: cssFilter !== 'none' ? cssFilter : undefined,
              }}
            />
          )}
          <div className={`image-slot__overlay ${isPanning ? 'image-slot__overlay--hidden' : ''}`}>
            <button
              className="image-slot__action-btn"
              onClick={handleReplace}
              aria-label="Replace image"
              title="Replace"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 4.5L11.5 2.5M13.5 4.5L5.5 12.5L2 13.5L3 10L11.5 2.5M13.5 4.5L11.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              className={`image-slot__action-btn ${isFilterOpen ? 'image-slot__action-btn--active' : ''}`}
              onClick={handleFilterBtn}
              aria-label="Image filters"
              title="Filters"
              data-filter-slot={slotId}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="4" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <circle cx="8" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <circle cx="12" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <line x1="1" y1="5" x2="2.5" y2="5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="5.5" y1="5" x2="15" y2="5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="1" y1="11" x2="6.5" y2="11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="9.5" y1="11" x2="15" y2="11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="1" y1="7" x2="10.5" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="13.5" y1="7" x2="15" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              className="image-slot__action-btn image-slot__action-btn--danger"
              onClick={handleRemove}
              aria-label="Remove image"
              title="Remove"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </>
      ) : (
        <div className="image-slot__placeholder">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="6" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="11" cy="13" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 22L10 16L14 20L20 14L28 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="image-slot__label">Photo {index + 1}</span>
          <span className="image-slot__sublabel">{IS_MOBILE_SLOT ? 'Tap to add photo' : 'Click or drag & drop'}</span>
        </div>
      )}
    </div>
  );
};

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CarouselLayout, PlacedImage, AspectRatio, TextOverlay, ShapeOverlay, BackgroundConfig } from '../types';
import { ASPECT_RATIOS } from '../types';
import { TextOverlayLayer, FloatingToolbar } from './TextOverlayLayer';
import { ShapeOverlayLayer, ShapeToolbar } from './ShapeOverlayLayer';
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
}) => {
  const slideOffset = -(currentSlide * (100 / layout.slideCount));
  const config = ASPECT_RATIOS[aspectRatio];
  const ratioFactor = config.width / config.height;
  const bgCSS = bgToCSS(background);

  // Unified selection: either a text overlay or a shape overlay is selected
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<'text' | 'shape' | null>(null);

  const selectedTextOverlay = selectedKind === 'text' && selectedOverlayId
    ? textOverlays.find((o) => o.id === selectedOverlayId) ?? null
    : null;
  const selectedShapeOverlay = selectedKind === 'shape' && selectedOverlayId
    ? shapeOverlays.find((o) => o.id === selectedOverlayId) ?? null
    : null;

  // Handlers that enforce mutual exclusion
  const handleSelectText = useCallback((id: string | null) => {
    setSelectedOverlayId(id);
    setSelectedKind(id ? 'text' : null);
  }, []);

  const handleSelectShape = useCallback((id: string | null) => {
    setSelectedOverlayId(id);
    setSelectedKind(id ? 'shape' : null);
  }, []);

  // Toolbar position — computed from the selected overlay element's bounding rect
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number; below: boolean } | null>(null);

  // Deselect when changing slides
  useEffect(() => {
    setSelectedOverlayId(null);
    setSelectedKind(null);
  }, [currentSlide]);

  // ── Swipe navigation on mobile ──────────────────────────────────────────
  const viewportRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef<{ startX: number; startY: number; started: boolean } | null>(null);

  const handleSwipeStart = useCallback((e: React.PointerEvent) => {
    // Only handle single-finger touch (or mouse) — ignore if it started on an overlay
    if (e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-overlay-id], [data-shape-id], .shape-resize-handle')) return;
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

  // Keep toolbar position in sync with selected overlay element
  useLayoutEffect(() => {
    if (!selectedOverlayId) {
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

  return (
    <div className="carousel-editor">
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
              onSetImage={onSetImage}
              onRemoveImage={onRemoveImage}
            />
          ))}

          {/* Text overlay layer */}
          <TextOverlayLayer
            overlays={textOverlays}
            layout={layout}
            selectedId={selectedKind === 'text' ? selectedOverlayId : null}
            onSelectedIdChange={handleSelectText}
            onUpdateNoHistory={onUpdateTextOverlayNoHistory}
            onPushSnapshot={onPushHistorySnapshot}
            onRemove={onRemoveTextOverlay}
          />

          {/* Shape overlay layer */}
          <ShapeOverlayLayer
            overlays={shapeOverlays}
            layout={layout}
            aspectRatio={aspectRatio}
            selectedId={selectedKind === 'shape' ? selectedOverlayId : null}
            onSelectedIdChange={handleSelectShape}
            onUpdateNoHistory={onUpdateShapeOverlayNoHistory}
            onPushSnapshot={onPushHistorySnapshot}
            onRemove={onRemoveShapeOverlay}
          />
        </div>
      </div>

      {/* Floating toolbar — portal to body, positioned above the selected overlay */}
      {selectedTextOverlay && toolbarPos && createPortal(
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

      {/* Shape toolbar — portal to body */}
      {selectedShapeOverlay && toolbarPos && createPortal(
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

interface ImageSlotProps {
  slotId: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  placedImage?: PlacedImage;
  onSetImage: (slotId: string, file: File) => void;
  onRemoveImage: (slotId: string) => void;
}

const ImageSlot: React.FC<ImageSlotProps> = ({
  slotId,
  index,
  x,
  y,
  width,
  height,
  placedImage,
  onSetImage,
  onRemoveImage,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Reset error state when a new image is placed
  useEffect(() => {
    setImgError(false);
  }, [placedImage?.url]);

  const handleFile = useCallback(
    (file: File) => {
      // Validate file size (max 50 MB)
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        alert('Image is too large. Maximum file size is 50 MB.');
        return;
      }

      // Validate file type
      if (file.type && !file.type.startsWith('image/')) {
        alert('Please select an image file (JPEG, PNG, WebP, etc.).');
        return;
      }

      // Reject SVG files
      if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        alert('SVG files are not supported. Please use JPEG, PNG, or WebP.');
        return;
      }

      onSetImage(slotId, file);
    },
    [slotId, onSetImage]
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

  return (
    <div
      className={`image-slot ${isDragOver ? 'image-slot--drag-over' : ''} ${placedImage ? 'image-slot--filled' : ''}`}
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
              src={placedImage.url}
              alt={`Image ${index + 1}`}
              className="image-slot__image"
              draggable={false}
              onError={() => setImgError(true)}
            />
          )}
          <div className="image-slot__overlay">
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
          <span className="image-slot__sublabel">Click or drag & drop</span>
        </div>
      )}
    </div>
  );
};

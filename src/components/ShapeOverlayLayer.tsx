import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ShapeOverlay, CarouselLayout, ShapeType, AspectRatio } from '../types';
import { ASPECT_RATIOS } from '../types';
import './ShapeOverlayLayer.css';

// ─── Types ─────────────────────────────────────────────────

type HandleDir = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e';

const CONSTRAINED_SHAPES: ShapeType[] = ['square', 'circle'];

// ─── Helper: build CSS fill from shape ─────────────────────

function shapeFillCSS(shape: ShapeOverlay): string {
  if (shape.fillType === 'transparent') return 'transparent';
  if (shape.fillType === 'gradient') {
    return `linear-gradient(${shape.gradientAngle}deg, ${shape.gradientStart}, ${shape.gradientEnd})`;
  }
  return shape.fillColor;
}

// ─── Layer ─────────────────────────────────────────────────

interface ShapeOverlayLayerProps {
  overlays: ShapeOverlay[];
  layout: CarouselLayout;
  aspectRatio: AspectRatio;
  selectedId: string | null;
  onSelectedIdChange: (id: string | null) => void;
  onUpdateNoHistory: (id: string, updates: Partial<ShapeOverlay>) => void;
  onPushSnapshot: () => void;
  onRemove: (id: string) => void;
}

export const ShapeOverlayLayer: React.FC<ShapeOverlayLayerProps> = ({
  overlays,
  layout,
  aspectRatio,
  selectedId,
  onSelectedIdChange,
  onUpdateNoHistory,
  onPushSnapshot,
  onRemove,
}) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const handleLayerClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === layerRef.current) {
        onSelectedIdChange(null);
      }
    },
    [onSelectedIdChange]
  );

  return (
    <div ref={layerRef} className="shape-overlay-layer" onClick={handleLayerClick}>
      {overlays.map((shape) => (
        <ShapeOverlayItem
          key={shape.id}
          shape={shape}
          layout={layout}
          aspectRatio={aspectRatio}
          isSelected={selectedId === shape.id}
          onSelect={() => onSelectedIdChange(shape.id)}
          onUpdateNoHistory={onUpdateNoHistory}
          onPushSnapshot={onPushSnapshot}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

// ─── Single Shape Overlay Item ─────────────────────────────

interface ShapeOverlayItemProps {
  shape: ShapeOverlay;
  layout: CarouselLayout;
  aspectRatio: AspectRatio;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateNoHistory: (id: string, updates: Partial<ShapeOverlay>) => void;
  onPushSnapshot: () => void;
  onRemove: (id: string) => void;
}

const ShapeOverlayItem: React.FC<ShapeOverlayItemProps> = ({
  shape,
  layout,
  aspectRatio,
  isSelected,
  onSelect,
  onUpdateNoHistory,
  onPushSnapshot,
  onRemove,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const arConfig = ASPECT_RATIOS[aspectRatio];
  // Ratio of slide width to slide height (e.g., 1080/1350 = 0.8 for 4:5)
  const slideAR = arConfig.width / arConfig.height;
  const isConstrained = CONSTRAINED_SHAPES.includes(shape.type);

  // Position on the full canvas
  const leftPercent = ((shape.slideIndex + shape.x / 100) / layout.slideCount) * 100;
  const topPercent = shape.y;
  // Width as % of a single slide → convert to % of full canvas
  const widthPercent = shape.width / layout.slideCount;
  // For constrained shapes (square/circle), derive height from width to be visually 1:1.
  // shape.width is % of slide width. To get the same physical length as a % of slide height:
  // heightPercent = shape.width * slideAR  (because slideWidth * w% == slideHeight * h% → h% = w% * W/H)
  const heightPercent = isConstrained ? shape.width * slideAR : shape.height;

  // Border width in cqw (same pattern as text fontSize)
  const borderWidthCqw = (shape.borderWidth / 1080) * 100;

  // ─── Drag to move ────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Ignore if clicking on a resize handle
      if ((e.target as HTMLElement).classList.contains('shape-resize-handle')) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect();

      const layerEl = wrapperRef.current?.parentElement;
      if (!layerEl) return;

      const rect = layerEl.getBoundingClientRect();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: shape.x,
        origY: shape.y,
      };

      onPushSnapshot();

      // Capture pointer for reliable tracking
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const handlePointerMove = (ev: PointerEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;

        const slideWidthPx = rect.width / layout.slideCount;
        const slideHeightPx = rect.height;

        // For constrained shapes, derive the effective height% for bounding
        const effectiveHeight = isConstrained ? shape.width * slideAR : shape.height;
        const newX = Math.max(0, Math.min(100 - shape.width, dragRef.current.origX + (dx / slideWidthPx) * 100));
        const newY = Math.max(0, Math.min(100 - effectiveHeight, dragRef.current.origY + (dy / slideHeightPx) * 100));

        onUpdateNoHistory(shape.id, { x: newX, y: newY });
      };

      const handlePointerUp = () => {
        dragRef.current = null;
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [shape.id, shape.x, shape.y, shape.width, shape.height, layout.slideCount, isConstrained, slideAR, onSelect, onUpdateNoHistory, onPushSnapshot]
  );

  // ─── Resize handles ─────────────────────────

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, dir: HandleDir) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect();

      const layerEl = wrapperRef.current?.parentElement;
      if (!layerEl) return;

      const rect = layerEl.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const origX = shape.x;
      const origY = shape.y;
      const origW = shape.width;
      const origH = shape.height;

      onPushSnapshot();

      // Capture pointer for reliable tracking
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const handlePointerMove = (ev: PointerEvent) => {
        const slideWidthPx = rect.width / layout.slideCount;
        const slideHeightPx = rect.height;

        const dxPct = ((ev.clientX - startX) / slideWidthPx) * 100;
        const dyPct = ((ev.clientY - startY) / slideHeightPx) * 100;

        let newX = origX;
        let newY = origY;
        let newW = origW;
        let newH = origH;

        if (isConstrained) {
          // For square/circle: resize based on width only, derive height
          if (dir.includes('e') || dir.includes('w')) {
            newW = Math.max(3, dir.includes('w') ? origW - dxPct : origW + dxPct);
          } else {
            // Pure vertical handle — convert dy to equivalent width change
            const dyAsWidth = dyPct / slideAR;
            newW = Math.max(3, dir.includes('n') ? origW - dyAsWidth : origW + dyAsWidth);
          }

          // Derive height from width
          newH = newW * slideAR;

          // Adjust position for nw/ne/sw handles
          if (dir.includes('w')) newX = origX + (origW - newW);
          if (dir.includes('n')) newY = origY + (origW * slideAR - newH);  // origH_visual - newH_visual
        } else {
          // Non-constrained: free resize
          if (dir.includes('e')) {
            newW = Math.max(3, origW + dxPct);
          }
          if (dir.includes('w')) {
            newW = Math.max(3, origW - dxPct);
            newX = origX + (origW - newW);
          }
          if (dir.includes('s')) {
            newH = Math.max(3, origH + dyPct);
          }
          if (dir.includes('n')) {
            newH = Math.max(3, origH - dyPct);
            newY = origY + (origH - newH);
          }
        }

        // Clamp to slide bounds
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);
        newW = Math.min(newW, 100 - newX);
        if (isConstrained) {
          newH = newW * slideAR;
          // If height would exceed bounds, constrain width instead
          if (newY + newH > 100) {
            newH = 100 - newY;
            newW = newH / slideAR;
          }
        } else {
          newH = Math.min(newH, 100 - newY);
        }

        onUpdateNoHistory(shape.id, { x: newX, y: newY, width: newW, height: newH });
      };

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [shape.id, shape.x, shape.y, shape.width, shape.height, layout.slideCount, isConstrained, slideAR, onSelect, onUpdateNoHistory, onPushSnapshot]
  );

  const handleDeleteClick = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onRemove(shape.id);
    },
    [shape.id, onRemove]
  );

  // ─── Render shape visual ────────────────────

  const renderShape = () => {
    const fill = shapeFillCSS(shape);
    const borderStyle = shape.borderWidth > 0
      ? `${borderWidthCqw}cqw solid ${shape.borderColor}`
      : 'none';

    if (shape.type === 'triangle') {
      // SVG triangle with stroke and fill
      const svgFill = shape.fillType === 'transparent' ? 'none' : undefined;
      const gradientId = `grad-${shape.id}`;

      return (
        <div className="shape-overlay-triangle">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            {shape.fillType === 'gradient' && (
              <defs>
                <linearGradient id={gradientId} gradientUnits="objectBoundingBox" gradientTransform={`rotate(${shape.gradientAngle}, 0.5, 0.5)`}>
                  <stop offset="0%" stopColor={shape.gradientStart} />
                  <stop offset="100%" stopColor={shape.gradientEnd} />
                </linearGradient>
              </defs>
            )}
            <polygon
              points="50,0 100,100 0,100"
              fill={
                shape.fillType === 'gradient'
                  ? `url(#${gradientId})`
                  : shape.fillType === 'solid'
                    ? shape.fillColor
                    : svgFill || 'none'
              }
              stroke={shape.borderWidth > 0 ? shape.borderColor : 'none'}
              strokeWidth={shape.borderWidth > 0 ? (shape.borderWidth / 1080 * 100) : 0}
            />
          </svg>
        </div>
      );
    }

    const isEllipseType = shape.type === 'circle' || shape.type === 'ellipse';
    return (
      <div
        className={isEllipseType ? 'shape-overlay-ellipse' : 'shape-overlay-rect'}
        style={{
          background: fill,
          border: borderStyle,
        }}
      />
    );
  };

  // ─── Resize handle positions ────────────────

  const cornerHandles: HandleDir[] = ['nw', 'ne', 'sw', 'se'];
  const edgeHandles: HandleDir[] = isConstrained ? [] : ['n', 's', 'w', 'e'];
  const allHandles = [...cornerHandles, ...edgeHandles];

  return (
    <div
      ref={wrapperRef}
      data-shape-id={shape.id}
      className={`shape-overlay-item ${isSelected ? 'shape-overlay-item--selected' : ''}`}
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        width: `${widthPercent}%`,
        height: `${heightPercent}%`,
        opacity: shape.opacity,
        zIndex: shape.zIndex,
      }}
      onPointerDown={handlePointerDown}
    >
      {renderShape()}

      {/* Resize handles */}
      {isSelected &&
        allHandles.map((dir) => (
          <div
            key={dir}
            className={`shape-resize-handle shape-resize-handle--${dir}`}
            onPointerDown={(e) => handleResizePointerDown(e, dir)}
          />
        ))}

      {/* Delete X */}
      {isSelected && (
        <button
          className="shape-overlay-delete"
          onPointerDown={handleDeleteClick}
          title="Delete shape"
          aria-label="Delete shape overlay"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
};

// ─── Shape Floating Toolbar (exported for portal rendering) ──

export interface ShapeToolbarProps {
  shape: ShapeOverlay;
  onUpdate: (id: string, updates: Partial<ShapeOverlay>) => void;
  onRemove: (id: string) => void;
  onBringForward: (id: string, kind: 'shape') => void;
  onSendBackward: (id: string, kind: 'shape') => void;
}

export const ShapeToolbar: React.FC<ShapeToolbarProps> = ({
  shape,
  onUpdate,
  onRemove,
  onBringForward,
  onSendBackward,
}) => {
  // Mobile detection for two-row layout
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  );
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Primary controls: fill type, fill color(s), border color, delete
  const primaryControls = (
    <>
      {/* Fill type */}
      <select
        className="shape-toolbar__select"
        value={shape.fillType}
        onChange={(e) => onUpdate(shape.id, { fillType: e.target.value as ShapeOverlay['fillType'] })}
        title="Fill"
      >
        <option value="transparent">No Fill</option>
        <option value="solid">Solid</option>
        <option value="gradient">Gradient</option>
      </select>

      {/* Solid fill color */}
      {shape.fillType === 'solid' && (
        <label className="shape-toolbar__color-label" title="Fill Color">
          <input
            type="color"
            className="shape-toolbar__color-input"
            value={shape.fillColor}
            onChange={(e) => onUpdate(shape.id, { fillColor: e.target.value })}
          />
          <span className="shape-toolbar__color-swatch" style={{ background: shape.fillColor }} />
        </label>
      )}

      {/* Gradient controls */}
      {shape.fillType === 'gradient' && (
        <div className="shape-toolbar__gradient-row">
          <label className="shape-toolbar__color-label" title="Start Color">
            <input
              type="color"
              className="shape-toolbar__color-input"
              value={shape.gradientStart}
              onChange={(e) => onUpdate(shape.id, { gradientStart: e.target.value })}
            />
            <span className="shape-toolbar__color-swatch" style={{ background: shape.gradientStart }} />
          </label>
          <label className="shape-toolbar__color-label" title="End Color">
            <input
              type="color"
              className="shape-toolbar__color-input"
              value={shape.gradientEnd}
              onChange={(e) => onUpdate(shape.id, { gradientEnd: e.target.value })}
            />
            <span className="shape-toolbar__color-swatch" style={{ background: shape.gradientEnd }} />
          </label>
          <input
            type="number"
            className="shape-toolbar__angle-input"
            value={shape.gradientAngle}
            onChange={(e) => onUpdate(shape.id, { gradientAngle: ((Number(e.target.value) % 360) + 360) % 360 })}
            title="Angle"
            min={0}
            max={360}
          />
        </div>
      )}

      <div className="shape-toolbar__divider" />

      {/* Border color */}
      <label className="shape-toolbar__color-label" title="Border Color">
        <input
          type="color"
          className="shape-toolbar__color-input"
          value={shape.borderColor}
          onChange={(e) => onUpdate(shape.id, { borderColor: e.target.value })}
        />
        <span className="shape-toolbar__color-swatch" style={{ background: shape.borderColor, border: '2px solid var(--border)' }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </span>
      </label>

      {/* Delete */}
      <button
        className="shape-toolbar__btn shape-toolbar__btn--danger"
        onClick={() => onRemove(shape.id)}
        title="Delete"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </>
  );

  // Secondary controls: border width, opacity, z-order
  const secondaryControls = (
    <>
      {/* Border width */}
      <span className="shape-toolbar__label">W</span>
      <input
        type="range"
        className="shape-toolbar__range"
        min={0}
        max={20}
        step={1}
        value={shape.borderWidth}
        onChange={(e) => onUpdate(shape.id, { borderWidth: Number(e.target.value) })}
        title={`Border: ${shape.borderWidth}px`}
      />

      <div className="shape-toolbar__divider" />

      {/* Opacity */}
      <span className="shape-toolbar__label">Op</span>
      <input
        type="range"
        className="shape-toolbar__range"
        min={0}
        max={1}
        step={0.05}
        value={shape.opacity}
        onChange={(e) => onUpdate(shape.id, { opacity: Number(e.target.value) })}
        title={`Opacity: ${Math.round(shape.opacity * 100)}%`}
      />

      <div className="shape-toolbar__divider" />

      {/* Z-order */}
      <button
        className="shape-toolbar__btn"
        onClick={() => onBringForward(shape.id, 'shape')}
        title="Bring Forward"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2L6 10M6 2L3 5M6 2L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        className="shape-toolbar__btn"
        onClick={() => onSendBackward(shape.id, 'shape')}
        title="Send Backward"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 10L6 2M6 10L3 7M6 10L9 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  );

  if (isMobile) {
    return (
      <div className="shape-toolbar shape-toolbar--mobile" onClick={(e) => e.stopPropagation()}>
        <div className="shape-toolbar__row">
          {primaryControls}
          <button
            className={`shape-toolbar__btn shape-toolbar__btn--more ${showMore ? 'shape-toolbar__btn--active' : ''}`}
            onClick={() => setShowMore((v) => !v)}
            title="More options"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="2" cy="6" r="1.2" fill="currentColor"/>
              <circle cx="6" cy="6" r="1.2" fill="currentColor"/>
              <circle cx="10" cy="6" r="1.2" fill="currentColor"/>
            </svg>
          </button>
        </div>
        {showMore && (
          <div className="shape-toolbar__row">
            {secondaryControls}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="shape-toolbar" onClick={(e) => e.stopPropagation()}>
      {/* Fill type */}
      <select
        className="shape-toolbar__select"
        value={shape.fillType}
        onChange={(e) => onUpdate(shape.id, { fillType: e.target.value as ShapeOverlay['fillType'] })}
        title="Fill"
      >
        <option value="transparent">No Fill</option>
        <option value="solid">Solid</option>
        <option value="gradient">Gradient</option>
      </select>

      {/* Solid fill color */}
      {shape.fillType === 'solid' && (
        <label className="shape-toolbar__color-label" title="Fill Color">
          <input
            type="color"
            className="shape-toolbar__color-input"
            value={shape.fillColor}
            onChange={(e) => onUpdate(shape.id, { fillColor: e.target.value })}
          />
          <span className="shape-toolbar__color-swatch" style={{ background: shape.fillColor }} />
        </label>
      )}

      {/* Gradient controls */}
      {shape.fillType === 'gradient' && (
        <div className="shape-toolbar__gradient-row">
          <label className="shape-toolbar__color-label" title="Start Color">
            <input
              type="color"
              className="shape-toolbar__color-input"
              value={shape.gradientStart}
              onChange={(e) => onUpdate(shape.id, { gradientStart: e.target.value })}
            />
            <span className="shape-toolbar__color-swatch" style={{ background: shape.gradientStart }} />
          </label>
          <label className="shape-toolbar__color-label" title="End Color">
            <input
              type="color"
              className="shape-toolbar__color-input"
              value={shape.gradientEnd}
              onChange={(e) => onUpdate(shape.id, { gradientEnd: e.target.value })}
            />
            <span className="shape-toolbar__color-swatch" style={{ background: shape.gradientEnd }} />
          </label>
          <input
            type="number"
            className="shape-toolbar__angle-input"
            value={shape.gradientAngle}
            onChange={(e) => onUpdate(shape.id, { gradientAngle: ((Number(e.target.value) % 360) + 360) % 360 })}
            title="Angle"
            min={0}
            max={360}
          />
        </div>
      )}

      <div className="shape-toolbar__divider" />

      {/* Border color */}
      <label className="shape-toolbar__color-label" title="Border Color">
        <input
          type="color"
          className="shape-toolbar__color-input"
          value={shape.borderColor}
          onChange={(e) => onUpdate(shape.id, { borderColor: e.target.value })}
        />
        <span className="shape-toolbar__color-swatch" style={{ background: shape.borderColor, border: '2px solid var(--border)' }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </span>
      </label>

      {/* Border width */}
      <span className="shape-toolbar__label">W</span>
      <input
        type="range"
        className="shape-toolbar__range"
        min={0}
        max={20}
        step={1}
        value={shape.borderWidth}
        onChange={(e) => onUpdate(shape.id, { borderWidth: Number(e.target.value) })}
        title={`Border: ${shape.borderWidth}px`}
      />

      <div className="shape-toolbar__divider" />

      {/* Opacity */}
      <span className="shape-toolbar__label">Op</span>
      <input
        type="range"
        className="shape-toolbar__range"
        min={0}
        max={1}
        step={0.05}
        value={shape.opacity}
        onChange={(e) => onUpdate(shape.id, { opacity: Number(e.target.value) })}
        title={`Opacity: ${Math.round(shape.opacity * 100)}%`}
      />

      <div className="shape-toolbar__divider" />

      {/* Z-order */}
      <button
        className="shape-toolbar__btn"
        onClick={() => onBringForward(shape.id, 'shape')}
        title="Bring Forward"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2L6 10M6 2L3 5M6 2L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        className="shape-toolbar__btn"
        onClick={() => onSendBackward(shape.id, 'shape')}
        title="Send Backward"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 10L6 2M6 10L3 7M6 10L9 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="shape-toolbar__divider" />

      {/* Delete */}
      <button
        className="shape-toolbar__btn shape-toolbar__btn--danger"
        onClick={() => onRemove(shape.id)}
        title="Delete"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};

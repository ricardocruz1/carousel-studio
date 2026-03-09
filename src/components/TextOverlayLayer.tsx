import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { TextOverlay, ShapeOverlay, CarouselLayout } from '../types';
import { FONT_OPTIONS, FONT_SIZE_OPTIONS } from '../types';
import { loadAllFonts } from '../utils/fontLoader';
import type { SnapGuide } from '../utils/snap';
import { snapTextPosition } from '../utils/snap';
import './TextOverlayLayer.css';

interface TextOverlayLayerProps {
  overlays: TextOverlay[];
  shapeOverlays: ShapeOverlay[];
  layout: CarouselLayout;
  currentSlide: number;
  selectedId: string | null;
  onSelectedIdChange: (id: string | null) => void;
  onUpdateNoHistory: (id: string, updates: Partial<TextOverlay>) => void;
  onPushSnapshot: () => void;
  onRemove: (id: string) => void;
  onSnapGuidesChange: (guides: SnapGuide[]) => void;
}

export const TextOverlayLayer: React.FC<TextOverlayLayerProps> = ({
  overlays,
  shapeOverlays,
  layout,
  currentSlide,
  selectedId,
  onSelectedIdChange,
  onUpdateNoHistory,
  onPushSnapshot,
  onRemove,
  onSnapGuidesChange,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Deselect when clicking outside any overlay
  const layerRef = useRef<HTMLDivElement>(null);
  const handleLayerClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ((e as React.MouseEvent).target === layerRef.current || (e as React.TouchEvent).target === layerRef.current) {
      onSelectedIdChange(null);
      setEditingId(null);
    }
  }, [onSelectedIdChange]);

  return (
    <div
      ref={layerRef}
      className="text-overlay-layer"
      onClick={handleLayerClick}
    >
      {overlays.map((overlay) => (
        <TextOverlayItem
          key={overlay.id}
          overlay={overlay}
          allTextOverlays={overlays}
          shapeOverlays={shapeOverlays}
          layout={layout}
          currentSlide={currentSlide}
          isSelected={selectedId === overlay.id}
          isEditing={editingId === overlay.id}
          onSelect={() => onSelectedIdChange(overlay.id)}
          onStartEdit={() => {
            onSelectedIdChange(overlay.id);
            setEditingId(overlay.id);
          }}
          onStopEdit={() => setEditingId(null)}
          onUpdateNoHistory={onUpdateNoHistory}
          onPushSnapshot={onPushSnapshot}
          onRemove={onRemove}
          onSnapGuidesChange={onSnapGuidesChange}
        />
      ))}
    </div>
  );
};

// ─── Single Text Overlay Item ──────────────────────────────────

interface TextOverlayItemProps {
  overlay: TextOverlay;
  allTextOverlays: TextOverlay[];
  shapeOverlays: ShapeOverlay[];
  layout: CarouselLayout;
  currentSlide: number;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdateNoHistory: (id: string, updates: Partial<TextOverlay>) => void;
  onPushSnapshot: () => void;
  onRemove: (id: string) => void;
  onSnapGuidesChange: (guides: SnapGuide[]) => void;
}

const TextOverlayItem: React.FC<TextOverlayItemProps> = ({
  overlay,
  allTextOverlays,
  shapeOverlays,
  layout,
  currentSlide,
  isSelected,
  isEditing,
  onSelect,
  onStartEdit,
  onStopEdit,
  onUpdateNoHistory,
  onPushSnapshot,
  onRemove,
  onSnapGuidesChange,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  // Track whether item was already selected when pointer went down (for tap-to-edit on mobile)
  const wasSelectedOnDown = useRef(false);
  const didDrag = useRef(false);

  // Position: left uses slideIndex-aware formula, top uses y%
  const leftPercent = ((overlay.slideIndex + overlay.x / 100) / layout.slideCount) * 100;
  const topPercent = overlay.y;

  // Font size in cqw units: fontSize / 1080 * 100
  const fontSizeCqw = (overlay.fontSize / 1080) * 100;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isEditing) return; // don't drag while editing text
    e.preventDefault();
    e.stopPropagation();

    // Track whether this item was already selected (for tap-to-edit)
    wasSelectedOnDown.current = isSelected;
    didDrag.current = false;

    onSelect();

    const layerEl = wrapperRef.current?.parentElement;
    if (!layerEl) return;

    const rect = layerEl.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: overlay.x,
      origY: overlay.y,
    };

    // Push a single snapshot BEFORE the drag starts
    onPushSnapshot();

    // Capture pointer for reliable tracking across boundaries
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const handlePointerMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;

      // Mark as drag if moved more than 3px (prevents accidental drag on tap)
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        didDrag.current = true;
      }

      // Convert pixel delta to percentage of a single slide
      const slideWidthPx = rect.width / layout.slideCount;
      const slideHeightPx = rect.height;

      const rawX = Math.max(0, Math.min(100, dragRef.current.origX + (dx / slideWidthPx) * 100));
      const rawY = Math.max(0, Math.min(100, dragRef.current.origY + (dy / slideHeightPx) * 100));

      // Measure text element dimensions as % of slide for center-based snapping
      let textWidthPct: number | undefined;
      let textHeightPct: number | undefined;
      const el = wrapperRef.current;
      if (el && slideWidthPx > 0 && slideHeightPx > 0) {
        const elRect = el.getBoundingClientRect();
        textWidthPct = (elRect.width / slideWidthPx) * 100;
        textHeightPct = (elRect.height / slideHeightPx) * 100;
      }

      // Apply snap with text dimensions for center-based alignment
      const snapResult = snapTextPosition(rawX, rawY, allTextOverlays, shapeOverlays, currentSlide, overlay.id, textWidthPct, textHeightPct);

      // Clamp snapped values
      const newX = Math.max(0, Math.min(100, snapResult.x));
      const newY = Math.max(0, Math.min(100, snapResult.y));

      onSnapGuidesChange(snapResult.guides);

      // Use no-history update during drag — only the initial snapshot counts
      onUpdateNoHistory(overlay.id, { x: newX, y: newY });
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      onSnapGuidesChange([]);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [isEditing, isSelected, overlay.id, overlay.x, overlay.y, layout.slideCount, onSelect, onUpdateNoHistory, onPushSnapshot, allTextOverlays, shapeOverlays, currentSlide, onSnapGuidesChange]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Push snapshot before editing starts so undo reverts to pre-edit text
    onPushSnapshot();
    onStartEdit();
    // Focus the text element after React renders it as contentEditable
    requestAnimationFrame(() => {
      const el = textRef.current;
      if (el) {
        el.focus();
        // Place cursor at end
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
  }, [onStartEdit, onPushSnapshot]);

  // Tap-to-edit on mobile: if item was already selected and user taps without dragging, enter edit mode
  const handlePointerUpOnItem = useCallback((e: React.PointerEvent) => {
    if (isEditing) return;
    if (wasSelectedOnDown.current && !didDrag.current) {
      e.stopPropagation();
      onPushSnapshot();
      onStartEdit();
      requestAnimationFrame(() => {
        const el = textRef.current;
        if (el) {
          el.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(el);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      });
    }
  }, [isEditing, onPushSnapshot, onStartEdit]);

  // Commit text on blur — this is the ONLY place we update the text in state
  const handleBlur = useCallback(() => {
    const el = textRef.current;
    if (el && isEditing) {
      const text = (el.textContent || '').slice(0, 500);
      // Use no-history update since we already pushed a snapshot on double-click
      onUpdateNoHistory(overlay.id, { text });
    }
    onStopEdit();
  }, [isEditing, overlay.id, onUpdateNoHistory, onStopEdit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onStopEdit();
      (e.target as HTMLElement).blur();
    }
    // Prevent undo/redo shortcuts from bubbling when editing text
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.stopPropagation();
    }
  }, [onStopEdit]);

  const handleDeleteClick = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onRemove(overlay.id);
  }, [overlay.id, onRemove]);

  return (
    <div
      ref={wrapperRef}
      data-overlay-id={overlay.id}
      className={`text-overlay-item ${isSelected ? 'text-overlay-item--selected' : ''} ${isEditing ? 'text-overlay-item--editing' : ''}`}
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        fontSize: `${fontSizeCqw}cqw`,
        fontFamily: overlay.fontFamily,
        fontWeight: overlay.fontWeight,
        fontStyle: overlay.fontStyle,
        textDecoration: overlay.textDecoration === 'underline' ? 'underline' : undefined,
        color: overlay.color,
        textAlign: overlay.textAlign,
        opacity: overlay.opacity,
        backgroundColor: overlay.backgroundColor || 'transparent',
        zIndex: overlay.zIndex,
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUpOnItem}
      onDoubleClick={handleDoubleClick}
    >
      {/* Editable text — React only sets textContent when NOT editing */}
      <div
        ref={textRef}
        className="text-overlay-content"
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={isEditing ? handleKeyDown : undefined}
      >
        {overlay.text}
      </div>

      {/* Delete X button — outside contentEditable, positioned absolutely */}
      {isSelected && !isEditing && (
        <button
          className="text-overlay-delete"
          onPointerDown={handleDeleteClick}
          title="Delete text"
          aria-label="Delete text overlay"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
};

// ─── Floating Toolbar ──────────────────────────────────────────

export interface FloatingToolbarProps {
  overlay: TextOverlay;
  onUpdate: (id: string, updates: Partial<TextOverlay>) => void;
  onRemove: (id: string) => void;
  onBringForward: (id: string, kind: 'text') => void;
  onSendBackward: (id: string, kind: 'text') => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ overlay, onUpdate, onRemove, onBringForward, onSendBackward }) => {
  const hasBgColor = overlay.backgroundColor !== '';

  // Load all Google Fonts when the toolbar (with font picker) first renders
  useEffect(() => {
    loadAllFonts();
  }, []);

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

  // Primary controls (always visible)
  const primaryControls = (
    <>
      {/* Font family */}
      <select
        className="text-toolbar__select"
        value={overlay.fontFamily}
        onChange={(e) => onUpdate(overlay.id, { fontFamily: e.target.value })}
        title="Font"
      >
        {FONT_OPTIONS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Font size */}
      <select
        className="text-toolbar__select text-toolbar__select--narrow"
        value={overlay.fontSize}
        onChange={(e) => onUpdate(overlay.id, { fontSize: Number(e.target.value) })}
        title="Size"
      >
        {FONT_SIZE_OPTIONS.map((s) => (
          <option key={s} value={s}>{s}px</option>
        ))}
      </select>

      <div className="text-toolbar__divider" />

      {/* Bold toggle */}
      <button
        className={`text-toolbar__btn ${overlay.fontWeight === 700 ? 'text-toolbar__btn--active' : ''}`}
        onClick={() => onUpdate(overlay.id, { fontWeight: overlay.fontWeight === 700 ? 400 : 700 })}
        title="Bold"
      >
        B
      </button>

      {/* Italic toggle */}
      <button
        className={`text-toolbar__btn text-toolbar__btn--italic ${overlay.fontStyle === 'italic' ? 'text-toolbar__btn--active' : ''}`}
        onClick={() => onUpdate(overlay.id, { fontStyle: overlay.fontStyle === 'italic' ? 'normal' : 'italic' })}
        title="Italic"
      >
        I
      </button>

      {/* Underline toggle */}
      <button
        className={`text-toolbar__btn text-toolbar__btn--underline ${overlay.textDecoration === 'underline' ? 'text-toolbar__btn--active' : ''}`}
        onClick={() => onUpdate(overlay.id, { textDecoration: overlay.textDecoration === 'underline' ? 'none' : 'underline' })}
        title="Underline"
      >
        U
      </button>

      <div className="text-toolbar__divider" />

      {/* Text Color */}
      <label className="text-toolbar__color-label" title="Text Color">
        <input
          type="color"
          className="text-toolbar__color-input"
          value={overlay.color}
          onChange={(e) => onUpdate(overlay.id, { color: e.target.value })}
        />
        <span className="text-toolbar__color-swatch" style={{ background: overlay.color }}>
          <span className="text-toolbar__color-letter">A</span>
        </span>
      </label>

      {/* Delete */}
      <button
        className="text-toolbar__btn text-toolbar__btn--danger"
        onClick={() => onRemove(overlay.id)}
        title="Delete"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </>
  );

  // Secondary controls (behind "More" on mobile, always visible on desktop)
  const secondaryControls = (
    <>
      {/* Text align */}
      <select
        className="text-toolbar__select text-toolbar__select--narrow"
        value={overlay.textAlign}
        onChange={(e) => onUpdate(overlay.id, { textAlign: e.target.value as TextOverlay['textAlign'] })}
        title="Align"
      >
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>

      <div className="text-toolbar__divider" />

      {/* Text Background Color */}
      <div className="text-toolbar__bg-group">
        <label className="text-toolbar__color-label" title="Text Background">
          <input
            type="color"
            className="text-toolbar__color-input"
            value={hasBgColor ? overlay.backgroundColor : '#000000'}
            onChange={(e) => onUpdate(overlay.id, { backgroundColor: e.target.value })}
          />
          <span
            className="text-toolbar__color-swatch text-toolbar__color-swatch--bg"
            style={{ background: hasBgColor ? overlay.backgroundColor : 'transparent' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill={hasBgColor ? overlay.backgroundColor : 'none'} strokeDasharray={hasBgColor ? 'none' : '3 2'}/>
            </svg>
          </span>
        </label>
        {/* Clear bg button */}
        {hasBgColor && (
          <button
            className="text-toolbar__btn text-toolbar__btn--tiny"
            onClick={() => onUpdate(overlay.id, { backgroundColor: '' })}
            title="Remove background"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      <div className="text-toolbar__divider" />

      {/* Opacity */}
      <input
        type="range"
        className="text-toolbar__range"
        min={0}
        max={1}
        step={0.05}
        value={overlay.opacity}
        onChange={(e) => onUpdate(overlay.id, { opacity: Number(e.target.value) })}
        title={`Opacity: ${Math.round(overlay.opacity * 100)}%`}
      />

      <div className="text-toolbar__divider" />

      {/* Z-order */}
      <button
        className="text-toolbar__btn"
        onClick={() => onBringForward(overlay.id, 'text')}
        title="Bring Forward"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2L6 10M6 2L3 5M6 2L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        className="text-toolbar__btn"
        onClick={() => onSendBackward(overlay.id, 'text')}
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
      <div className="text-toolbar text-toolbar--mobile" onClick={(e) => e.stopPropagation()}>
        <div className="text-toolbar__row">
          {primaryControls}
          <button
            className={`text-toolbar__btn text-toolbar__btn--more ${showMore ? 'text-toolbar__btn--active' : ''}`}
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
          <div className="text-toolbar__row">
            {secondaryControls}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="text-toolbar" onClick={(e) => e.stopPropagation()}>
      {/* Font family */}
      <select
        className="text-toolbar__select"
        value={overlay.fontFamily}
        onChange={(e) => onUpdate(overlay.id, { fontFamily: e.target.value })}
        title="Font"
      >
        {FONT_OPTIONS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Font size */}
      <select
        className="text-toolbar__select text-toolbar__select--narrow"
        value={overlay.fontSize}
        onChange={(e) => onUpdate(overlay.id, { fontSize: Number(e.target.value) })}
        title="Size"
      >
        {FONT_SIZE_OPTIONS.map((s) => (
          <option key={s} value={s}>{s}px</option>
        ))}
      </select>

      <div className="text-toolbar__divider" />

      {/* Bold toggle */}
      <button
        className={`text-toolbar__btn ${overlay.fontWeight === 700 ? 'text-toolbar__btn--active' : ''}`}
        onClick={() => onUpdate(overlay.id, { fontWeight: overlay.fontWeight === 700 ? 400 : 700 })}
        title="Bold"
      >
        B
      </button>

      {/* Italic toggle */}
      <button
        className={`text-toolbar__btn text-toolbar__btn--italic ${overlay.fontStyle === 'italic' ? 'text-toolbar__btn--active' : ''}`}
        onClick={() => onUpdate(overlay.id, { fontStyle: overlay.fontStyle === 'italic' ? 'normal' : 'italic' })}
        title="Italic"
      >
        I
      </button>

      {/* Underline toggle */}
      <button
        className={`text-toolbar__btn text-toolbar__btn--underline ${overlay.textDecoration === 'underline' ? 'text-toolbar__btn--active' : ''}`}
        onClick={() => onUpdate(overlay.id, { textDecoration: overlay.textDecoration === 'underline' ? 'none' : 'underline' })}
        title="Underline"
      >
        U
      </button>

      <div className="text-toolbar__divider" />

      {/* Text align */}
      <select
        className="text-toolbar__select text-toolbar__select--narrow"
        value={overlay.textAlign}
        onChange={(e) => onUpdate(overlay.id, { textAlign: e.target.value as TextOverlay['textAlign'] })}
        title="Align"
      >
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>

      <div className="text-toolbar__divider" />

      {/* Text Color */}
      <label className="text-toolbar__color-label" title="Text Color">
        <input
          type="color"
          className="text-toolbar__color-input"
          value={overlay.color}
          onChange={(e) => onUpdate(overlay.id, { color: e.target.value })}
        />
        <span className="text-toolbar__color-swatch" style={{ background: overlay.color }}>
          <span className="text-toolbar__color-letter">A</span>
        </span>
      </label>

      {/* Text Background Color */}
      <div className="text-toolbar__bg-group">
        <label className="text-toolbar__color-label" title="Text Background">
          <input
            type="color"
            className="text-toolbar__color-input"
            value={hasBgColor ? overlay.backgroundColor : '#000000'}
            onChange={(e) => onUpdate(overlay.id, { backgroundColor: e.target.value })}
          />
          <span
            className="text-toolbar__color-swatch text-toolbar__color-swatch--bg"
            style={{ background: hasBgColor ? overlay.backgroundColor : 'transparent' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill={hasBgColor ? overlay.backgroundColor : 'none'} strokeDasharray={hasBgColor ? 'none' : '3 2'}/>
            </svg>
          </span>
        </label>
        {/* Clear bg button */}
        {hasBgColor && (
          <button
            className="text-toolbar__btn text-toolbar__btn--tiny"
            onClick={() => onUpdate(overlay.id, { backgroundColor: '' })}
            title="Remove background"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      <div className="text-toolbar__divider" />

      {/* Opacity */}
      <input
        type="range"
        className="text-toolbar__range"
        min={0}
        max={1}
        step={0.05}
        value={overlay.opacity}
        onChange={(e) => onUpdate(overlay.id, { opacity: Number(e.target.value) })}
        title={`Opacity: ${Math.round(overlay.opacity * 100)}%`}
      />

      <div className="text-toolbar__divider" />

      {/* Z-order */}
      <button
        className="text-toolbar__btn"
        onClick={() => onBringForward(overlay.id, 'text')}
        title="Bring Forward"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2L6 10M6 2L3 5M6 2L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        className="text-toolbar__btn"
        onClick={() => onSendBackward(overlay.id, 'text')}
        title="Send Backward"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 10L6 2M6 10L3 7M6 10L9 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="text-toolbar__divider" />

      {/* Delete */}
      <button
        className="text-toolbar__btn text-toolbar__btn--danger"
        onClick={() => onRemove(overlay.id)}
        title="Delete"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
};

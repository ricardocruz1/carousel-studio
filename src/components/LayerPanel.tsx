import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Layer } from '../types';
import { MAX_LAYERS } from '../types';
import './LayerPanel.css';

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string | null;
  isMobile: boolean;
  /** 'builder' = full CRUD (add/remove/rename/select/toggle).
   *  'editor' = read-only structure (select/toggle visibility/rename only, no add/remove). */
  mode?: 'builder' | 'editor';
  onSelectLayer: (layerId: string) => void;
  onAddLayer?: () => void;
  onRemoveLayer?: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onRenameLayer: (layerId: string, name: string) => void;
}

/** Eye icon for visibility toggle */
const EyeOpen = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);

const EyeClosed = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
    <path d="M2 2L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  activeLayerId,
  isMobile,
  mode = 'editor',
  onSelectLayer,
  onAddLayer,
  onRemoveLayer,
  onToggleVisibility,
  onRenameLayer,
}) => {
  const isBuilder = mode === 'builder';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Mobile: popover state
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);

  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const activeIndex = layers.findIndex((l) => l.id === activeLayerId);

  // Close popover when clicking outside
  useEffect(() => {
    if (!popoverOpen) return;
    const handleClickOutside = (e: PointerEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        pillRef.current && !pillRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [popoverOpen]);

  // Focus the rename input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const startRename = useCallback((layer: Layer) => {
    setEditingId(layer.id);
    setEditValue(layer.name);
  }, []);

  const commitRename = useCallback(() => {
    if (editingId && editValue.trim()) {
      onRenameLayer(editingId, editValue.trim());
    }
    setEditingId(null);
  }, [editingId, editValue, onRenameLayer]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') setEditingId(null);
  }, [commitRename]);

  // Render the layer list (used in both desktop sidebar and mobile popover)
  // Reversed so top = frontmost layer
  const reversedLayers = [...layers].reverse();

  const layerList = (
    <div className="layer-panel__list">
      {reversedLayers.map((layer, i) => {
        const isActive = layer.id === activeLayerId;
        const isBottom = i === reversedLayers.length - 1;
        return (
          <div
            key={layer.id}
            className={`layer-panel__item ${isActive ? 'layer-panel__item--active' : ''}`}
            onClick={() => onSelectLayer(layer.id)}
          >
            <button
              className="layer-panel__visibility"
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
              title={layer.visible ? 'Hide layer' : 'Show layer'}
              aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
            >
              {layer.visible ? <EyeOpen /> : <EyeClosed />}
            </button>

            <div className="layer-panel__info">
              {editingId === layer.id ? (
                <input
                  ref={editInputRef}
                  className="layer-panel__rename-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={handleRenameKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  maxLength={20}
                />
              ) : (
                <span
                  className="layer-panel__name"
                  onDoubleClick={(e) => { e.stopPropagation(); startRename(layer); }}
                  title="Double-click to rename"
                >
                  {layer.name}
                </span>
              )}
              <span className="layer-panel__meta">
                {layer.layout.slots.length} slot{layer.layout.slots.length !== 1 ? 's' : ''}
                {isBottom ? ' (bg)' : ''}
              </span>
            </div>

            {isBuilder && layers.length > 1 && onRemoveLayer && (
              <button
                className="layer-panel__delete"
                onClick={(e) => { e.stopPropagation(); onRemoveLayer(layer.id); }}
                title="Delete layer"
                aria-label="Delete layer"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  const addButton = isBuilder && onAddLayer ? (
    <button
      className="layer-panel__add"
      onClick={onAddLayer}
      disabled={layers.length >= MAX_LAYERS}
      title={layers.length >= MAX_LAYERS ? `Maximum ${MAX_LAYERS} layers` : 'Add layer'}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      Add Layer
    </button>
  ) : null;

  // ─── Mobile: Floating pill + popover ───────────────────
  if (isMobile) {
    return (
      <div className="layer-panel layer-panel--mobile">
        <button
          ref={pillRef}
          className="layer-panel__pill"
          onClick={() => setPopoverOpen((v) => !v)}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            <rect x="2" y="6.5" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.2" opacity="0.6"/>
            <rect x="2" y="11" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.2" opacity="0.3"/>
          </svg>
          {activeLayer?.name ?? 'Layer 1'}
          <span className="layer-panel__pill-count">{activeIndex + 1}/{layers.length}</span>
        </button>

        {popoverOpen && (
          <div ref={popoverRef} className="layer-panel__popover">
            <div className="layer-panel__popover-header">
              <span className="layer-panel__popover-title">Layers</span>
            </div>
            {layerList}
            {addButton}
          </div>
        )}
      </div>
    );
  }

  // ─── Desktop: Right sidebar ────────────────────────────
  return (
    <div className="layer-panel layer-panel--desktop">
      <div className="layer-panel__header">
        <span className="layer-panel__title">Layers</span>
      </div>
      {layerList}
      {addButton}
    </div>
  );
};

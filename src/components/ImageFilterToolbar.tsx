import React, { useCallback } from 'react';
import type { ImageFilters, FilterPreset } from '../types';
import { DEFAULT_IMAGE_FILTERS } from '../types';
import './ImageFilterToolbar.css';

interface ImageFilterToolbarProps {
  filters: ImageFilters;
  onUpdate: (filters: Partial<ImageFilters>) => void;
  onClose: () => void;
}

const PRESETS: { label: string; value: FilterPreset }[] = [
  { label: 'Original', value: 'none' },
  { label: 'Grayscale', value: 'grayscale' },
  { label: 'Sepia', value: 'sepia' },
  { label: 'Invert', value: 'invert' },
];

const SLIDERS: { key: keyof ImageFilters; label: string; min: number; max: number; step: number; unit: string }[] = [
  { key: 'blur', label: 'Blur', min: 0, max: 20, step: 0.5, unit: 'px' },
  { key: 'brightness', label: 'Brightness', min: 0, max: 200, step: 1, unit: '%' },
  { key: 'contrast', label: 'Contrast', min: 0, max: 200, step: 1, unit: '%' },
  { key: 'saturation', label: 'Saturation', min: 0, max: 200, step: 1, unit: '%' },
  { key: 'opacity', label: 'Opacity', min: 0, max: 100, step: 1, unit: '%' },
];

export const ImageFilterToolbar: React.FC<ImageFilterToolbarProps> = ({ filters, onUpdate, onClose }) => {
  const handlePreset = useCallback((preset: FilterPreset) => {
    if (preset === 'none') {
      // Reset everything to defaults
      onUpdate({ ...DEFAULT_IMAGE_FILTERS });
    } else {
      onUpdate({ preset });
    }
  }, [onUpdate]);

  const handleSlider = useCallback((key: keyof ImageFilters, value: number) => {
    onUpdate({ [key]: value });
  }, [onUpdate]);

  const handleReset = useCallback(() => {
    onUpdate({ ...DEFAULT_IMAGE_FILTERS });
  }, [onUpdate]);

  const isDefault =
    filters.blur === 0 &&
    filters.brightness === 100 &&
    filters.contrast === 100 &&
    filters.saturation === 100 &&
    filters.opacity === 100 &&
    filters.preset === 'none';

  return (
    <div className="image-filter-toolbar" onPointerDown={(e) => e.stopPropagation()}>
      <div className="image-filter-toolbar__header">
        <span className="image-filter-toolbar__title">Filters</span>
        <div className="image-filter-toolbar__header-actions">
          {!isDefault && (
            <button
              className="image-filter-toolbar__reset-btn"
              onClick={handleReset}
              title="Reset all filters"
            >
              Reset
            </button>
          )}
          <button
            className="image-filter-toolbar__close-btn"
            onClick={onClose}
            title="Close filters"
            aria-label="Close filters"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="image-filter-toolbar__presets">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            className={`image-filter-toolbar__preset ${filters.preset === p.value ? 'image-filter-toolbar__preset--active' : ''}`}
            onClick={() => handlePreset(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="image-filter-toolbar__sliders">
        {SLIDERS.map((s) => {
          const value = filters[s.key] as number;
          const defaultVal = DEFAULT_IMAGE_FILTERS[s.key] as number;
          return (
            <div key={s.key} className="image-filter-toolbar__slider-row">
              <label className="image-filter-toolbar__slider-label">
                {s.label}
                <span className="image-filter-toolbar__slider-value">
                  {value}{s.unit}
                </span>
              </label>
              <input
                type="range"
                className="image-filter-toolbar__slider"
                min={s.min}
                max={s.max}
                step={s.step}
                value={value}
                onChange={(e) => handleSlider(s.key, parseFloat(e.target.value))}
                style={{
                  // Highlight the track fill to show deviation from default
                  '--slider-progress': `${((value - s.min) / (s.max - s.min)) * 100}%`,
                  '--slider-default': `${((defaultVal - s.min) / (s.max - s.min)) * 100}%`,
                } as React.CSSProperties}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

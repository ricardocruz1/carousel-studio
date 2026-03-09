import React, { useCallback, useState } from 'react';
import type { BackgroundConfig } from '../types';
import { BACKGROUND_PRESETS } from '../types';

interface BackgroundPickerProps {
  background: BackgroundConfig;
  onChange: (config: BackgroundConfig) => void;
}

export const BackgroundPicker: React.FC<BackgroundPickerProps> = ({
  background,
  onChange,
}) => {
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetClick = useCallback((config: BackgroundConfig) => {
    onChange({ ...config });
    setShowCustom(false);
  }, [onChange]);

  const handleTypeChange = useCallback((type: BackgroundConfig['type']) => {
    onChange({ ...background, type });
  }, [background, onChange]);

  return (
    <div className="bg-picker">
      <span className="bg-picker__label">Background</span>

      <div className="bg-picker__presets">
        {BACKGROUND_PRESETS.map((preset) => {
          const isActive =
            background.type === preset.config.type &&
            (preset.config.type === 'solid'
              ? background.color === preset.config.color
              : background.gradientStart === preset.config.gradientStart &&
                background.gradientEnd === preset.config.gradientEnd);

          const style = preset.config.type === 'solid'
            ? { background: preset.config.color }
            : {
                background: `linear-gradient(${preset.config.gradientAngle}deg, ${preset.config.gradientStart}, ${preset.config.gradientEnd})`,
              };

          return (
            <button
              key={preset.label}
              className={`bg-picker__swatch ${isActive ? 'bg-picker__swatch--active' : ''}`}
              style={style}
              onClick={() => handlePresetClick(preset.config)}
              title={preset.label}
            />
          );
        })}

        <button
          className={`bg-picker__swatch bg-picker__swatch--custom ${showCustom ? 'bg-picker__swatch--active' : ''}`}
          onClick={() => setShowCustom(!showCustom)}
          title="Custom"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 5V11M5 8H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {showCustom && (
        <div className="bg-picker__custom">
          <div className="bg-picker__type-toggle">
            <button
              className={`bg-picker__type-btn ${background.type === 'solid' ? 'bg-picker__type-btn--active' : ''}`}
              onClick={() => handleTypeChange('solid')}
            >
              Solid
            </button>
            <button
              className={`bg-picker__type-btn ${background.type === 'gradient' ? 'bg-picker__type-btn--active' : ''}`}
              onClick={() => handleTypeChange('gradient')}
            >
              Gradient
            </button>
          </div>

          {background.type === 'solid' ? (
            <div className="bg-picker__row">
              <label className="bg-picker__field-label">Color</label>
              <input
                type="color"
                className="bg-picker__color-input"
                value={background.color}
                onChange={(e) => onChange({ ...background, color: e.target.value })}
              />
              <span className="bg-picker__hex">{background.color}</span>
            </div>
          ) : (
            <>
              <div className="bg-picker__row">
                <label className="bg-picker__field-label">Start</label>
                <input
                  type="color"
                  className="bg-picker__color-input"
                  value={background.gradientStart}
                  onChange={(e) => onChange({ ...background, gradientStart: e.target.value })}
                />
                <span className="bg-picker__hex">{background.gradientStart}</span>
              </div>
              <div className="bg-picker__row">
                <label className="bg-picker__field-label">End</label>
                <input
                  type="color"
                  className="bg-picker__color-input"
                  value={background.gradientEnd}
                  onChange={(e) => onChange({ ...background, gradientEnd: e.target.value })}
                />
                <span className="bg-picker__hex">{background.gradientEnd}</span>
              </div>
              <div className="bg-picker__row">
                <label className="bg-picker__field-label">Angle</label>
                <input
                  type="range"
                  className="bg-picker__angle-range"
                  min={0}
                  max={360}
                  step={5}
                  value={background.gradientAngle}
                  onChange={(e) => onChange({ ...background, gradientAngle: Number(e.target.value) })}
                />
                <span className="bg-picker__hex">{background.gradientAngle}&deg;</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

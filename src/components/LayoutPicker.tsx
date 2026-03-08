import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { CarouselLayout, AspectRatio } from '../types';
import { ASPECT_RATIOS } from '../types';
import { layouts } from '../layouts';
import './LayoutPicker.css';

interface LayoutPickerProps {
  selectedLayoutId: string | null;
  aspectRatio: AspectRatio;
  onSelectLayout: (layoutId: string) => void;
  onCustomClick?: () => void;
}

export const LayoutPicker: React.FC<LayoutPickerProps> = ({
  selectedLayoutId,
  aspectRatio,
  onSelectLayout,
  onCustomClick,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 192; // approximate card width + gap
    const amount = direction === 'left' ? -cardWidth * 2 : cardWidth * 2;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className="layout-picker">
      <h2 className="layout-picker__title">Choose a Layout</h2>

      <div className="layout-picker__container">
        {canScrollLeft && (
          <button
            className="layout-picker__arrow layout-picker__arrow--left"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        <div className="layout-picker__scroll" ref={scrollRef}>
          {layouts.map((layout) => (
            <LayoutCard
              key={layout.id}
              layout={layout}
              aspectRatio={aspectRatio}
              isSelected={layout.id === selectedLayoutId}
              onClick={() => onSelectLayout(layout.id)}
            />
          ))}
          {onCustomClick && (
            <button
              className="layout-card layout-card--custom"
              onClick={onCustomClick}
              aria-label="Build a custom layout"
            >
              <div
                className="layout-card__preview layout-card__preview--custom"
                style={{ paddingTop: `${(ASPECT_RATIOS[aspectRatio].height / (ASPECT_RATIOS[aspectRatio].width * 2)) * 100}%` }}
              >
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M16 8V24M8 16H24"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="layout-card__info">
                <span className="layout-card__name">Custom</span>
                <span className="layout-card__meta">Build your own</span>
              </div>
            </button>
          )}
        </div>

        {canScrollRight && (
          <button
            className="layout-picker__arrow layout-picker__arrow--right"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M8 5L13 10L8 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

interface LayoutCardProps {
  layout: CarouselLayout;
  aspectRatio: AspectRatio;
  isSelected: boolean;
  onClick: () => void;
}

const LayoutCard: React.FC<LayoutCardProps> = ({ layout, aspectRatio, isSelected, onClick }) => {
  const slideMarkers = Array.from({ length: layout.slideCount }, (_, i) => i);
  // Compute preview aspect ratio: (slideCount * width) : height
  const config = ASPECT_RATIOS[aspectRatio];
  const previewPaddingTop = (config.height / (config.width * layout.slideCount)) * 100;

  return (
    <button
      className={`layout-card ${isSelected ? 'layout-card--selected' : ''}`}
      onClick={onClick}
      aria-label={`Select ${layout.name} layout`}
    >
      <div className="layout-card__preview" style={{ paddingTop: `${previewPaddingTop}%` }}>
        {/* Slide dividers */}
        {slideMarkers.slice(1).map((i) => (
          <div
            key={`divider-${i}`}
            className="layout-card__divider"
            style={{ left: `${(i / layout.slideCount) * 100}%` }}
          />
        ))}
        {/* Slot previews */}
        {layout.thumbnailSlots.map((slot, index) => (
          <div
            key={slot.id}
            className="layout-card__slot"
            style={{
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              width: `${slot.width}%`,
              height: `${slot.height}%`,
            }}
          >
            <span className="layout-card__slot-number">{index + 1}</span>
          </div>
        ))}
      </div>
      <div className="layout-card__info">
        <span className="layout-card__name">{layout.name}</span>
        <span className="layout-card__meta">
          {layout.imageCount} photos &middot; {layout.slideCount} slides
        </span>
      </div>
    </button>
  );
};

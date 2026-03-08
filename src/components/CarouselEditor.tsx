import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CarouselLayout, PlacedImage, AspectRatio } from '../types';
import { ASPECT_RATIOS } from '../types';
import './CarouselEditor.css';

interface CarouselEditorProps {
  layout: CarouselLayout;
  images: Record<string, PlacedImage>;
  currentSlide: number;
  aspectRatio: AspectRatio;
  onSetImage: (slotId: string, file: File) => void;
  onRemoveImage: (slotId: string) => void;
  onSetCurrentSlide: (slide: number) => void;
}

export const CarouselEditor: React.FC<CarouselEditorProps> = ({
  layout,
  images,
  currentSlide,
  aspectRatio,
  onSetImage,
  onRemoveImage,
  onSetCurrentSlide,
}) => {
  const slideOffset = -(currentSlide * (100 / layout.slideCount));
  const config = ASPECT_RATIOS[aspectRatio];
  // Compute maxWidth so that the viewport never exceeds 70vh in height
  // while maintaining the correct aspect ratio.
  // maxWidth = min(100%, 70vh * (width / height))
  const ratioFactor = config.width / config.height;

  return (
    <div className="carousel-editor">
      <div
        className="carousel-editor__viewport"
        style={{
          aspectRatio: config.cssRatio,
          maxWidth: `min(100%, calc(70vh * ${ratioFactor}))`,
        }}
      >
        <div
          className="carousel-editor__canvas"
          style={{
            width: `${layout.slideCount * 100}%`,
            transform: `translateX(${slideOffset}%)`,
          }}
        >
          {/* Slide boundaries (visual guides) */}
          {Array.from({ length: layout.slideCount }, (_, i) => (
            <div
              key={`slide-bg-${i}`}
              className="carousel-editor__slide-bg"
              style={{
                left: `${(i / layout.slideCount) * 100}%`,
                width: `${100 / layout.slideCount}%`,
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
        </div>
      </div>

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
      // Accept any file — the <input accept="image/*"> already filters in the picker,
      // and drag-and-drop files may have empty or non-standard MIME types (e.g. HEIC on macOS).
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
      // Reset input so the same file can be selected again
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

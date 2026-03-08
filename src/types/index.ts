// Instagram carousel post dimensions
export const INSTAGRAM_WIDTH = 1080;

/**
 * Supported Instagram carousel aspect ratios.
 */
export type AspectRatio = '1:1' | '4:5' | '1.91:1';

export interface AspectRatioConfig {
  width: number;
  height: number;
  label: string;
  /** Number of grid rows for the custom layout builder (columns per slide is always 12) */
  gridRows: number;
  /** CSS-friendly ratio string for the viewport (width / height) */
  cssRatio: string;
}

export const ASPECT_RATIOS: Record<AspectRatio, AspectRatioConfig> = {
  '1:1': { width: 1080, height: 1080, label: 'Square', gridRows: 12, cssRatio: '1 / 1' },
  '4:5': { width: 1080, height: 1350, label: 'Portrait', gridRows: 15, cssRatio: '4 / 5' },
  '1.91:1': { width: 1080, height: 566, label: 'Landscape', gridRows: 6, cssRatio: '1.91 / 1' },
};

export const ASPECT_RATIO_OPTIONS: AspectRatio[] = ['1:1', '4:5', '1.91:1'];

/**
 * A region within the full panoramic canvas that an image occupies.
 * Coordinates are in percentages (0-100) relative to the FULL layout canvas
 * (which spans all slides combined).
 */
export interface ImageSlot {
  id: string;
  // Position & size as percentage of the FULL canvas (all slides combined)
  x: number; // % from left
  y: number; // % from top
  width: number; // % of total width
  height: number; // % of total height
}

/**
 * A layout defines how images are arranged across multiple slides.
 * The full canvas width = slideCount * INSTAGRAM_WIDTH.
 * Image slots span across this full canvas, creating visual continuity
 * when swiping between slides.
 */
export interface CarouselLayout {
  id: string;
  name: string;
  description: string;
  imageCount: number;
  slideCount: number;
  slots: ImageSlot[];
  // Thumbnail preview data - simplified slot positions for the layout picker
  thumbnailSlots: ImageSlot[];
}

/**
 * Represents a user-placed image in a slot.
 */
export interface PlacedImage {
  slotId: string;
  file: File;
  url: string; // Object URL for preview
  // Pan/zoom offsets (future enhancement)
  offsetX: number;
  offsetY: number;
  scale: number;
}

/**
 * App state for the carousel editor.
 */
export interface EditorState {
  selectedLayoutId: string | null;
  images: Record<string, PlacedImage>; // keyed by slotId
  currentSlide: number;
  isExporting: boolean;
  aspectRatio: AspectRatio;
}

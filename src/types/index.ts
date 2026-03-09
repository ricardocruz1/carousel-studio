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

// ─── Text Overlay ──────────────────────────────────────────

export const FONT_OPTIONS = [
  // ── Sans-serif ──
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Open Sans', value: '"Open Sans", sans-serif' },
  { label: 'Lato', value: 'Lato, sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Nunito', value: 'Nunito, sans-serif' },
  { label: 'Raleway', value: 'Raleway, sans-serif' },
  { label: 'Oswald', value: 'Oswald, sans-serif' },
  { label: 'DM Sans', value: '"DM Sans", sans-serif' },
  { label: 'Quicksand', value: 'Quicksand, sans-serif' },
  { label: 'Rubik', value: 'Rubik, sans-serif' },
  { label: 'Work Sans', value: '"Work Sans", sans-serif' },
  { label: 'Outfit', value: 'Outfit, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Impact', value: 'Impact, sans-serif' },
  // ── Serif ──
  { label: 'Playfair Display', value: '"Playfair Display", serif' },
  { label: 'Merriweather', value: 'Merriweather, serif' },
  { label: 'Lora', value: 'Lora, serif' },
  { label: 'EB Garamond', value: '"EB Garamond", serif' },
  { label: 'Cormorant Garamond', value: '"Cormorant Garamond", serif' },
  { label: 'Libre Baskerville', value: '"Libre Baskerville", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  // ── Display / Decorative ──
  { label: 'Bebas Neue', value: '"Bebas Neue", sans-serif' },
  { label: 'Abril Fatface', value: '"Abril Fatface", serif' },
  { label: 'Alfa Slab One', value: '"Alfa Slab One", serif' },
  { label: 'Permanent Marker', value: '"Permanent Marker", cursive' },
  { label: 'Righteous', value: 'Righteous, sans-serif' },
  { label: 'Comfortaa', value: 'Comfortaa, sans-serif' },
  { label: 'Fredoka', value: 'Fredoka, sans-serif' },
  // ── Script / Handwriting ──
  { label: 'Pacifico', value: 'Pacifico, cursive' },
  { label: 'Lobster', value: 'Lobster, cursive' },
  { label: 'Dancing Script', value: '"Dancing Script", cursive' },
  { label: 'Satisfy', value: 'Satisfy, cursive' },
  { label: 'Great Vibes', value: '"Great Vibes", cursive' },
  { label: 'Sacramento', value: 'Sacramento, cursive' },
  { label: 'Caveat', value: 'Caveat, cursive' },
  { label: 'Kalam', value: 'Kalam, cursive' },
  { label: 'Indie Flower', value: '"Indie Flower", cursive' },
  // ── Monospace ──
  { label: 'Fira Code', value: '"Fira Code", monospace' },
  { label: 'Source Code Pro', value: '"Source Code Pro", monospace' },
  { label: 'Space Mono', value: '"Space Mono", monospace' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
  { label: 'Courier New', value: '"Courier New", monospace' },
] as const;

export const FONT_SIZE_OPTIONS = [16, 20, 24, 32, 40, 48, 56, 64, 72, 80, 96, 120] as const;

/**
 * A text overlay positioned on a specific slide.
 * x/y are percentages (0-100) relative to the SLIDE (not the full canvas).
 * fontSize is in px at the native 1080px slide width.
 */
export interface TextOverlay {
  id: string;
  slideIndex: number;
  text: string;
  x: number;       // % of slide width
  y: number;       // % of slide height
  fontSize: number; // px at 1080px width
  fontFamily: string;
  color: string;
  fontWeight: 400 | 700;
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  opacity: number;  // 0-1
  backgroundColor: string; // empty string = transparent/no bg
  zIndex: number;
}

// ─── Shape Overlay ─────────────────────────────────────────

export type ShapeType = 'rectangle' | 'square' | 'circle' | 'ellipse' | 'triangle';
export type ShapeFillType = 'transparent' | 'solid' | 'gradient';

export interface ShapeOverlay {
  id: string;
  slideIndex: number;
  type: ShapeType;
  x: number;       // % of slide width (top-left corner)
  y: number;       // % of slide height (top-left corner)
  width: number;   // % of slide width
  height: number;  // % of slide height
  fillType: ShapeFillType;
  fillColor: string;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
  borderColor: string;
  borderWidth: number;  // px at 1080px native width
  opacity: number;      // 0-1
  zIndex: number;
}

// ─── Background ────────────────────────────────────────────

export type BackgroundType = 'solid' | 'gradient';

export interface BackgroundConfig {
  type: BackgroundType;
  color: string;           // for solid
  gradientStart: string;   // for gradient
  gradientEnd: string;
  gradientAngle: number;   // degrees
}

export const DEFAULT_BACKGROUND: BackgroundConfig = {
  type: 'solid',
  color: '#ffffff',
  gradientStart: '#6c5ce7',
  gradientEnd: '#a29bfe',
  gradientAngle: 135,
};

export const BACKGROUND_PRESETS: { label: string; config: BackgroundConfig }[] = [
  { label: 'White', config: { type: 'solid', color: '#ffffff', gradientStart: '#6c5ce7', gradientEnd: '#a29bfe', gradientAngle: 135 } },
  { label: 'Light Gray', config: { type: 'solid', color: '#f0f0f5', gradientStart: '#6c5ce7', gradientEnd: '#a29bfe', gradientAngle: 135 } },
  { label: 'Dark', config: { type: 'solid', color: '#1a1a2e', gradientStart: '#6c5ce7', gradientEnd: '#a29bfe', gradientAngle: 135 } },
  { label: 'Black', config: { type: 'solid', color: '#000000', gradientStart: '#6c5ce7', gradientEnd: '#a29bfe', gradientAngle: 135 } },
  { label: 'Warm', config: { type: 'solid', color: '#ffeaa7', gradientStart: '#6c5ce7', gradientEnd: '#a29bfe', gradientAngle: 135 } },
  { label: 'Purple Gradient', config: { type: 'gradient', color: '#ffffff', gradientStart: '#6c5ce7', gradientEnd: '#a29bfe', gradientAngle: 135 } },
  { label: 'Sunset', config: { type: 'gradient', color: '#ffffff', gradientStart: '#f39c12', gradientEnd: '#e74c3c', gradientAngle: 135 } },
  { label: 'Ocean', config: { type: 'gradient', color: '#ffffff', gradientStart: '#2d3436', gradientEnd: '#0984e3', gradientAngle: 180 } },
];

/**
 * App state for the carousel editor.
 */
export interface EditorState {
  selectedLayoutId: string | null;
  images: Record<string, PlacedImage>; // keyed by slotId
  currentSlide: number;
  isExporting: boolean;
  aspectRatio: AspectRatio;
  textOverlays: TextOverlay[];
  shapeOverlays: ShapeOverlay[];
  background: BackgroundConfig;
}

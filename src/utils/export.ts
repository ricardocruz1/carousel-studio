import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { CarouselLayout, PlacedImage, AspectRatio } from '../types';
import { INSTAGRAM_WIDTH, ASPECT_RATIOS } from '../types';

/**
 * Maximum total canvas pixels (width * height) before we warn / refuse.
 * 268 megapixels = 16384 * 16384, which is the common browser canvas limit.
 */
export const MAX_CANVAS_PIXELS = 268_435_456;

/**
 * Load an image from a URL and return an HTMLImageElement.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // No crossOrigin needed — all images are loaded from same-origin blob: URLs
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Draw a single image into a region of the canvas using "cover" scaling.
 * The image fills the entire region while maintaining aspect ratio,
 * cropping any overflow.
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  offsetX: number = 0,
  offsetY: number = 0,
  scale: number = 1
) {
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const regionAspect = dw / dh;

  let sx: number, sy: number, sw: number, sh: number;

  if (imgAspect > regionAspect) {
    // Image is wider than region - crop sides
    sh = img.naturalHeight;
    sw = sh * regionAspect;
    sy = 0;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    // Image is taller than region - crop top/bottom
    sw = img.naturalWidth;
    sh = sw / regionAspect;
    sx = 0;
    sy = (img.naturalHeight - sh) / 2;
  }

  // Apply scale
  const scaledSw = sw / scale;
  const scaledSh = sh / scale;
  const centerX = sx + sw / 2;
  const centerY = sy + sh / 2;
  sx = centerX - scaledSw / 2 - offsetX * (sw / dw);
  sy = centerY - scaledSh / 2 - offsetY * (sh / dh);

  // Clamp source coordinates
  sx = Math.max(0, Math.min(sx, img.naturalWidth - scaledSw));
  sy = Math.max(0, Math.min(sy, img.naturalHeight - scaledSh));

  ctx.drawImage(img, sx, sy, scaledSw, scaledSh, dx, dy, dw, dh);
}

/**
 * Export the carousel as individual slide images packaged in a ZIP file.
 *
 * Process:
 * 1. Create a full-size canvas representing all slides combined
 * 2. Draw each image into its slot on the full canvas
 * 3. Slice the full canvas into individual slide-sized canvases
 * 4. Export each slide as a high-quality PNG
 * 5. Package into a ZIP and trigger download
 *
 * @param scale  Resolution multiplier. 1 = Instagram native (1080px wide),
 *               2 = 2160px wide, 3 = 3240px wide. Higher values give
 *               sharper output for uses outside Instagram (print, web, etc.)
 */
export async function exportCarousel(
  layout: CarouselLayout,
  images: Record<string, PlacedImage>,
  aspectRatio: AspectRatio = '1:1',
  onProgress?: (progress: number) => void,
  scale: number = 1
): Promise<void> {
  // Clamp scale to valid range
  scale = Math.min(3, Math.max(1, Math.round(scale)));

  const config = ASPECT_RATIOS[aspectRatio];
  const slideWidth = INSTAGRAM_WIDTH * scale;
  const slideHeight = config.height * scale;
  const totalWidth = slideWidth * layout.slideCount;
  const totalHeight = slideHeight;

  // Safety check: refuse if the canvas would exceed browser limits
  const totalPixels = totalWidth * totalHeight;
  if (totalPixels > MAX_CANVAS_PIXELS) {
    throw new Error(
      `Canvas size (${totalWidth}x${totalHeight} = ${Math.round(totalPixels / 1_000_000)}MP) exceeds the safe limit. ` +
      `Try reducing the quality setting or using fewer slides.`
    );
  }

  // Create the full panoramic canvas
  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = totalWidth;
  fullCanvas.height = totalHeight;
  const fullCtx = fullCanvas.getContext('2d');
  if (!fullCtx) throw new Error('Could not create canvas context');

  // Use highest quality resampling for downscaled images
  fullCtx.imageSmoothingEnabled = true;
  fullCtx.imageSmoothingQuality = 'high';

  // Fill background white
  fullCtx.fillStyle = '#ffffff';
  fullCtx.fillRect(0, 0, totalWidth, totalHeight);

  // Load and draw all images
  const totalSteps = layout.slots.length + layout.slideCount;
  let completedSteps = 0;

  for (const slot of layout.slots) {
    const placedImage = images[slot.id];
    if (placedImage) {
      const img = await loadImage(placedImage.url);

      // Convert percentage positions to pixel positions on full canvas
      const dx = (slot.x / 100) * totalWidth;
      const dy = (slot.y / 100) * totalHeight;
      const dw = (slot.width / 100) * totalWidth;
      const dh = (slot.height / 100) * totalHeight;

      drawImageCover(
        fullCtx,
        img,
        dx,
        dy,
        dw,
        dh,
        placedImage.offsetX,
        placedImage.offsetY,
        placedImage.scale
      );
    }

    completedSteps++;
    onProgress?.(completedSteps / totalSteps);
  }

  // Slice into individual slides
  const zip = new JSZip();

  for (let i = 0; i < layout.slideCount; i++) {
    const slideCanvas = document.createElement('canvas');
    slideCanvas.width = slideWidth;
    slideCanvas.height = slideHeight;
    const slideCtx = slideCanvas.getContext('2d');
    if (!slideCtx) throw new Error('Could not create slide canvas context');

    // Match high-quality resampling on slice canvases
    slideCtx.imageSmoothingEnabled = true;
    slideCtx.imageSmoothingQuality = 'high';

    // Copy the relevant portion of the full canvas
    slideCtx.drawImage(
      fullCanvas,
      i * slideWidth,
      0,
      slideWidth,
      slideHeight,
      0,
      0,
      slideWidth,
      slideHeight
    );

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      slideCanvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        },
        'image/png',
        1.0
      );
    });

    zip.file(`slide-${i + 1}.png`, blob);

    completedSteps++;
    onProgress?.(completedSteps / totalSteps);
  }

  // Generate and download ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `carousel-${layout.name.toLowerCase().replace(/\s+/g, '-')}.zip`);
}

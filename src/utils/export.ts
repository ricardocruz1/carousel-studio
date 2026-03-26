import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { CarouselLayout, ImageSlot, PlacedImage, AspectRatio, BackgroundConfig, TextOverlay, ShapeOverlay, Layer } from '../types';
import { INSTAGRAM_WIDTH, ASPECT_RATIOS, DEFAULT_BACKGROUND, buildCssFilterString } from '../types';

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
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Draw a single image into a region of the canvas using "cover" scaling.
 * offsetX/offsetY are 0-100 percentages matching CSS object-position semantics:
 *   50 = centered (default), 0 = left/top edge, 100 = right/bottom edge.
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  offsetX: number = 50,
  offsetY: number = 50,
  _scale: number = 1
) {
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const regionAspect = dw / dh;

  let sx: number, sy: number, sw: number, sh: number;

  if (imgAspect > regionAspect) {
    // Image is wider than the region — crop horizontally
    sh = img.naturalHeight;
    sw = sh * regionAspect;
    sy = 0;
    sx = (img.naturalWidth - sw) * (offsetX / 100);
  } else {
    // Image is taller than the region — crop vertically
    sw = img.naturalWidth;
    sh = sw / regionAspect;
    sx = 0;
    sy = (img.naturalHeight - sh) * (offsetY / 100);
  }

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/**
 * Fill the canvas with the configured background (solid or gradient).
 */
function drawBackground(
  ctx: CanvasRenderingContext2D,
  bg: BackgroundConfig,
  width: number,
  height: number
) {
  if (bg.type === 'gradient') {
    // Convert angle (CSS convention: 0deg = to top) to canvas coordinates
    const angleRad = ((bg.gradientAngle - 90) * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const len = Math.sqrt(width * width + height * height) / 2;
    const x0 = cx - Math.cos(angleRad) * len;
    const y0 = cy - Math.sin(angleRad) * len;
    const x1 = cx + Math.cos(angleRad) * len;
    const y1 = cy + Math.sin(angleRad) * len;

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, bg.gradientStart);
    grad.addColorStop(1, bg.gradientEnd);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = bg.color;
  }
  ctx.fillRect(0, 0, width, height);
}

/**
 * Draw a single shape overlay onto the canvas.
 */
function drawShapeOverlay(
  ctx: CanvasRenderingContext2D,
  shape: ShapeOverlay,
  slideWidth: number,
  slideHeight: number,
  scale: number
) {
  const isConstrained = shape.type === 'square' || shape.type === 'circle';
  const x = shape.slideIndex * slideWidth + (shape.x / 100) * slideWidth;
  const y = (shape.y / 100) * slideHeight;
  const w = (shape.width / 100) * slideWidth;
  // For constrained shapes, height = width (in pixels) to be visually 1:1
  const h = isConstrained ? w : (shape.height / 100) * slideHeight;
  const borderWidth = shape.borderWidth * scale;

  ctx.save();
  ctx.globalAlpha = shape.opacity;

  // Set fill style
  let fillStyle: string | CanvasGradient = 'transparent';
  if (shape.fillType === 'solid') {
    fillStyle = shape.fillColor;
  } else if (shape.fillType === 'gradient') {
    const angleRad = ((shape.gradientAngle - 90) * Math.PI) / 180;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const len = Math.sqrt(w * w + h * h) / 2;
    const x0 = cx - Math.cos(angleRad) * len;
    const y0 = cy - Math.sin(angleRad) * len;
    const x1 = cx + Math.cos(angleRad) * len;
    const y1 = cy + Math.sin(angleRad) * len;
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, shape.gradientStart);
    grad.addColorStop(1, shape.gradientEnd);
    fillStyle = grad;
  }

  const hasFill = shape.fillType !== 'transparent';
  const hasBorder = shape.borderWidth > 0;

  if (shape.type === 'rectangle' || shape.type === 'square') {
    if (hasFill) {
      ctx.fillStyle = fillStyle;
      ctx.fillRect(x, y, w, h);
    }
    if (hasBorder) {
      ctx.strokeStyle = shape.borderColor;
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(x, y, w, h);
    }
  } else if (shape.type === 'circle' || shape.type === 'ellipse') {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = w / 2;
    const ry = h / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (hasFill) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (hasBorder) {
      ctx.strokeStyle = shape.borderColor;
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }
  } else if (shape.type === 'triangle') {
    // Triangle: top-center, bottom-left, bottom-right
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    if (hasFill) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (hasBorder) {
      ctx.strokeStyle = shape.borderColor;
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draw text overlays onto the full panoramic canvas.
 */
function drawTextOverlays(
  ctx: CanvasRenderingContext2D,
  overlays: TextOverlay[],
  slideWidth: number,
  slideHeight: number,
  scale: number
) {
  for (const overlay of overlays) {
    const canvasFontSize = overlay.fontSize * scale;
    const weight = overlay.fontWeight === 700 ? 'bold' : 'normal';
    const style = overlay.fontStyle === 'italic' ? 'italic' : 'normal';
    ctx.font = `${style} ${weight} ${canvasFontSize}px ${overlay.fontFamily}`;
    ctx.fillStyle = overlay.color;
    ctx.globalAlpha = overlay.opacity;
    ctx.textAlign = overlay.textAlign;
    ctx.textBaseline = 'top';

    // Position: slide offset + percentage within slide
    const x = overlay.slideIndex * slideWidth + (overlay.x / 100) * slideWidth;
    const y = (overlay.y / 100) * slideHeight;

    // Adjust x for text alignment
    let drawX = x;
    if (overlay.textAlign === 'center') {
      drawX = x; // textAlign handles it
    } else if (overlay.textAlign === 'right') {
      drawX = x;
    }

    // Draw text with word wrapping
    const lines = overlay.text.split('\n');
    let currentY = y;
    const lineHeight = canvasFontSize * 1.2;

    // Draw background behind text if set
    if (overlay.backgroundColor) {
      ctx.save();
      ctx.globalAlpha = overlay.opacity;
      ctx.fillStyle = overlay.backgroundColor;
      for (const line of lines) {
        const metrics = ctx.measureText(line);
        const textWidth = metrics.width;
        const padding = canvasFontSize * 0.1;

        let bgX = drawX - padding;
        if (overlay.textAlign === 'center') {
          bgX = drawX - textWidth / 2 - padding;
        } else if (overlay.textAlign === 'right') {
          bgX = drawX - textWidth - padding;
        }

        ctx.fillRect(bgX, currentY, textWidth + padding * 2, lineHeight);
        currentY += lineHeight;
      }
      ctx.restore();

      // Reset for text drawing
      ctx.fillStyle = overlay.color;
      ctx.globalAlpha = overlay.opacity;
      ctx.font = `${style} ${weight} ${canvasFontSize}px ${overlay.fontFamily}`;
      ctx.textAlign = overlay.textAlign;
      ctx.textBaseline = 'top';
      currentY = y;
    }

    for (const line of lines) {
      ctx.fillText(line, drawX, currentY);

      // Draw underline if set
      if (overlay.textDecoration === 'underline') {
        const metrics = ctx.measureText(line);
        const textWidth = metrics.width;
        const underlineY = currentY + canvasFontSize * 1.05;
        const lineThickness = Math.max(1, canvasFontSize * 0.06);

        ctx.save();
        ctx.strokeStyle = overlay.color;
        ctx.lineWidth = lineThickness;

        let startX = drawX;
        if (overlay.textAlign === 'center') {
          startX = drawX - textWidth / 2;
        } else if (overlay.textAlign === 'right') {
          startX = drawX - textWidth;
        }

        ctx.beginPath();
        ctx.moveTo(startX, underlineY);
        ctx.lineTo(startX + textWidth, underlineY);
        ctx.stroke();
        ctx.restore();
      }

      currentY += lineHeight;
    }

    ctx.globalAlpha = 1;
  }
}

/**
 * Draw a single layer's images and overlays onto the canvas.
 * This is shared by both single-layer (preset) and multi-layer (custom) paths.
 */
async function drawLayerContent(
  ctx: CanvasRenderingContext2D,
  slots: ImageSlot[],
  images: Record<string, PlacedImage>,
  textOverlays: TextOverlay[],
  shapeOverlays: ShapeOverlay[],
  totalWidth: number,
  totalHeight: number,
  slideWidth: number,
  slideHeight: number,
  scale: number,
  onSlotDone?: () => void
) {
  // Draw images
  for (const slot of slots) {
    const placedImage = images[slot.id];
    if (placedImage) {
      const img = await loadImage(placedImage.url);

      const dx = (slot.x / 100) * totalWidth;
      const dy = (slot.y / 100) * totalHeight;
      const dw = (slot.width / 100) * totalWidth;
      const dh = (slot.height / 100) * totalHeight;

      // Apply image filters (blur is scaled to export resolution)
      const blurScale = slideWidth / INSTAGRAM_WIDTH;
      const filterStr = buildCssFilterString(placedImage.filters, blurScale);
      if (filterStr !== 'none') {
        ctx.save();
        ctx.filter = filterStr;
      }

      drawImageCover(
        ctx,
        img,
        dx,
        dy,
        dw,
        dh,
        placedImage.offsetX,
        placedImage.offsetY,
        placedImage.scale
      );

      if (filterStr !== 'none') {
        ctx.restore();
      }
    }

    onSlotDone?.();
  }

  // Wait for all fonts to be loaded before drawing text overlays
  if (textOverlays.length > 0) {
    await document.fonts.ready;
  }

  // Draw overlays in unified z-order (shapes and text interleaved by zIndex)
  type OverlayEntry =
    | { kind: 'text'; overlay: TextOverlay }
    | { kind: 'shape'; overlay: ShapeOverlay };

  const allOverlays: OverlayEntry[] = [
    ...textOverlays.map((o) => ({ kind: 'text' as const, overlay: o })),
    ...shapeOverlays.map((o) => ({ kind: 'shape' as const, overlay: o })),
  ];
  allOverlays.sort((a, b) => a.overlay.zIndex - b.overlay.zIndex);

  for (const entry of allOverlays) {
    if (entry.kind === 'text') {
      drawTextOverlays(ctx, [entry.overlay], slideWidth, slideHeight, scale);
    } else {
      drawShapeOverlay(ctx, entry.overlay, slideWidth, slideHeight, scale);
    }
  }
}

/**
 * Export the carousel as individual slide images packaged in a ZIP file.
 *
 * @param scale  Resolution multiplier. 1 = Instagram native (1080px wide),
 *               2 = 2160px wide, 3 = 3240px wide.
 * @param layers Optional array of layers for multi-layer custom layouts.
 *               When provided, each visible layer's images and overlays are
 *               composited in order (index 0 = bottom). The `layout`, `images`,
 *               `textOverlays`, and `shapeOverlays` params serve as the single-
 *               layer fallback for preset layouts.
 */
export async function exportCarousel(
  layout: CarouselLayout,
  images: Record<string, PlacedImage>,
  aspectRatio: AspectRatio = '1:1',
  onProgress?: (progress: number) => void,
  scale: number = 1,
  background: BackgroundConfig = DEFAULT_BACKGROUND,
  textOverlays: TextOverlay[] = [],
  shapeOverlays: ShapeOverlay[] = [],
  layers?: Layer[]
): Promise<void> {
  scale = Math.min(3, Math.max(1, Math.round(scale)));

  const config = ASPECT_RATIOS[aspectRatio];
  const slideWidth = INSTAGRAM_WIDTH * scale;
  const slideHeight = config.height * scale;
  const slideCount = layout.slideCount;
  const totalWidth = slideWidth * slideCount;
  const totalHeight = slideHeight;

  const totalPixels = totalWidth * totalHeight;
  if (totalPixels > MAX_CANVAS_PIXELS) {
    throw new Error(
      `Canvas size (${totalWidth}x${totalHeight} = ${Math.round(totalPixels / 1_000_000)}MP) exceeds the safe limit. ` +
      `Try reducing the quality setting or using fewer slides.`
    );
  }

  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = totalWidth;
  fullCanvas.height = totalHeight;
  const fullCtx = fullCanvas.getContext('2d');
  if (!fullCtx) throw new Error('Could not create canvas context');

  fullCtx.imageSmoothingEnabled = true;
  fullCtx.imageSmoothingQuality = 'high';

  // Draw background (solid or gradient) — only once, before all layers
  drawBackground(fullCtx, background, totalWidth, totalHeight);

  // Calculate total steps for progress reporting
  const visibleLayers = layers?.filter((l) => l.visible);
  const totalSlots = visibleLayers
    ? visibleLayers.reduce((sum, l) => sum + l.layout.slots.length, 0)
    : layout.slots.length;
  const totalSteps = totalSlots + slideCount;
  let completedSteps = 0;

  const advanceProgress = () => {
    completedSteps++;
    onProgress?.(completedSteps / totalSteps);
  };

  if (visibleLayers && visibleLayers.length > 0) {
    // Multi-layer path: draw each visible layer bottom-to-top
    for (const layer of visibleLayers) {
      await drawLayerContent(
        fullCtx,
        layer.layout.slots,
        layer.images,
        layer.textOverlays,
        layer.shapeOverlays,
        totalWidth,
        totalHeight,
        slideWidth,
        slideHeight,
        scale,
        advanceProgress
      );
    }
  } else {
    // Single-layer path (preset layouts): use the direct params
    await drawLayerContent(
      fullCtx,
      layout.slots,
      images,
      textOverlays,
      shapeOverlays,
      totalWidth,
      totalHeight,
      slideWidth,
      slideHeight,
      scale,
      advanceProgress
    );
  }

  // Slice into individual slides
  const zip = new JSZip();

  for (let i = 0; i < slideCount; i++) {
    const slideCanvas = document.createElement('canvas');
    slideCanvas.width = slideWidth;
    slideCanvas.height = slideHeight;
    const slideCtx = slideCanvas.getContext('2d');
    if (!slideCtx) throw new Error('Could not create slide canvas context');

    slideCtx.imageSmoothingEnabled = true;
    slideCtx.imageSmoothingQuality = 'high';

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

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `carousel-${layout.name.toLowerCase().replace(/\s+/g, '-')}.zip`);
}

/**
 * Render a single slide to a Blob (PNG).
 * Used for sharing / copying a single slide without exporting the full zip.
 *
 * @param layers Optional array of layers for multi-layer custom layouts.
 */
export async function renderSingleSlide(
  slideIndex: number,
  layout: CarouselLayout,
  images: Record<string, PlacedImage>,
  aspectRatio: AspectRatio = '1:1',
  scale: number = 1,
  background: BackgroundConfig = DEFAULT_BACKGROUND,
  textOverlays: TextOverlay[] = [],
  shapeOverlays: ShapeOverlay[] = [],
  layers?: Layer[]
): Promise<Blob> {
  scale = Math.min(3, Math.max(1, Math.round(scale)));

  const config = ASPECT_RATIOS[aspectRatio];
  const slideWidth = INSTAGRAM_WIDTH * scale;
  const slideHeight = config.height * scale;

  // We still render the full panoramic canvas so images/overlays positioned
  // across slides render correctly, then we clip just the requested slide.
  const slideCount = layout.slideCount;
  const totalWidth = slideWidth * slideCount;
  const totalHeight = slideHeight;

  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = totalWidth;
  fullCanvas.height = totalHeight;
  const fullCtx = fullCanvas.getContext('2d');
  if (!fullCtx) throw new Error('Could not create canvas context');

  fullCtx.imageSmoothingEnabled = true;
  fullCtx.imageSmoothingQuality = 'high';

  // Draw background
  drawBackground(fullCtx, background, totalWidth, totalHeight);

  const visibleLayers = layers?.filter((l) => l.visible);

  if (visibleLayers && visibleLayers.length > 0) {
    // Multi-layer path
    for (const layer of visibleLayers) {
      await drawLayerContent(
        fullCtx,
        layer.layout.slots,
        layer.images,
        layer.textOverlays,
        layer.shapeOverlays,
        totalWidth,
        totalHeight,
        slideWidth,
        slideHeight,
        scale
      );
    }
  } else {
    // Single-layer path (preset layouts)
    await drawLayerContent(
      fullCtx,
      layout.slots,
      images,
      textOverlays,
      shapeOverlays,
      totalWidth,
      totalHeight,
      slideWidth,
      slideHeight,
      scale
    );
  }

  // Clip the requested slide
  const slideCanvas = document.createElement('canvas');
  slideCanvas.width = slideWidth;
  slideCanvas.height = slideHeight;
  const slideCtx = slideCanvas.getContext('2d');
  if (!slideCtx) throw new Error('Could not create slide canvas context');

  slideCtx.imageSmoothingEnabled = true;
  slideCtx.imageSmoothingQuality = 'high';

  slideCtx.drawImage(
    fullCanvas,
    slideIndex * slideWidth, 0, slideWidth, slideHeight,
    0, 0, slideWidth, slideHeight
  );

  return new Promise<Blob>((resolve, reject) => {
    slideCanvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create blob'));
      },
      'image/png',
      1.0
    );
  });
}

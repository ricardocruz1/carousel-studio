/**
 * Snap guide utilities for overlay alignment.
 *
 * All values are in PERCENTAGE of a single slide (0–100 for both x and y).
 */

/** Snap threshold in % — when within this distance, snap to the guide */
const SNAP_THRESHOLD = 2;

/** A snap guide line to render */
export interface SnapGuide {
  /** Axis: 'x' for vertical line, 'y' for horizontal line */
  axis: 'x' | 'y';
  /** Position in % of the slide */
  position: number;
}

/** A snap point is a position that can attract dragged elements */
interface SnapPoint {
  value: number;
  /** Source — for identification/dedup */
  source: string;
}

/**
 * Get the default snap points for a slide (edges + center).
 */
function getSlideSnapPoints(): { x: SnapPoint[]; y: SnapPoint[] } {
  return {
    x: [
      { value: 0, source: 'slide-left' },
      { value: 50, source: 'slide-center' },
      { value: 100, source: 'slide-right' },
    ],
    y: [
      { value: 0, source: 'slide-top' },
      { value: 50, source: 'slide-center' },
      { value: 100, source: 'slide-bottom' },
    ],
  };
}

/**
 * Snap point sources from text overlays on the same slide.
 */
export function getTextOverlaySnapPoints(
  overlays: { id: string; slideIndex: number; x: number; y: number }[],
  currentSlide: number,
  excludeId: string
): { x: SnapPoint[]; y: SnapPoint[] } {
  const xPoints: SnapPoint[] = [];
  const yPoints: SnapPoint[] = [];

  for (const o of overlays) {
    if (o.id === excludeId || o.slideIndex !== currentSlide) continue;
    xPoints.push({ value: o.x, source: `text-${o.id}` });
    yPoints.push({ value: o.y, source: `text-${o.id}` });
  }

  return { x: xPoints, y: yPoints };
}

/**
 * Snap point sources from shape overlays on the same slide.
 * Shapes generate 3 snap points per axis: left/center/right and top/center/bottom.
 */
export function getShapeOverlaySnapPoints(
  overlays: { id: string; slideIndex: number; x: number; y: number; width: number; height: number }[],
  currentSlide: number,
  excludeId: string
): { x: SnapPoint[]; y: SnapPoint[] } {
  const xPoints: SnapPoint[] = [];
  const yPoints: SnapPoint[] = [];

  for (const o of overlays) {
    if (o.id === excludeId || o.slideIndex !== currentSlide) continue;
    xPoints.push(
      { value: o.x, source: `shape-${o.id}-l` },
      { value: o.x + o.width / 2, source: `shape-${o.id}-cx` },
      { value: o.x + o.width, source: `shape-${o.id}-r` },
    );
    yPoints.push(
      { value: o.y, source: `shape-${o.id}-t` },
      { value: o.y + o.height / 2, source: `shape-${o.id}-cy` },
      { value: o.y + o.height, source: `shape-${o.id}-b` },
    );
  }

  return { x: xPoints, y: yPoints };
}

/**
 * Given a raw position value and a list of snap targets, returns
 * the snapped value (or the original if nothing is close enough)
 * and the active guide line position (or null).
 */
function snapToNearest(
  value: number,
  targets: SnapPoint[],
): { snapped: number; guide: number | null } {
  let closest: SnapPoint | null = null;
  let closestDist = Infinity;

  for (const t of targets) {
    const dist = Math.abs(value - t.value);
    if (dist < closestDist && dist <= SNAP_THRESHOLD) {
      closest = t;
      closestDist = dist;
    }
  }

  if (closest) {
    return { snapped: closest.value, guide: closest.value };
  }
  return { snapped: value, guide: null };
}

/**
 * Result of snapping a dragged point.
 */
export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

/**
 * Compute snap for a text overlay being dragged.
 * When textWidth/textHeight are provided (measured from the DOM element),
 * snaps using the center point of the text box rather than just the anchor.
 */
export function snapTextPosition(
  rawX: number,
  rawY: number,
  textOverlays: { id: string; slideIndex: number; x: number; y: number }[],
  shapeOverlays: { id: string; slideIndex: number; x: number; y: number; width: number; height: number }[],
  currentSlide: number,
  draggedId: string,
  textWidth?: number,
  textHeight?: number,
): SnapResult {
  const slideSnap = getSlideSnapPoints();
  const textSnap = getTextOverlaySnapPoints(textOverlays, currentSlide, draggedId);
  const shapeSnap = getShapeOverlaySnapPoints(shapeOverlays, currentSlide, draggedId);

  const allX = [...slideSnap.x, ...textSnap.x, ...shapeSnap.x];
  const allY = [...slideSnap.y, ...textSnap.y, ...shapeSnap.y];

  // If we have measured text dimensions, snap using center (like shapes)
  if (textWidth != null && textHeight != null && textWidth > 0 && textHeight > 0) {
    const centerX = rawX + textWidth / 2;
    const centerY = rawY + textHeight / 2;

    const xCandidates = [
      { offset: 0, result: snapToNearest(rawX, allX) },                         // left edge
      { offset: textWidth / 2, result: snapToNearest(centerX, allX) },           // center
      { offset: textWidth, result: snapToNearest(rawX + textWidth, allX) },      // right edge
    ];

    const yCandidates = [
      { offset: 0, result: snapToNearest(rawY, allY) },                         // top edge
      { offset: textHeight / 2, result: snapToNearest(centerY, allY) },          // center
      { offset: textHeight, result: snapToNearest(rawY + textHeight, allY) },    // bottom edge
    ];

    let bestX = rawX;
    let xGuide: number | null = null;
    let bestXDist = Infinity;
    for (const c of xCandidates) {
      if (c.result.guide !== null) {
        const dist = Math.abs(c.result.snapped - (rawX + c.offset));
        if (dist < bestXDist) {
          bestXDist = dist;
          bestX = c.result.snapped - c.offset;
          xGuide = c.result.guide;
        }
      }
    }

    let bestY = rawY;
    let yGuide: number | null = null;
    let bestYDist = Infinity;
    for (const c of yCandidates) {
      if (c.result.guide !== null) {
        const dist = Math.abs(c.result.snapped - (rawY + c.offset));
        if (dist < bestYDist) {
          bestYDist = dist;
          bestY = c.result.snapped - c.offset;
          yGuide = c.result.guide;
        }
      }
    }

    const guides: SnapGuide[] = [];
    if (xGuide !== null) guides.push({ axis: 'x', position: xGuide });
    if (yGuide !== null) guides.push({ axis: 'y', position: yGuide });

    return { x: bestX, y: bestY, guides };
  }

  // Fallback: snap just the anchor point (no measured dimensions)
  const xResult = snapToNearest(rawX, allX);
  const yResult = snapToNearest(rawY, allY);

  const guides: SnapGuide[] = [];
  if (xResult.guide !== null) guides.push({ axis: 'x', position: xResult.guide });
  if (yResult.guide !== null) guides.push({ axis: 'y', position: yResult.guide });

  return { x: xResult.snapped, y: yResult.snapped, guides };
}

/**
 * Compute snap for a shape overlay being dragged.
 * Shapes have 3 snap points per axis: left/center/right and top/center/bottom.
 * We check all three and snap whichever is closest.
 */
export function snapShapePosition(
  rawX: number,
  rawY: number,
  shapeWidth: number,
  shapeHeight: number,
  textOverlays: { id: string; slideIndex: number; x: number; y: number }[],
  shapeOverlays: { id: string; slideIndex: number; x: number; y: number; width: number; height: number }[],
  currentSlide: number,
  draggedId: string,
): SnapResult {
  const slideSnap = getSlideSnapPoints();
  const textSnap = getTextOverlaySnapPoints(textOverlays, currentSlide, draggedId);
  const shapeSnap = getShapeOverlaySnapPoints(shapeOverlays, currentSlide, draggedId);

  const allX = [...slideSnap.x, ...textSnap.x, ...shapeSnap.x];
  const allY = [...slideSnap.y, ...textSnap.y, ...shapeSnap.y];

  // Check left, center, right edges of the dragged shape
  const shapeCenterX = rawX + shapeWidth / 2;
  const shapeRightX = rawX + shapeWidth;
  const shapeCenterY = rawY + shapeHeight / 2;
  const shapeBottomY = rawY + shapeHeight;

  // Find best snap for each axis
  const xCandidates = [
    { offset: 0, result: snapToNearest(rawX, allX) },           // left edge
    { offset: shapeWidth / 2, result: snapToNearest(shapeCenterX, allX) },  // center
    { offset: shapeWidth, result: snapToNearest(shapeRightX, allX) },       // right edge
  ];

  const yCandidates = [
    { offset: 0, result: snapToNearest(rawY, allY) },           // top edge
    { offset: shapeHeight / 2, result: snapToNearest(shapeCenterY, allY) },  // center
    { offset: shapeHeight, result: snapToNearest(shapeBottomY, allY) },      // bottom edge
  ];

  // Pick the closest snap for each axis
  let bestX = rawX;
  let xGuide: number | null = null;
  let bestXDist = Infinity;
  for (const c of xCandidates) {
    if (c.result.guide !== null) {
      const dist = Math.abs(c.result.snapped - (rawX + c.offset));
      if (dist < bestXDist) {
        bestXDist = dist;
        bestX = c.result.snapped - c.offset;
        xGuide = c.result.guide;
      }
    }
  }

  let bestY = rawY;
  let yGuide: number | null = null;
  let bestYDist = Infinity;
  for (const c of yCandidates) {
    if (c.result.guide !== null) {
      const dist = Math.abs(c.result.snapped - (rawY + c.offset));
      if (dist < bestYDist) {
        bestYDist = dist;
        bestY = c.result.snapped - c.offset;
        yGuide = c.result.guide;
      }
    }
  }

  const guides: SnapGuide[] = [];
  if (xGuide !== null) guides.push({ axis: 'x', position: xGuide });
  if (yGuide !== null) guides.push({ axis: 'y', position: yGuide });

  return { x: bestX, y: bestY, guides };
}

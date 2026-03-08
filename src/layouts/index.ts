import type { CarouselLayout } from '../types';

/**
 * Layout 1: "Triptych" - 3 photos across 2 slides
 * Photo 1 takes left half of slide 1
 * Photo 2 spans from mid slide 1 to mid slide 2 (the transition zone)
 * Photo 3 takes right half of slide 2
 *
 * Visual (2 slides = 200% width):
 * |--- Slide 1 ---|--- Slide 2 ---|
 * | Photo1 | Photo 2  | Photo3    |
 * |  0-50% | 25%-75%  | 50%-100%  |
 */
const layout1: CarouselLayout = {
  id: 'triptych-3',
  name: 'Triptych',
  description: '3 photos across 2 slides with a bridging center image',
  imageCount: 3,
  slideCount: 2,
  slots: [
    { id: 'slot-1', x: 0, y: 0, width: 30, height: 100 },
    { id: 'slot-2', x: 30, y: 0, width: 40, height: 100 },
    { id: 'slot-3', x: 70, y: 0, width: 30, height: 100 },
  ],
  thumbnailSlots: [
    { id: 'slot-1', x: 0, y: 0, width: 30, height: 100 },
    { id: 'slot-2', x: 30, y: 0, width: 40, height: 100 },
    { id: 'slot-3', x: 70, y: 0, width: 30, height: 100 },
  ],
};

/**
 * Layout 2: "Stacked Split" - 3 photos across 2 slides
 * Photo 1 is top half of slide 1
 * Photo 2 spans bottom, bridging both slides
 * Photo 3 is top half of slide 2
 *
 * Visual:
 * |--- Slide 1 ---|--- Slide 2 ---|
 * | Photo 1       | Photo 3       |
 * |    Photo 2 (spans bottom)     |
 */
const layout2: CarouselLayout = {
  id: 'stacked-split-3',
  name: 'Horizon',
  description: '3 photos with a panoramic bottom strip connecting both slides',
  imageCount: 3,
  slideCount: 2,
  slots: [
    { id: 'slot-1', x: 0, y: 0, width: 50, height: 55 },
    { id: 'slot-2', x: 0, y: 55, width: 100, height: 45 },
    { id: 'slot-3', x: 50, y: 0, width: 50, height: 55 },
  ],
  thumbnailSlots: [
    { id: 'slot-1', x: 0, y: 0, width: 50, height: 55 },
    { id: 'slot-2', x: 0, y: 55, width: 100, height: 45 },
    { id: 'slot-3', x: 50, y: 0, width: 50, height: 55 },
  ],
};

/**
 * Layout 3: "Mosaic" - 4 photos across 2 slides
 * Creates a grid that bridges across slides.
 *
 * Visual:
 * |--- Slide 1 ---|--- Slide 2 ---|
 * | P1   |   P2 (bridge)  | P3    |
 * |       P4 (full bottom)        |
 */
const layout3: CarouselLayout = {
  id: 'mosaic-4',
  name: 'Mosaic',
  description: '4 photos in a mosaic pattern bridging 2 slides',
  imageCount: 4,
  slideCount: 2,
  slots: [
    { id: 'slot-1', x: 0, y: 0, width: 25, height: 60 },
    { id: 'slot-2', x: 25, y: 0, width: 50, height: 60 },
    { id: 'slot-3', x: 75, y: 0, width: 25, height: 60 },
    { id: 'slot-4', x: 0, y: 60, width: 100, height: 40 },
  ],
  thumbnailSlots: [
    { id: 'slot-1', x: 0, y: 0, width: 25, height: 60 },
    { id: 'slot-2', x: 25, y: 0, width: 50, height: 60 },
    { id: 'slot-3', x: 75, y: 0, width: 25, height: 60 },
    { id: 'slot-4', x: 0, y: 60, width: 100, height: 40 },
  ],
};

/**
 * Layout 4: "Cascade" - 5 photos across 3 slides
 * Staggered arrangement creating depth.
 *
 * Visual (3 slides):
 * |--- Slide 1 ---|--- Slide 2 ---|--- Slide 3 ---|
 * | P1    | P2 (bridge 1-2)| P4   | P5            |
 * |       |   P3 (bridge 1-2)     |               |
 */
const layout4: CarouselLayout = {
  id: 'cascade-5',
  name: 'Cascade',
  description: '5 photos cascading across 3 slides',
  imageCount: 5,
  slideCount: 3,
  slots: [
    { id: 'slot-1', x: 0, y: 0, width: 20, height: 100 },
    { id: 'slot-2', x: 20, y: 0, width: 27, height: 50 },
    { id: 'slot-3', x: 20, y: 50, width: 40, height: 50 },
    { id: 'slot-4', x: 47, y: 0, width: 20, height: 50 },
    { id: 'slot-5', x: 60, y: 0, width: 40, height: 100 },
  ],
  thumbnailSlots: [
    { id: 'slot-1', x: 0, y: 0, width: 20, height: 100 },
    { id: 'slot-2', x: 20, y: 0, width: 27, height: 50 },
    { id: 'slot-3', x: 20, y: 50, width: 40, height: 50 },
    { id: 'slot-4', x: 47, y: 0, width: 20, height: 50 },
    { id: 'slot-5', x: 60, y: 0, width: 40, height: 100 },
  ],
};

/**
 * Layout 5: "Grid Flow" - 5 photos across 3 slides
 * A flowing grid with varied sizes.
 *
 * Visual (3 slides):
 * |--- Slide 1 ---|--- Slide 2 ---|--- Slide 3 ---|
 * |  P1  |   P2 (bridge)  |  P3   |     P5        |
 * |  P1  |       P4 (bridge)      |     P5        |
 */
const layout5: CarouselLayout = {
  id: 'grid-flow-5',
  name: 'Grid Flow',
  description: '5 photos flowing across 3 slides in a dynamic grid',
  imageCount: 5,
  slideCount: 3,
  slots: [
    { id: 'slot-1', x: 0, y: 0, width: 18, height: 100 },
    { id: 'slot-2', x: 18, y: 0, width: 32, height: 50 },
    { id: 'slot-3', x: 50, y: 0, width: 17, height: 50 },
    { id: 'slot-4', x: 18, y: 50, width: 49, height: 50 },
    { id: 'slot-5', x: 67, y: 0, width: 33, height: 100 },
  ],
  thumbnailSlots: [
    { id: 'slot-1', x: 0, y: 0, width: 18, height: 100 },
    { id: 'slot-2', x: 18, y: 0, width: 32, height: 50 },
    { id: 'slot-3', x: 50, y: 0, width: 17, height: 50 },
    { id: 'slot-4', x: 18, y: 50, width: 49, height: 50 },
    { id: 'slot-5', x: 67, y: 0, width: 33, height: 100 },
  ],
};

export const layouts: CarouselLayout[] = [layout1, layout2, layout3, layout4, layout5];

export function getLayoutById(id: string): CarouselLayout | undefined {
  return layouts.find((l) => l.id === id);
}

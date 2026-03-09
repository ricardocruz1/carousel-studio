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
 * | P1    | P2     | P4    | P5                    |
 * |       | P3 (bridges 1-2)| P5                   |
 */
const layout4: CarouselLayout = {
  id: 'cascade-5',
  name: 'Cascade',
  description: '5 photos cascading across 3 slides',
  imageCount: 5,
  slideCount: 3,
  slots: [
    { id: 'slot-1', x: 0, y: 0, width: 20, height: 100 },
    { id: 'slot-2', x: 20, y: 0, width: 20, height: 50 },
    { id: 'slot-3', x: 20, y: 50, width: 40, height: 50 },
    { id: 'slot-4', x: 40, y: 0, width: 20, height: 50 },
    { id: 'slot-5', x: 60, y: 0, width: 40, height: 100 },
  ],
  thumbnailSlots: [
    { id: 'slot-1', x: 0, y: 0, width: 20, height: 100 },
    { id: 'slot-2', x: 20, y: 0, width: 20, height: 50 },
    { id: 'slot-3', x: 20, y: 50, width: 40, height: 50 },
    { id: 'slot-4', x: 40, y: 0, width: 20, height: 50 },
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

/**
 * Layout 6: "Panorama" - 2 photos across 2 slides
 * Two full-width horizontal bands, both bridging the slide boundary.
 *
 * Visual (2 slides):
 * |--- Slide 1 ---|--- Slide 2 ---|
 * |     Photo 1 (full width top)   |
 * |     Photo 2 (full width bottom)|
 */
const layout6: CarouselLayout = {
  id: 'panorama-2',
  name: 'Panorama',
  description: '2 photos in panoramic bands bridging both slides',
  imageCount: 2,
  slideCount: 2,
  slots: [
    { id: 'slot-1', x: 0, y: 0, width: 100, height: 50 },
    { id: 'slot-2', x: 0, y: 50, width: 100, height: 50 },
  ],
  thumbnailSlots: [
    { id: 'slot-1', x: 0, y: 0, width: 100, height: 50 },
    { id: 'slot-2', x: 0, y: 50, width: 100, height: 50 },
  ],
};

/**
 * Layout 7: "Staircase" - 3 photos across 3 slides
 * Diagonal descending pattern, each photo bridges a slide boundary.
 *
 * Visual (3 slides):
 * |--- Slide 1 ---|--- Slide 2 ---|--- Slide 3 ---|
 * |  P1 (bridge)  |               |               |
 * |       |  P2 (bridge)  |       |               |
 * |               |       | P3 (bridge)           |
 */
const layout7: CarouselLayout = {
  id: 'staircase-3',
  name: 'Staircase',
  description: '3 photos in a diagonal staircase pattern across 3 slides',
  imageCount: 3,
  slideCount: 3,
  slots: [
    { id: 'slot-1', x: 0, y: 0, width: 45, height: 33 },
    { id: 'slot-2', x: 28, y: 33, width: 44, height: 34 },
    { id: 'slot-3', x: 55, y: 67, width: 45, height: 33 },
  ],
  thumbnailSlots: [
    { id: 'slot-1', x: 0, y: 0, width: 45, height: 33 },
    { id: 'slot-2', x: 28, y: 33, width: 44, height: 34 },
    { id: 'slot-3', x: 55, y: 67, width: 45, height: 33 },
  ],
};

/**
 * Layout 8: "Spotlight" - 4 photos across 3 slides
 * One large hero image spanning slides 1-2, with 3 smaller supporting
 * images stacked on the right across slides 2-3.
 *
 * Visual (3 slides):
 * |--- Slide 1 ---|--- Slide 2 ---|--- Slide 3 ---|
 * |                |       | P2                    |
 * |   P1 (hero)            | P3                    |
 * |                |       | P4                    |
 */
const layout8: CarouselLayout = {
  id: 'spotlight-4',
  name: 'Spotlight',
  description: '1 hero image with 3 supporting photos across 3 slides',
  imageCount: 4,
  slideCount: 3,
  slots: [
    { id: 'slot-1', x: 0, y: 0, width: 55, height: 100 },
    { id: 'slot-2', x: 55, y: 0, width: 45, height: 33 },
    { id: 'slot-3', x: 55, y: 33, width: 45, height: 34 },
    { id: 'slot-4', x: 55, y: 67, width: 45, height: 33 },
  ],
  thumbnailSlots: [
    { id: 'slot-1', x: 0, y: 0, width: 55, height: 100 },
    { id: 'slot-2', x: 55, y: 0, width: 45, height: 33 },
    { id: 'slot-3', x: 55, y: 33, width: 45, height: 34 },
    { id: 'slot-4', x: 55, y: 67, width: 45, height: 33 },
  ],
};

/**
 * Layout 9: "Weave" - 4 photos across 3 slides
 * Interlocking pattern with top/bottom photos offset horizontally.
 *
 * Visual (3 slides):
 * |--- Slide 1 ---|--- Slide 2 ---|--- Slide 3 ---|
 * |  P1 (top)             |  P3 (top)             |
 * |       |  P2 (bottom)         |  P4 (bottom)   |
 */
const layout9: CarouselLayout = {
  id: 'weave-4',
  name: 'Weave',
  description: '4 photos in a woven interlocking pattern across 3 slides',
  imageCount: 4,
  slideCount: 3,
  slots: [
    { id: 'slot-1', x: 0, y: 0, width: 45, height: 50 },
    { id: 'slot-2', x: 22, y: 50, width: 45, height: 50 },
    { id: 'slot-3', x: 45, y: 0, width: 33, height: 50 },
    { id: 'slot-4', x: 67, y: 50, width: 33, height: 50 },
  ],
  thumbnailSlots: [
    { id: 'slot-1', x: 0, y: 0, width: 45, height: 50 },
    { id: 'slot-2', x: 22, y: 50, width: 45, height: 50 },
    { id: 'slot-3', x: 45, y: 0, width: 33, height: 50 },
    { id: 'slot-4', x: 67, y: 50, width: 33, height: 50 },
  ],
};

/**
 * Layout 10: "Gallery" - 6 photos across 4 slides
 * Gallery wall arrangement: tall hero, two stacked mid-size images,
 * and three stacked smaller images. Every slot bridges a slide boundary.
 *
 * Visual (4 slides):
 * |--- Slide 1 ---|--- Slide 2 ---|--- Slide 3 ---|--- Slide 4 ---|
 * | P1 (tall hero) | P2 (mid)     | P4 (small)                    |
 * |                 |              | P5 (small)                    |
 * |                 | P3 (mid)     | P6 (small)                    |
 */
const layout10: CarouselLayout = {
  id: 'gallery-6',
  name: 'Gallery',
  description: '6 photos in a gallery wall arrangement across 4 slides',
  imageCount: 6,
  slideCount: 4,
  slots: [
    { id: 'slot-1', x: 0, y: 0, width: 30, height: 100 },
    { id: 'slot-2', x: 30, y: 0, width: 30, height: 55 },
    { id: 'slot-3', x: 30, y: 55, width: 30, height: 45 },
    { id: 'slot-4', x: 60, y: 0, width: 40, height: 35 },
    { id: 'slot-5', x: 60, y: 35, width: 40, height: 30 },
    { id: 'slot-6', x: 60, y: 65, width: 40, height: 35 },
  ],
  thumbnailSlots: [
    { id: 'slot-1', x: 0, y: 0, width: 30, height: 100 },
    { id: 'slot-2', x: 30, y: 0, width: 30, height: 55 },
    { id: 'slot-3', x: 30, y: 55, width: 30, height: 45 },
    { id: 'slot-4', x: 60, y: 0, width: 40, height: 35 },
    { id: 'slot-5', x: 60, y: 35, width: 40, height: 30 },
    { id: 'slot-6', x: 60, y: 65, width: 40, height: 35 },
  ],
};

export const layouts: CarouselLayout[] = [layout1, layout2, layout3, layout4, layout5, layout6, layout7, layout8, layout9, layout10];

export function getLayoutById(id: string): CarouselLayout | undefined {
  return layouts.find((l) => l.id === id);
}

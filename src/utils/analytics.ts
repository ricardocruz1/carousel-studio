/**
 * Google Analytics 4 helper utilities.
 *
 * The gtag snippet is loaded in index.html.
 * GA4 Measurement ID: G-HKP8924VHN (configured in index.html).
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Send a custom GA4 event. No-op if gtag is not loaded. */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

/**
 * Pre-defined event helpers for common user actions.
 * These map to GA4 recommended event names where possible.
 */

export function trackLayoutSelected(layoutId: string, layoutName: string): void {
  trackEvent('select_content', {
    content_type: 'layout',
    item_id: layoutId,
    item_name: layoutName,
  });
}

export function trackCustomLayoutOpened(): void {
  trackEvent('custom_layout_opened');
}

export function trackExport(
  format: string,
  slideCount: number,
  scale: number,
): void {
  trackEvent('export', {
    format,
    slide_count: slideCount,
    scale,
  });
}

export function trackAspectRatioChanged(ratio: string): void {
  trackEvent('aspect_ratio_changed', { ratio });
}

export function trackImageAdded(slotIndex: number): void {
  trackEvent('image_added', { slot_index: slotIndex });
}

export function trackTextOverlayAdded(): void {
  trackEvent('text_overlay_added');
}

export function trackShapeOverlayAdded(): void {
  trackEvent('shape_overlay_added');
}

export function trackProjectSaved(): void {
  trackEvent('project_saved');
}

export function trackProjectLoaded(): void {
  trackEvent('project_loaded');
}

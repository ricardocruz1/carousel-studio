/**
 * Auto-compress / downsample uploaded images.
 *
 * Max dimension = 3240px (1080 * 3x export scale).
 * - PNG inputs stay PNG (preserves transparency).
 * - Everything else becomes JPEG at 92 % quality.
 *
 * Returns a new File object so the rest of the pipeline works unchanged.
 */

const MAX_DIMENSION = 3240; // 1080 * 3x scale

export async function compressImage(file: File): Promise<File> {
  const isPNG = file.type === 'image/png';

  // Load the image
  const bmp = await createImageBitmap(file);
  const { width, height } = bmp;

  // If already within limits, return the original file unchanged
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    bmp.close();
    return file;
  }

  // Compute scaled dimensions (fit within MAX_DIMENSION, preserve aspect ratio)
  const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
  const newW = Math.round(width * ratio);
  const newH = Math.round(height * ratio);

  // Use OffscreenCanvas if available, fall back to regular canvas
  let blob: Blob;

  if (typeof OffscreenCanvas !== 'undefined') {
    const oc = new OffscreenCanvas(newW, newH);
    const ctx = oc.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0, newW, newH);
    blob = await oc.convertToBlob({
      type: isPNG ? 'image/png' : 'image/jpeg',
      quality: isPNG ? undefined : 0.92,
    });
  } else {
    // Fallback for browsers without OffscreenCanvas
    const canvas = document.createElement('canvas');
    canvas.width = newW;
    canvas.height = newH;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0, newW, newH);
    blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b!),
        isPNG ? 'image/png' : 'image/jpeg',
        isPNG ? undefined : 0.92,
      );
    });
  }

  bmp.close();

  // Build a new File with the same name (extension adjusted if needed)
  const ext = isPNG ? '.png' : '.jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}${ext}`, {
    type: isPNG ? 'image/png' : 'image/jpeg',
  });
}

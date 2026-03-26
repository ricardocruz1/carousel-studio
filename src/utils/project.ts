import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type {
  EditorState,
  PlacedImage,
  TextOverlay,
  ShapeOverlay,
  BackgroundConfig,
  AspectRatio,
  ImageFilters,
} from '../types';
import { DEFAULT_BACKGROUND, DEFAULT_IMAGE_FILTERS } from '../types';

const PROJECT_VERSION = 4;

interface ProjectJson {
  version: number;
  layoutId: string | null;
  customLayout: unknown | null;
  aspectRatio: AspectRatio;
  background: BackgroundConfig;
  textOverlays: TextOverlay[];
  shapeOverlays?: ShapeOverlay[];
  /** Maps slotId → filename in the images/ folder */
  imageSlots: Record<string, string>;
  /** Maps slotId → { offsetX, offsetY, scale } for image positioning (v3+) */
  imageOffsets?: Record<string, { offsetX: number; offsetY: number; scale: number }>;
  /** Maps slotId → image filter settings (v4+) */
  imageFilters?: Record<string, ImageFilters>;
}

/**
 * Save the current project as a .carousel zip file.
 * Contains a project.json + images/ folder with all placed images.
 */
export async function saveProject(
  state: EditorState,
  customLayout: unknown | null
): Promise<void> {
  const zip = new JSZip();
  const imagesFolder = zip.folder('images')!;

  const imageSlots: Record<string, string> = {};
  const imageOffsets: Record<string, { offsetX: number; offsetY: number; scale: number }> = {};
  const imageFilters: Record<string, ImageFilters> = {};

  // Add each placed image to the zip
  for (const [slotId, placed] of Object.entries(state.images)) {
    const ext = placed.file.name.split('.').pop() || 'png';
    const filename = `${slotId}.${ext}`;
    imageSlots[slotId] = filename;
    imagesFolder.file(filename, placed.file);
    imageOffsets[slotId] = {
      offsetX: placed.offsetX,
      offsetY: placed.offsetY,
      scale: placed.scale,
    };
    imageFilters[slotId] = placed.filters;
  }

  const projectJson: ProjectJson = {
    version: PROJECT_VERSION,
    layoutId: state.selectedLayoutId,
    customLayout,
    aspectRatio: state.aspectRatio,
    background: state.background,
    textOverlays: state.textOverlays,
    shapeOverlays: state.shapeOverlays,
    imageSlots,
    imageOffsets,
    imageFilters,
  };

  zip.file('project.json', JSON.stringify(projectJson, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'carousel-project.carousel');
}

/**
 * Load a project from a .carousel zip file.
 * Returns the state fragments needed to restore the editor.
 */
export async function loadProject(file: File): Promise<{
  layoutId: string | null;
  customLayout: unknown | null;
  aspectRatio: AspectRatio;
  background: BackgroundConfig;
  textOverlays: TextOverlay[];
  shapeOverlays: ShapeOverlay[];
  images: Record<string, PlacedImage>;
}> {
  const zip = await JSZip.loadAsync(file);

  const projectFile = zip.file('project.json');
  if (!projectFile) {
    throw new Error('Invalid project file: missing project.json');
  }

  const projectRaw = await projectFile.async('string');
  const project: ProjectJson = JSON.parse(projectRaw);

  if (!project.version || project.version > PROJECT_VERSION) {
    throw new Error(
      `Unsupported project version: ${project.version}. Please update Carousel Studio.`
    );
  }

  // Restore images from the zip
  const images: Record<string, PlacedImage> = {};

  for (const [slotId, filename] of Object.entries(project.imageSlots)) {
    const imgFile = zip.file(`images/${filename}`);
    if (!imgFile) continue;

    const blob = await imgFile.async('blob');
    // Determine MIME type from extension
    const ext = filename.split('.').pop()?.toLowerCase() || 'png';
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      heic: 'image/heic',
    };
    const mime = mimeMap[ext] || 'image/png';

    const imageFile = new File([blob], filename, { type: mime });
    const url = URL.createObjectURL(imageFile);

    images[slotId] = {
      slotId,
      file: imageFile,
      url,
      // Restore saved offsets if available (v3+), otherwise default to centered (50,50)
      offsetX: project.imageOffsets?.[slotId]?.offsetX ?? 50,
      offsetY: project.imageOffsets?.[slotId]?.offsetY ?? 50,
      scale: project.imageOffsets?.[slotId]?.scale ?? 1,
      // Restore filters if available (v4+), otherwise defaults
      filters: project.imageFilters?.[slotId]
        ? { ...DEFAULT_IMAGE_FILTERS, ...project.imageFilters[slotId] }
        : { ...DEFAULT_IMAGE_FILTERS },
    };
  }

  // Migrate text overlays — fill in defaults for fields added in newer versions
  const textOverlays: TextOverlay[] = (project.textOverlays || []).map((o) => {
    const migrated = { ...o } as TextOverlay;
    if (!('fontStyle' in o)) migrated.fontStyle = 'normal';
    if (!('textDecoration' in o)) migrated.textDecoration = 'none';
    if (!('backgroundColor' in o)) migrated.backgroundColor = '';
    if (!('zIndex' in o) || migrated.zIndex == null) migrated.zIndex = 0;
    return migrated;
  });

  // Migrate shape overlays — fill in defaults for backward compat (v1 projects have none)
  const shapeOverlays: ShapeOverlay[] = (project.shapeOverlays || []).map((o) => {
    const migrated = { ...o } as ShapeOverlay;
    if (!('zIndex' in o) || migrated.zIndex == null) migrated.zIndex = 0;
    return migrated;
  });

  return {
    layoutId: project.layoutId,
    customLayout: project.customLayout,
    aspectRatio: project.aspectRatio || '1:1',
    background: project.background || { ...DEFAULT_BACKGROUND },
    textOverlays,
    shapeOverlays,
    images,
  };
}

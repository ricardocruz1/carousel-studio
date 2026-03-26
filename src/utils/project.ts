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
  Layer,
  CarouselLayout,
} from '../types';
import { DEFAULT_BACKGROUND, DEFAULT_IMAGE_FILTERS } from '../types';

const PROJECT_VERSION = 5;

/** Per-layer serialized data inside a v5 project. */
interface SerializedLayer {
  id: string;
  name: string;
  layout: CarouselLayout;
  textOverlays: TextOverlay[];
  shapeOverlays: ShapeOverlay[];
  visible: boolean;
  /** Maps slotId → filename in the layers/<layerId>/images/ folder */
  imageSlots: Record<string, string>;
  /** Maps slotId → { offsetX, offsetY, scale } */
  imageOffsets: Record<string, { offsetX: number; offsetY: number; scale: number }>;
  /** Maps slotId → image filter settings */
  imageFilters: Record<string, ImageFilters>;
}

interface ProjectJson {
  version: number;
  layoutId: string | null;
  customLayout: unknown | null;
  aspectRatio: AspectRatio;
  background: BackgroundConfig;
  textOverlays: TextOverlay[];
  shapeOverlays?: ShapeOverlay[];
  /** Maps slotId → filename in the images/ folder (preset layouts) */
  imageSlots: Record<string, string>;
  /** Maps slotId → { offsetX, offsetY, scale } for image positioning (v3+) */
  imageOffsets?: Record<string, { offsetX: number; offsetY: number; scale: number }>;
  /** Maps slotId → image filter settings (v4+) */
  imageFilters?: Record<string, ImageFilters>;
  /** Layer data for custom layouts (v5+) */
  layers?: SerializedLayer[];
  /** Active layer ID (v5+) */
  activeLayerId?: string | null;
}

/**
 * Save the current project as a .carousel zip file.
 * Contains a project.json + images/ folder with all placed images.
 * For custom layouts with layers (v5+), each layer's images are stored
 * in layers/<layerId>/images/ within the zip.
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

  // Add each placed image to the zip (preset layout images / legacy)
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

  // Serialize layers for custom layouts
  let serializedLayers: SerializedLayer[] | undefined;
  if (state.layers.length > 0) {
    serializedLayers = [];
    for (const layer of state.layers) {
      const layerFolder = zip.folder(`layers/${layer.id}/images`)!;
      const layerImageSlots: Record<string, string> = {};
      const layerImageOffsets: Record<string, { offsetX: number; offsetY: number; scale: number }> = {};
      const layerImageFilters: Record<string, ImageFilters> = {};

      for (const [slotId, placed] of Object.entries(layer.images)) {
        const ext = placed.file.name.split('.').pop() || 'png';
        const filename = `${slotId}.${ext}`;
        layerImageSlots[slotId] = filename;
        layerFolder.file(filename, placed.file);
        layerImageOffsets[slotId] = {
          offsetX: placed.offsetX,
          offsetY: placed.offsetY,
          scale: placed.scale,
        };
        layerImageFilters[slotId] = placed.filters;
      }

      serializedLayers.push({
        id: layer.id,
        name: layer.name,
        layout: layer.layout,
        textOverlays: layer.textOverlays,
        shapeOverlays: layer.shapeOverlays,
        visible: layer.visible,
        imageSlots: layerImageSlots,
        imageOffsets: layerImageOffsets,
        imageFilters: layerImageFilters,
      });
    }
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
    layers: serializedLayers,
    activeLayerId: state.activeLayerId,
  };

  zip.file('project.json', JSON.stringify(projectJson, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'carousel-project.carousel');
}

/**
 * Determine MIME type from a file extension.
 */
function mimeFromExt(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'png';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    heic: 'image/heic',
  };
  return mimeMap[ext] || 'image/png';
}

/**
 * Restore a set of PlacedImages from a zip folder, slot mapping, and offset/filter data.
 */
async function restoreImages(
  zip: JSZip,
  basePath: string,
  imageSlots: Record<string, string>,
  imageOffsets?: Record<string, { offsetX: number; offsetY: number; scale: number }>,
  imageFilters?: Record<string, ImageFilters>,
): Promise<Record<string, PlacedImage>> {
  const images: Record<string, PlacedImage> = {};

  for (const [slotId, filename] of Object.entries(imageSlots)) {
    const imgFile = zip.file(`${basePath}${filename}`);
    if (!imgFile) continue;

    const blob = await imgFile.async('blob');
    const mime = mimeFromExt(filename);
    const imageFile = new File([blob], filename, { type: mime });
    const url = URL.createObjectURL(imageFile);

    images[slotId] = {
      slotId,
      file: imageFile,
      url,
      offsetX: imageOffsets?.[slotId]?.offsetX ?? 50,
      offsetY: imageOffsets?.[slotId]?.offsetY ?? 50,
      scale: imageOffsets?.[slotId]?.scale ?? 1,
      filters: imageFilters?.[slotId]
        ? { ...DEFAULT_IMAGE_FILTERS, ...imageFilters[slotId] }
        : { ...DEFAULT_IMAGE_FILTERS },
    };
  }

  return images;
}

/**
 * Migrate text overlays — fill in defaults for fields added in newer versions.
 */
function migrateTextOverlays(raw: TextOverlay[]): TextOverlay[] {
  return (raw || []).map((o) => {
    const migrated = { ...o } as TextOverlay;
    if (!('fontStyle' in o)) migrated.fontStyle = 'normal';
    if (!('textDecoration' in o)) migrated.textDecoration = 'none';
    if (!('backgroundColor' in o)) migrated.backgroundColor = '';
    if (!('zIndex' in o) || migrated.zIndex == null) migrated.zIndex = 0;
    return migrated;
  });
}

/**
 * Migrate shape overlays — fill in defaults for backward compat.
 */
function migrateShapeOverlays(raw: ShapeOverlay[]): ShapeOverlay[] {
  return (raw || []).map((o) => {
    const migrated = { ...o } as ShapeOverlay;
    if (!('zIndex' in o) || migrated.zIndex == null) migrated.zIndex = 0;
    return migrated;
  });
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
  layers?: Layer[];
  activeLayerId?: string | null;
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

  // Restore preset/legacy images from images/ folder
  const images = await restoreImages(
    zip,
    'images/',
    project.imageSlots,
    project.imageOffsets,
    project.imageFilters,
  );

  const textOverlays = migrateTextOverlays(project.textOverlays);
  const shapeOverlays = migrateShapeOverlays(project.shapeOverlays || []);

  // Restore layers if present (v5+)
  let layers: Layer[] | undefined;
  let activeLayerId: string | null | undefined;

  if (project.layers && project.layers.length > 0) {
    layers = [];
    for (const sl of project.layers) {
      const layerImages = await restoreImages(
        zip,
        `layers/${sl.id}/images/`,
        sl.imageSlots,
        sl.imageOffsets,
        sl.imageFilters,
      );

      layers.push({
        id: sl.id,
        name: sl.name,
        layout: sl.layout,
        images: layerImages,
        textOverlays: migrateTextOverlays(sl.textOverlays),
        shapeOverlays: migrateShapeOverlays(sl.shapeOverlays),
        visible: sl.visible,
      });
    }
    activeLayerId = project.activeLayerId ?? layers[0]?.id ?? null;
  }

  return {
    layoutId: project.layoutId,
    customLayout: project.customLayout,
    aspectRatio: project.aspectRatio || '1:1',
    background: project.background || { ...DEFAULT_BACKGROUND },
    textOverlays,
    shapeOverlays,
    images,
    layers,
    activeLayerId,
  };
}

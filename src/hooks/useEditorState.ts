import { useState, useCallback } from 'react';
import type { EditorState, PlacedImage, AspectRatio } from '../types';

export function useEditorState() {
  const [state, setState] = useState<EditorState>({
    selectedLayoutId: null,
    images: {},
    currentSlide: 0,
    isExporting: false,
    aspectRatio: '1:1',
  });

  const selectLayout = useCallback((layoutId: string) => {
    setState((prev) => ({
      ...prev,
      selectedLayoutId: layoutId,
      images: {},
      currentSlide: 0,
    }));
  }, []);

  const setImage = useCallback((slotId: string, file: File) => {
    const url = URL.createObjectURL(file);
    const placedImage: PlacedImage = {
      slotId,
      file,
      url,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    };
    setState((prev) => ({
      ...prev,
      images: { ...prev.images, [slotId]: placedImage },
    }));
  }, []);

  const removeImage = useCallback((slotId: string) => {
    setState((prev) => {
      const newImages = { ...prev.images };
      if (newImages[slotId]) {
        URL.revokeObjectURL(newImages[slotId].url);
        delete newImages[slotId];
      }
      return { ...prev, images: newImages };
    });
  }, []);

  const setCurrentSlide = useCallback((slide: number) => {
    setState((prev) => ({ ...prev, currentSlide: slide }));
  }, []);

  const setExporting = useCallback((isExporting: boolean) => {
    setState((prev) => ({ ...prev, isExporting }));
  }, []);

  const setAspectRatio = useCallback((aspectRatio: AspectRatio) => {
    setState((prev) => ({ ...prev, aspectRatio }));
  }, []);

  const clearAll = useCallback(() => {
    setState((prev) => {
      // Revoke all object URLs
      Object.values(prev.images).forEach((img) => URL.revokeObjectURL(img.url));
      return {
        ...prev,
        images: {},
        currentSlide: 0,
      };
    });
  }, []);

  return {
    state,
    selectLayout,
    setImage,
    removeImage,
    setCurrentSlide,
    setExporting,
    setAspectRatio,
    clearAll,
  };
}

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { LayoutPicker } from './components/LayoutPicker';
import { CarouselEditor } from './components/CarouselEditor';
import { CustomLayoutBuilder } from './components/CustomLayoutBuilder';
import { AdGateModal } from './components/AdGateModal';
import { BackgroundPicker } from './components/BackgroundPicker';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfService } from './components/TermsOfService';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { ToastContainer } from './components/Toast';
import { Onboarding, isOnboardingDone } from './components/Onboarding';
import { useEditorState } from './hooks/useEditorState';
import { useExportGate } from './hooks/useExportGate';
import { useCookieConsent } from './hooks/useCookieConsent';
import { useDarkMode } from './hooks/useDarkMode';
import { useToast } from './hooks/useToast';
import { getLayoutById } from './layouts';
import { exportCarousel, renderSingleSlide, MAX_CANVAS_PIXELS } from './utils/export';
import { saveProject, loadProject } from './utils/project';
import { loadFontsForFamilies } from './utils/fontLoader';
import { compressImage } from './utils/imageCompress';
import type { CarouselLayout, TextOverlay, ShapeOverlay, ShapeType } from './types';
import { ASPECT_RATIOS, ASPECT_RATIO_OPTIONS, INSTAGRAM_WIDTH, FONT_OPTIONS } from './types';
import './App.css';

const AUTOSAVE_KEY = 'carousel-studio-autosave';
const AUTOSAVE_DEBOUNCE_MS = 1000;

let _overlayIdCounter = 0;
function nextOverlayId(prefix: string = 'text'): string {
  return `${prefix}-${Date.now()}-${++_overlayIdCounter}`;
}

const App: React.FC = () => {
  // Simple hash-based routing for legal pages
  const [page, setPage] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setPage(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateTo = useCallback((hash: string) => {
    window.location.hash = hash;
  }, []);

  const goHome = useCallback(() => {
    window.location.hash = '';
    setPage('');
  }, []);

  // All hooks called unconditionally (before any conditional returns)
  const {
    state,
    selectLayout,
    setImage,
    removeImage,
    batchSetImages,
    updateImageOffsetNoHistory,
    setCurrentSlide,
    setExporting,
    setAspectRatio,
    clearAll,
    addTextOverlay,
    updateTextOverlay,
    updateTextOverlayNoHistory,
    pushHistorySnapshot,
    removeTextOverlay,
    addShapeOverlay,
    updateShapeOverlay,
    updateShapeOverlayNoHistory,
    removeShapeOverlay,
    bringForward,
    sendBackward,
    setBackground,
    undo,
    redo,
    canUndo,
    canRedo,
    restoreState,
  } = useEditorState();

  const { consumeExport } = useExportGate();
  const { consent, accept: acceptCookies, reject: rejectCookies } = useCookieConsent();
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const { showToast } = useToast();
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [customLayout, setCustomLayout] = useState<CarouselLayout | null>(null);
  const [showAdGate, setShowAdGate] = useState(false);
  const [exportScale, setExportScale] = useState<number>(1);

  // Mobile detection for collapsible controls
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  );
  const [controlsOpen, setControlsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDone());

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Refs for hidden file inputs
  const batchInputRef = useRef<HTMLInputElement>(null);
  const loadInputRef = useRef<HTMLInputElement>(null);

  // Resolve the active layout: either a predefined one or the custom one
  const selectedLayout = state.selectedLayoutId === 'custom'
    ? customLayout
    : state.selectedLayoutId
      ? getLayoutById(state.selectedLayoutId)
      : null;

  const imageCount = Object.keys(state.images).length;
  const allSlotsFilled = selectedLayout
    ? imageCount === selectedLayout.imageCount
    : false;

  // Check if current scale + slide count would exceed canvas limits
  const canvasWarning = selectedLayout
    ? (() => {
        const config = ASPECT_RATIOS[state.aspectRatio];
        const totalPixels = (INSTAGRAM_WIDTH * exportScale) * (config.height * exportScale) * selectedLayout.slideCount;
        return totalPixels > MAX_CANVAS_PIXELS;
      })()
    : false;

  // ─── Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z ────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        // Don't intercept if user is editing a text input/textarea/contentEditable
        const tag = (e.target as HTMLElement).tagName;
        const isEditable = (e.target as HTMLElement).isContentEditable;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || isEditable) return;

        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // ─── Auto-save to localStorage (debounced) ─────────────
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredRef = useRef(false);

  // On mount: restore saved state
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || !saved.selectedLayoutId) return;

      // Restore custom layout if it was saved
      if (saved.customLayout) {
        setCustomLayout(saved.customLayout as CarouselLayout);
      }

      // Restore state (without images — they can't be serialized)
      restoreState({
        selectedLayoutId: saved.selectedLayoutId,
        aspectRatio: saved.aspectRatio ?? '1:1',
        background: saved.background,
        textOverlays: saved.textOverlays ?? [],
        shapeOverlays: saved.shapeOverlays ?? [],
        currentSlide: saved.currentSlide ?? 0,
      });

      // Lazy-load any Google Fonts from restored overlays
      if (saved.textOverlays?.length > 0) {
        const families = saved.textOverlays.map((o: TextOverlay) => o.fontFamily);
        loadFontsForFamilies(families);
      }

      showToast('Recovered your previous work', 'info');
    } catch {
      // Corrupted data — ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On state change: debounce-save to localStorage
  useEffect(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(() => {
      // Only save if there's a meaningful state (a layout has been selected)
      if (!state.selectedLayoutId) {
        localStorage.removeItem(AUTOSAVE_KEY);
        return;
      }
      try {
        const toSave = {
          selectedLayoutId: state.selectedLayoutId,
          aspectRatio: state.aspectRatio,
          background: state.background,
          textOverlays: state.textOverlays,
          shapeOverlays: state.shapeOverlays,
          currentSlide: state.currentSlide,
          customLayout: customLayout ?? null,
        };
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(toSave));
      } catch {
        // localStorage full or unavailable — silently ignore
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [
    state.selectedLayoutId,
    state.aspectRatio,
    state.background,
    state.textOverlays,
    state.shapeOverlays,
    state.currentSlide,
    customLayout,
  ]);

  /** Actually run the export (called after gate check passes) */
  const doExport = useCallback(async () => {
    if (!selectedLayout || !allSlotsFilled) return;

    setExporting(true);
    setExportProgress(0);

    try {
      await exportCarousel(
        selectedLayout,
        state.images,
        state.aspectRatio,
        (progress) => setExportProgress(progress),
        exportScale,
        state.background,
        state.textOverlays,
        state.shapeOverlays,
      );
      consumeExport();
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Export failed. Please try again.');
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  }, [selectedLayout, allSlotsFilled, state.images, state.aspectRatio, state.background, state.textOverlays, state.shapeOverlays, setExporting, consumeExport, exportScale, showToast]);

  /** Share or copy the current slide */
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (!selectedLayout || !allSlotsFilled) return;
    setIsSharing(true);
    try {
      const blob = await renderSingleSlide(
        state.currentSlide,
        selectedLayout,
        state.images,
        state.aspectRatio,
        exportScale,
        state.background,
        state.textOverlays,
        state.shapeOverlays,
      );

      // Mobile: Web Share API with file
      if (isMobile && navigator.share) {
        const file = new File([blob], `slide-${state.currentSlide + 1}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Carousel Slide',
            text: `Slide ${state.currentSlide + 1}`,
          });
          showToast('Shared successfully', 'success');
        } else {
          // Fallback: download the file
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `slide-${state.currentSlide + 1}.png`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('Downloaded slide (sharing not supported)', 'info');
        }
      }
      // Desktop: Clipboard API
      else if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        showToast('Slide copied to clipboard', 'success');
      }
      // Final fallback: download
      else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `slide-${state.currentSlide + 1}.png`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Downloaded slide', 'info');
      }
    } catch (err) {
      // User may have cancelled the share sheet — that's OK
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Share failed:', err);
        showToast('Share failed. Please try again.');
      }
    } finally {
      setIsSharing(false);
    }
  }, [selectedLayout, allSlotsFilled, state.currentSlide, state.images, state.aspectRatio, state.background, state.textOverlays, state.shapeOverlays, exportScale, isMobile, showToast]);

  /** User clicks "Export Carousel" — show ad gate first */
  const handleExport = useCallback(() => {
    if (!selectedLayout || !allSlotsFilled) return;
    setShowAdGate(true);
  }, [selectedLayout, allSlotsFilled]);

  /** Ad gate countdown finished — close modal and export */
  const handleAdGateComplete = useCallback(() => {
    setShowAdGate(false);
    doExport();
  }, [doExport]);

  const handleAdGateClose = useCallback(() => {
    setShowAdGate(false);
  }, []);

  const handleCustomClick = () => {
    setIsBuilding(true);
  };

  const handleBuilderFinish = (layout: CarouselLayout) => {
    setCustomLayout(layout);
    setIsBuilding(false);
    selectLayout('custom');
  };

  const handleBuilderCancel = () => {
    setIsBuilding(false);
  };

  const handleEditLayout = () => {
    setIsBuilding(true);
  };

  const handleScaleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Math.min(3, Math.max(1, Math.round(Number(e.target.value))));
    setExportScale(val);
  }, []);

  // ─── Add Text Overlay ──────────────────────────────────
  const handleAddText = useCallback(() => {
    if (!selectedLayout) return;
    // Compute the next z-index (above all existing overlays)
    const allZ = [
      ...state.textOverlays.map((o) => o.zIndex ?? 0),
      ...state.shapeOverlays.map((o) => o.zIndex ?? 0),
    ];
    const nextZ = allZ.length > 0 ? Math.max(...allZ) + 1 : 1;

    const overlay: TextOverlay = {
      id: nextOverlayId('text'),
      slideIndex: state.currentSlide,
      text: 'Text',
      x: 10,
      y: 10,
      fontSize: 48,
      fontFamily: FONT_OPTIONS[0].value,
      color: '#ffffff',
      fontWeight: 700,
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'left',
      opacity: 1,
      backgroundColor: '',
      zIndex: nextZ,
    };
    addTextOverlay(overlay);
  }, [selectedLayout, state.currentSlide, state.textOverlays, state.shapeOverlays, addTextOverlay]);

  // ─── Add Shape Overlay ─────────────────────────────────
  const [showShapeDropdown, setShowShapeDropdown] = useState(false);
  const shapeDropdownRef = useRef<HTMLDivElement>(null);

  // Close shape dropdown when clicking/tapping outside
  useEffect(() => {
    if (!showShapeDropdown) return;
    const handleClickOutside = (e: PointerEvent) => {
      if (shapeDropdownRef.current && !shapeDropdownRef.current.contains(e.target as Node)) {
        setShowShapeDropdown(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [showShapeDropdown]);

  const handleAddShape = useCallback((shapeType: ShapeType) => {
    if (!selectedLayout) return;
    setShowShapeDropdown(false);

    const allZ = [
      ...state.textOverlays.map((o) => o.zIndex ?? 0),
      ...state.shapeOverlays.map((o) => o.zIndex ?? 0),
    ];
    const nextZ = allZ.length > 0 ? Math.max(...allZ) + 1 : 1;

    // Default sizes per shape type
    // For constrained shapes (square/circle), height = width * slideAR to be visually 1:1
    const arConfig = ASPECT_RATIOS[state.aspectRatio];
    const slideAR = arConfig.width / arConfig.height;
    let w = 25, h = 15;
    if (shapeType === 'square' || shapeType === 'circle') { w = 15; h = 15 * slideAR; }
    else if (shapeType === 'triangle') { w = 20; h = 20; }

    const shape: ShapeOverlay = {
      id: nextOverlayId('shape'),
      slideIndex: state.currentSlide,
      type: shapeType,
      x: 10,
      y: 20,
      width: w,
      height: h,
      fillType: 'solid',
      fillColor: '#6c5ce7',
      gradientStart: '#6c5ce7',
      gradientEnd: '#a29bfe',
      gradientAngle: 135,
      borderColor: '#ffffff',
      borderWidth: 0,
      opacity: 1,
      zIndex: nextZ,
    };
    addShapeOverlay(shape);
  }, [selectedLayout, state.currentSlide, state.textOverlays, state.shapeOverlays, addShapeOverlay]);

  // ─── Batch Upload ──────────────────────────────────────
  const handleBatchUpload = useCallback(() => {
    batchInputRef.current?.click();
  }, []);

  const handleBatchFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0 || !selectedLayout) return;

      // Validate each file
      const validFiles: File[] = [];
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      for (const f of Array.from(files)) {
        if (f.size > MAX_FILE_SIZE) continue;
        if (f.type && !f.type.startsWith('image/')) continue;
        if (f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg')) continue;
        validFiles.push(f);
      }

      if (validFiles.length > 0) {
        // Auto-compress all images before passing to the editor
        const compressed = await Promise.all(
          validFiles.map((f) => compressImage(f).catch(() => f))
        );
        batchSetImages(compressed, selectedLayout.slots.map((s) => s.id));
      }
      e.target.value = '';
    },
    [selectedLayout, batchSetImages]
  );

  // ─── Save / Load Project ───────────────────────────────
  const handleSaveProject = useCallback(async () => {
    try {
      await saveProject(state, customLayout);
    } catch (err) {
      console.error('Save failed:', err);
      showToast('Failed to save project.');
    }
  }, [state, customLayout, showToast]);

  const handleLoadClick = useCallback(() => {
    loadInputRef.current?.click();
  }, []);

  const handleLoadFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';

      try {
        const project = await loadProject(file);
        // Restore custom layout if it was a custom one
        if (project.customLayout) {
          setCustomLayout(project.customLayout as CarouselLayout);
        }
        // Restore state
        restoreState({
          selectedLayoutId: project.layoutId,
          aspectRatio: project.aspectRatio,
          background: project.background,
          textOverlays: project.textOverlays,
          shapeOverlays: project.shapeOverlays,
          images: project.images,
          currentSlide: 0,
        });

        // Lazy-load any Google Fonts used by text overlays in the project
        if (project.textOverlays && project.textOverlays.length > 0) {
          const families = project.textOverlays.map((o: TextOverlay) => o.fontFamily);
          loadFontsForFamilies(families);
        }
      } catch (err) {
        console.error('Load failed:', err);
        showToast('Failed to load project. The file may be corrupted or incompatible.');
      }
    },
    [restoreState, showToast]
  );

  // ─── Route to legal pages ──────────────────────────────
  if (page === '#/privacy') return <PrivacyPolicy onBack={goHome} />;
  if (page === '#/terms') return <TermsOfService onBack={goHome} />;

  // ─── Builder View ───────────────────────────────────────
  if (isBuilding) {
    return (
      <div className="app">
        <header className="app__header">
          <div className="app__logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="24" height="24" rx="6" stroke="currentColor" strokeWidth="2"/>
              <circle cx="14" cy="14" r="6" stroke="currentColor" strokeWidth="2"/>
              <circle cx="21" cy="7" r="1.5" fill="currentColor"/>
            </svg>
            <h1 className="app__title">Carousel Studio</h1>
          </div>
          <p className="app__subtitle">
            Build your custom carousel layout
          </p>
        </header>

        <main className="app__main">
          <CustomLayoutBuilder
            onFinish={handleBuilderFinish}
            onCancel={handleBuilderCancel}
            initialLayout={customLayout ?? undefined}
            aspectRatio={state.aspectRatio}
          />
        </main>
      </div>
    );
  }

  // ─── Normal View ────────────────────────────────────────
  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-row">
          <div className="app__logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="24" height="24" rx="6" stroke="currentColor" strokeWidth="2"/>
              <circle cx="14" cy="14" r="6" stroke="currentColor" strokeWidth="2"/>
              <circle cx="21" cy="7" r="1.5" fill="currentColor"/>
            </svg>
            <h1 className="app__title">Carousel Studio</h1>
          </div>
          <button
            className="app__dark-toggle"
            onClick={toggleDarkMode}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9 2V3.5M9 14.5V16M16 9H14.5M3.5 9H2M13.95 4.05L12.89 5.11M5.11 12.89L4.05 13.95M13.95 13.95L12.89 12.89M5.11 5.11L4.05 4.05" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M15.09 10.64A7 7 0 017.36 2.91 7 7 0 1015.09 10.64z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
        <p className="app__subtitle">
          Create stunning Instagram carousel posts with seamless layouts
        </p>
      </header>

      <main className="app__main">
        {/* -- Mobile Controls Toggle -------- */}
        {isMobile && selectedLayout && (
          <button
            className={`app__controls-toggle ${controlsOpen ? 'app__controls-toggle--open' : ''}`}
            onClick={() => setControlsOpen((v) => !v)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2.5 4.5H13.5M2.5 8H13.5M2.5 11.5H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {controlsOpen ? 'Hide Controls' : 'Controls'}
            <svg className="app__controls-toggle-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* -- Collapsible Controls Panel -------- */}
        <div className={`app__controls-panel ${isMobile && selectedLayout ? (controlsOpen ? 'app__controls-panel--open' : 'app__controls-panel--closed') : ''}`}>
          {/* -- Layout Picker (horizontal, top) -------- */}
          <section className="app__picker">
            <LayoutPicker
              selectedLayoutId={state.selectedLayoutId}
              aspectRatio={state.aspectRatio}
              onSelectLayout={selectLayout}
              onCustomClick={handleCustomClick}
            />
          </section>

          {/* -- Aspect Ratio Selector ------------------- */}
          <section className="app__aspect-ratio">
            <span className="app__aspect-label">Aspect Ratio</span>
            <div className="app__aspect-options">
              {ASPECT_RATIO_OPTIONS.map((ratio) => {
                const config = ASPECT_RATIOS[ratio];
                return (
                  <button
                    key={ratio}
                    className={`app__aspect-btn ${state.aspectRatio === ratio ? 'app__aspect-btn--active' : ''}`}
                    onClick={() => setAspectRatio(ratio)}
                  >
                    <span
                      className="app__aspect-icon"
                      style={{
                        aspectRatio: `${config.width} / ${config.height}`,
                      }}
                    />
                    <span className="app__aspect-text">
                      <span className="app__aspect-name">{config.label}</span>
                      <span className="app__aspect-dims">{ratio}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* -- Background Picker ----------------------- */}
          {selectedLayout && (
            <section className="app__bg-section">
              <BackgroundPicker
                background={state.background}
                onChange={setBackground}
              />
            </section>
          )}

          {/* -- Action Bar ------------------------------ */}
          {selectedLayout && (
            <section className="app__action-bar">
              {/* Row 1: Status + editing tools */}
              <div className="app__action-row">
                <div className="app__action-group">
                  {state.selectedLayoutId === 'custom' && (
                    <button
                      className="app__btn app__btn--outline"
                      onClick={handleEditLayout}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Edit Layout
                    </button>
                  )}

                  <span className="app__status-text">
                    {imageCount} / {selectedLayout.imageCount} images
                  </span>

                  {!allSlotsFilled && imageCount > 0 && (
                    <span className="app__hint">
                      &mdash; {selectedLayout.imageCount - imageCount} more
                    </span>
                  )}
                </div>

                <div className="app__action-group">
                  {/* Undo / Redo */}
                  <button
                    className="app__btn app__btn--icon"
                    onClick={undo}
                    disabled={!canUndo}
                    title="Undo (Ctrl+Z)"
                    aria-label="Undo"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 6H10C12.2091 6 14 7.79086 14 10C14 12.2091 12.2091 14 10 14H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 3L3 6L6 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    className="app__btn app__btn--icon"
                    onClick={redo}
                    disabled={!canRedo}
                    title="Redo (Ctrl+Shift+Z)"
                    aria-label="Redo"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13 6H6C3.79086 6 2 7.79086 2 10C2 12.2091 3.79086 14 6 14H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 3L13 6L10 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  <div className="app__separator" />

                  {/* Add Text */}
                  <button
                    className="app__btn app__btn--icon"
                    onClick={handleAddText}
                    title="Add text overlay"
                    aria-label="Add text"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 4V3H13V4M8 3V13M6 13H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {/* Add Shape (dropdown) */}
                  <div ref={shapeDropdownRef} className="app__shape-dropdown-wrapper" style={{ position: 'relative' }}>
                    <button
                      className="app__btn app__btn--icon"
                      onClick={() => setShowShapeDropdown((v) => !v)}
                      title="Add shape"
                      aria-label="Add shape"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="3" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </button>
                    {showShapeDropdown && (
                      <div className="app__shape-dropdown">
                        {([
                          { type: 'rectangle' as ShapeType, label: 'Rectangle', icon: <rect x="2" y="4" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/> },
                          { type: 'square' as ShapeType, label: 'Square', icon: <rect x="3" y="3" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/> },
                          { type: 'circle' as ShapeType, label: 'Circle', icon: <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.3" fill="none"/> },
                          { type: 'ellipse' as ShapeType, label: 'Ellipse', icon: <ellipse cx="8" cy="8" rx="6" ry="4" stroke="currentColor" strokeWidth="1.3" fill="none"/> },
                          { type: 'triangle' as ShapeType, label: 'Triangle', icon: <polygon points="8,2 14,14 2,14" stroke="currentColor" strokeWidth="1.3" fill="none"/> },
                        ]).map(({ type, label, icon }) => (
                          <button
                            key={type}
                            className="app__shape-dropdown-item"
                            onClick={() => handleAddShape(type)}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">{icon}</svg>
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Batch Upload */}
                  <button
                    className="app__btn app__btn--icon"
                    onClick={handleBatchUpload}
                    title="Batch upload images"
                    aria-label="Batch upload"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 10V2M8 2L5 5M8 2L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 10V13H14V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <input
                    ref={batchInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="app__hidden-input"
                    onChange={handleBatchFiles}
                  />

                  <div className="app__separator" />

                  <button
                    className="app__btn app__btn--icon"
                    onClick={clearAll}
                    disabled={imageCount === 0 && state.textOverlays.length === 0 && state.shapeOverlays.length === 0}
                    title="Clear all"
                    aria-label="Clear all"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 5H13M5 5V13H11V5M7 7V11M9 7V11M6 5V3H10V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Row 2: Project + Export */}
              <div className="app__action-row">
                <div className="app__action-group">
                  {/* Save / Load */}
                  <button
                    className="app__btn app__btn--secondary app__btn--compact"
                    onClick={handleSaveProject}
                    title="Save project"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M12 14H4C3.44772 14 3 13.5523 3 13V3C3 2.44772 3.44772 2 4 2H9L13 6V13C13 13.5523 12.5523 14 12 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 2V6H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Save
                  </button>
                  <button
                    className="app__btn app__btn--secondary app__btn--compact"
                    onClick={handleLoadClick}
                    title="Load project"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M2 13H14M8 2V10M8 10L5 7M8 10L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Load
                  </button>
                  <input
                    ref={loadInputRef}
                    type="file"
                    accept=".carousel,.zip"
                    className="app__hidden-input"
                    onChange={handleLoadFile}
                  />
                </div>

                <div className="app__action-group">
                  <div className="app__scale-select">
                    <label className="app__scale-label" htmlFor="export-scale">Quality</label>
                    <select
                      id="export-scale"
                      className="app__scale-dropdown"
                      value={exportScale}
                      onChange={handleScaleChange}
                    >
                      <option value={1}>Low (1080px)</option>
                      <option value={2}>Medium (2160px)</option>
                      <option value={3}>High (3240px)</option>
                    </select>
                  </div>

                  {canvasWarning && (
                    <span className="app__canvas-warning" title="This combination of slides and quality may be too large for some browsers. Consider lowering the quality.">
                      Large canvas
                    </span>
                  )}

                  <button
                    className="app__btn app__btn--secondary app__btn--compact"
                    onClick={handleShare}
                    disabled={!allSlotsFilled || isSharing}
                    title={isMobile ? 'Share current slide' : 'Copy current slide to clipboard'}
                  >
                    {isSharing ? (
                      'Sharing...'
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          {isMobile ? (
                            <path d="M4 9V13H12V9M8 2V10M8 2L5 5M8 2L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          ) : (
                            <>
                              <rect x="2" y="2" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                              <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                              <path d="M8.5 4.75H10.25C10.94 4.75 11.5 5.31 11.5 6V7.5M7.5 11.25H5.75C5.06 11.25 4.5 10.69 4.5 10V8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                            </>
                          )}
                        </svg>
                        {isMobile ? 'Share' : 'Copy'}
                      </>
                    )}
                  </button>

                  <button
                    className="app__btn app__btn--primary"
                    onClick={handleExport}
                    disabled={!allSlotsFilled || state.isExporting}
                  >
                    {state.isExporting ? (
                      <span className="app__btn-loading">
                        <span
                          className="app__btn-progress"
                          style={{
                            width: `${(exportProgress ?? 0) * 100}%`,
                          }}
                        />
                        Exporting...
                      </span>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                          <path d="M3 12.75V14.25C3 14.6642 3.16437 15.0613 3.45701 15.354C3.74964 15.6466 4.14775 15.811 4.5625 15.811H13.4375C13.8522 15.811 14.2504 15.6466 14.543 15.354C14.8356 15.0613 15 14.6642 15 14.25V12.75M9 3V11.25M9 11.25L12 8.25M9 11.25L6 8.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Export
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* -- Editor (full width, below) -------------- */}
        <section className="app__editor">
          {selectedLayout ? (
            <CarouselEditor
              layout={selectedLayout}
              images={state.images}
              currentSlide={state.currentSlide}
              aspectRatio={state.aspectRatio}
              background={state.background}
              textOverlays={state.textOverlays}
              shapeOverlays={state.shapeOverlays}
              onSetImage={setImage}
              onRemoveImage={removeImage}
              onSetCurrentSlide={setCurrentSlide}
              onUpdateTextOverlay={updateTextOverlay}
              onUpdateTextOverlayNoHistory={updateTextOverlayNoHistory}
              onPushHistorySnapshot={pushHistorySnapshot}
              onRemoveTextOverlay={removeTextOverlay}
              onUpdateShapeOverlay={updateShapeOverlay}
              onUpdateShapeOverlayNoHistory={updateShapeOverlayNoHistory}
              onRemoveShapeOverlay={removeShapeOverlay}
              onBringForward={bringForward}
              onSendBackward={sendBackward}
              onUpdateImageOffsetNoHistory={updateImageOffsetNoHistory}
              onPushImageHistorySnapshot={pushHistorySnapshot}
            />
          ) : (
            <div className="app__empty">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <rect x="4" y="4" width="56" height="56" rx="12" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4"/>
                <path d="M24 32H40M32 24V40" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <h3>Select a layout to get started</h3>
              <p>Choose from the layouts above, or build your own custom layout</p>
            </div>
          )}
        </section>
      </main>

      {/* -- Ad Gate Modal --------------------------- */}
      {showAdGate && (
        <AdGateModal
          onComplete={handleAdGateComplete}
          onClose={handleAdGateClose}
        />
      )}

      {/* -- Cookie Consent Banner ------------------- */}
      {consent === 'pending' && (
        <CookieConsentBanner onAccept={acceptCookies} onReject={rejectCookies} />
      )}

      {/* -- Footer ---------------------------------- */}
      <footer className="app__footer">
        <span className="app__footer-copy">Carousel Studio</span>
        <nav className="app__footer-links">
          <a href="#/privacy" onClick={() => navigateTo('#/privacy')}>Privacy Policy</a>
          <span className="app__footer-sep">|</span>
          <a href="#/terms" onClick={() => navigateTo('#/terms')}>Terms of Service</a>
        </nav>
      </footer>

      {/* -- Onboarding (first visit) ───────────────────── */}
      {showOnboarding && (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      )}

      {/* -- Toast Notifications ─────────────────────── */}
      <ToastContainer />
    </div>
  );
};

export default App;

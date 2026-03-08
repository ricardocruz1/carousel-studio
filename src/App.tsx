import React, { useCallback, useState } from 'react';
import { LayoutPicker } from './components/LayoutPicker';
import { CarouselEditor } from './components/CarouselEditor';
import { CustomLayoutBuilder } from './components/CustomLayoutBuilder';
import { AdGateModal } from './components/AdGateModal';
import { useEditorState } from './hooks/useEditorState';
import { useExportGate } from './hooks/useExportGate';
import { getLayoutById } from './layouts';
import { exportCarousel } from './utils/export';
import type { CarouselLayout } from './types';
import { ASPECT_RATIOS, ASPECT_RATIO_OPTIONS } from './types';
import './App.css';

const App: React.FC = () => {
  const {
    state,
    selectLayout,
    setImage,
    removeImage,
    setCurrentSlide,
    setExporting,
    setAspectRatio,
    clearAll,
  } = useEditorState();

  const { canExport, credits, consumeExport, grantAdCredits, freeExports, exportsPerAd } = useExportGate();
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [customLayout, setCustomLayout] = useState<CarouselLayout | null>(null);
  const [showAdGate, setShowAdGate] = useState(false);
  const [showNoCredits, setShowNoCredits] = useState(false);
  const [exportScale, setExportScale] = useState<number>(1);

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

  // Compute remaining exports for display
  const remainingExports = credits.totalExports < freeExports
    ? (freeExports - credits.totalExports) + credits.bonusCredits
    : credits.bonusCredits;

  /** Actually run the export (called after gate check passes) */
  const doExport = useCallback(async () => {
    if (!selectedLayout || !allSlotsFilled) return;

    setExporting(true);
    setExportProgress(0);

    try {
      await exportCarousel(selectedLayout, state.images, state.aspectRatio, (progress) => {
        setExportProgress(progress);
      }, exportScale);
      consumeExport();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  }, [selectedLayout, allSlotsFilled, state.images, state.aspectRatio, setExporting, consumeExport, exportScale]);

  /** User clicks "Export Carousel" — check gate first */
  const handleExport = useCallback(() => {
    if (!selectedLayout || !allSlotsFilled) return;

    if (canExport) {
      doExport();
    } else {
      setShowNoCredits(true);
    }
  }, [selectedLayout, allSlotsFilled, canExport, doExport]);

  /** User chose "Watch a Short Ad" from the no-credits prompt */
  const handleWatchAd = useCallback(() => {
    setShowNoCredits(false);
    setShowAdGate(true);
  }, []);

  /** Ad gate countdown finished — grant credits, close modal, export */
  const handleAdGateComplete = useCallback(() => {
    grantAdCredits();
    setShowAdGate(false);
    doExport();
  }, [grantAdCredits, doExport]);

  const handleAdGateClose = useCallback(() => {
    setShowAdGate(false);
  }, []);

  const handleNoCreditsClose = useCallback(() => {
    setShowNoCredits(false);
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
          <div className={`app__credits-badge ${remainingExports === 0 ? 'app__credits-badge--empty' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M3 12.75V14.25C3 14.66 3.16 15.06 3.46 15.35C3.75 15.65 4.15 15.81 4.56 15.81H13.44C13.85 15.81 14.25 15.65 14.54 15.35C14.84 15.06 15 14.66 15 14.25V12.75M9 3V11.25M9 11.25L12 8.25M9 11.25L6 8.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="app__credits-badge-count">{remainingExports}</span>
            <span className="app__credits-badge-label">
              {remainingExports === 1 ? 'export' : 'exports'}
            </span>
          </div>
        </div>
        <p className="app__subtitle">
          Create stunning Instagram carousel posts with seamless layouts
        </p>
      </header>

      <main className="app__main">
        {/* ── Layout Picker (horizontal, top) ────────── */}
        <section className="app__picker">
          <LayoutPicker
            selectedLayoutId={state.selectedLayoutId}
            aspectRatio={state.aspectRatio}
            onSelectLayout={selectLayout}
            onCustomClick={handleCustomClick}
          />
        </section>

        {/* ── Aspect Ratio Selector ──────────────────── */}
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

        {/* ── Action Bar ─────────────────────────────── */}
        {selectedLayout && (
          <section className="app__action-bar">
            <div className="app__action-bar-left">
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
                {imageCount} / {selectedLayout.imageCount} images placed
              </span>

              {!allSlotsFilled && imageCount > 0 && (
                <span className="app__hint">
                  &mdash; {selectedLayout.imageCount - imageCount} more to export
                </span>
              )}
            </div>

            <div className="app__action-bar-right">
              <button
                className="app__btn app__btn--secondary"
                onClick={clearAll}
                disabled={imageCount === 0}
              >
                Clear All
              </button>

              <div className="app__scale-select">
                <label className="app__scale-label" htmlFor="export-scale">Quality</label>
                <select
                  id="export-scale"
                  className="app__scale-dropdown"
                  value={exportScale}
                  onChange={(e) => setExportScale(Number(e.target.value))}
                >
                  <option value={1}>1x (1080p)</option>
                  <option value={2}>2x (2160p)</option>
                  <option value={3}>3x (3240p)</option>
                </select>
              </div>

              <div className="app__export-group">
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
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M3 12.75V14.25C3 14.6642 3.16437 15.0613 3.45701 15.354C3.74964 15.6466 4.14775 15.811 4.5625 15.811H13.4375C13.8522 15.811 14.2504 15.6466 14.543 15.354C14.8356 15.0613 15 14.6642 15 14.25V12.75M9 3V11.25M9 11.25L12 8.25M9 11.25L6 8.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Export Carousel
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── Editor (full width, below) ─────────────── */}
        <section className="app__editor">
          {selectedLayout ? (
            <CarouselEditor
              layout={selectedLayout}
              images={state.images}
              currentSlide={state.currentSlide}
              aspectRatio={state.aspectRatio}
              onSetImage={setImage}
              onRemoveImage={removeImage}
              onSetCurrentSlide={setCurrentSlide}
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

      {/* ── No Credits Prompt ─────────────────────── */}
      {showNoCredits && (
        <div className="no-credits" onClick={handleNoCreditsClose}>
          <div className="no-credits__card" onClick={(e) => e.stopPropagation()}>
            <button
              className="no-credits__close"
              onClick={handleNoCreditsClose}
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M6 6L14 14M14 6L6 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            <div className="no-credits__icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" />
                <path d="M24 14V26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="24" cy="32" r="1.5" fill="currentColor" />
              </svg>
            </div>

            <h2 className="no-credits__title">You're out of exports</h2>
            <p className="no-credits__text">
              Watch a short ad to unlock <strong>{exportsPerAd} more exports</strong>. It only takes a few seconds and helps keep Carousel Studio free.
            </p>

            <div className="no-credits__actions">
              <button
                className="no-credits__btn-primary"
                onClick={handleWatchAd}
              >
                <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
                  <rect x="4" y="8" width="32" height="24" rx="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M17 15L26 20L17 25V15Z" fill="currentColor" />
                </svg>
                Watch a Short Ad
              </button>
              <button
                className="no-credits__btn-secondary"
                onClick={handleNoCreditsClose}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ad Gate Modal ──────────────────────────── */}
      {showAdGate && (
        <AdGateModal
          onComplete={handleAdGateComplete}
          onClose={handleAdGateClose}
          exportsPerAd={exportsPerAd}
        />
      )}
    </div>
  );
};

export default App;

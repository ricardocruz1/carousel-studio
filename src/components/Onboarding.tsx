import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Onboarding.css';

const ONBOARDING_KEY = 'carousel-studio-onboarding-done';

interface OnboardingStep {
  /** CSS selector for the target element to highlight (desktop only) */
  selector: string;
  /** Where to place the tooltip relative to the target */
  placement: 'bottom' | 'top' | 'right';
  /** Step title */
  title: string;
  /** Step description */
  desc: string;
  /** SVG icon JSX */
  icon: React.ReactNode;
}

const STEPS: OnboardingStep[] = [
  {
    selector: '.app__picker',
    placement: 'bottom',
    title: 'Choose a layout',
    desc: 'Start by picking a predefined carousel layout, or build your own custom one.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="2" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="12" y="2" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="12" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="12" y="12" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    selector: '.app__aspect-ratio',
    placement: 'bottom',
    title: 'Select aspect ratio',
    desc: 'Choose between Square (1:1), Portrait (4:5), or Landscape (1.91:1) for your carousel.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 9L11 12L14 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    selector: '.carousel-editor__canvas',
    placement: 'top',
    title: 'Add images to slots',
    desc: 'Click or tap each slot to add an image. You can also use batch upload to fill all slots at once.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="3" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="8" cy="9" r="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 15L7 11L11 15L15 11L20 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    selector: '.app__action-group:has(.app__btn--icon[aria-label="Add text"])',
    placement: 'bottom',
    title: 'Add text & shapes',
    desc: 'Use the toolbar to add text overlays and shapes. Drag them around, customize fonts, colors, and more.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M5 6V5H17V6M11 5V17M9 17H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    selector: '.app__btn--primary',
    placement: 'top',
    title: 'Export your carousel',
    desc: 'When you\'re happy with your design, hit Export to download all slides as individual images in a zip file.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 15V17.5C4 18.05 4.45 18.5 5 18.5H17C17.55 18.5 18 18.05 18 17.5V15M11 4V14M11 14L7.5 10.5M11 14L14.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

/** Check if onboarding has already been completed */
export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return true; // Can't use localStorage → skip onboarding
  }
}

/** Mark onboarding as completed */
function markOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // Ignore
  }
}

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  );
  const [tooltipPos, setTooltipPos] = useState<{
    top: number;
    left: number;
    arrow: 'top' | 'bottom' | 'left' | 'none';
  } | null>(null);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Position tooltip relative to target element (desktop only)
  const positionTooltip = useCallback(() => {
    if (isMobile) return;

    const step = STEPS[currentStep];
    const target = document.querySelector(step.selector);
    if (!target) {
      // Element not in DOM — use centered fallback
      setTooltipPos({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 160, arrow: 'none' });
      setSpotlightRect(null);
      return;
    }

    const rect = target.getBoundingClientRect();
    setSpotlightRect(rect);

    const padding = 12;
    const tooltipW = 300;

    let top: number;
    let left: number;
    let arrow: 'top' | 'bottom' | 'left' | 'none';

    if (step.placement === 'bottom') {
      top = rect.bottom + padding;
      left = rect.left;
      arrow = 'top';
    } else if (step.placement === 'top') {
      // We'll need to measure tooltip height; estimate 180px
      top = rect.top - padding - 180;
      left = rect.left;
      arrow = 'bottom';
    } else {
      // right
      top = rect.top;
      left = rect.right + padding;
      arrow = 'left';
    }

    // Clamp within viewport
    left = Math.max(12, Math.min(left, window.innerWidth - tooltipW - 12));
    top = Math.max(12, top);

    setTooltipPos({ top, left, arrow });
  }, [currentStep, isMobile]);

  useEffect(() => {
    positionTooltip();
    window.addEventListener('resize', positionTooltip);
    window.addEventListener('scroll', positionTooltip, true);
    return () => {
      window.removeEventListener('resize', positionTooltip);
      window.removeEventListener('scroll', positionTooltip, true);
    };
  }, [positionTooltip]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      markOnboardingDone();
      onComplete();
    }
  }, [currentStep, onComplete]);

  const handleSkip = useCallback(() => {
    markOnboardingDone();
    onComplete();
  }, [onComplete]);

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  // ─── Mobile: Bottom Sheet ──────────────────────────────
  if (isMobile) {
    return (
      <>
        <div className="onboarding-overlay" onClick={handleSkip} />
        <div className="onboarding-sheet">
          <div className="onboarding-sheet__handle" />
          <div className="onboarding-sheet__icon">{step.icon}</div>
          <div className="onboarding-sheet__step">Step {currentStep + 1} of {STEPS.length}</div>
          <h3 className="onboarding-sheet__title">{step.title}</h3>
          <p className="onboarding-sheet__desc">{step.desc}</p>
          <div className="onboarding-sheet__dots">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`onboarding-sheet__dot ${
                  i === currentStep
                    ? 'onboarding-sheet__dot--active'
                    : i < currentStep
                      ? 'onboarding-sheet__dot--done'
                      : ''
                }`}
              />
            ))}
          </div>
          <div className="onboarding-sheet__actions">
            <button className="onboarding-sheet__skip" onClick={handleSkip}>
              Skip
            </button>
            <button className="onboarding-sheet__next" onClick={handleNext}>
              {isLast ? 'Get Started' : 'Next'}
              {!isLast && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── Desktop: Positioned Tooltip ───────────────────────
  return (
    <>
      <div className="onboarding-overlay" onClick={handleSkip} />
      {spotlightRect && (
        <div
          className="onboarding-spotlight"
          style={{
            top: spotlightRect.top - 6,
            left: spotlightRect.left - 6,
            width: spotlightRect.width + 12,
            height: spotlightRect.height + 12,
          }}
        />
      )}
      {tooltipPos && (
        <div
          ref={tooltipRef}
          className="onboarding-tooltip"
          data-arrow={tooltipPos.arrow}
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
          }}
        >
          <div className="onboarding-tooltip__icon">{step.icon}</div>
          <div className="onboarding-tooltip__step">Step {currentStep + 1} of {STEPS.length}</div>
          <h3 className="onboarding-tooltip__title">{step.title}</h3>
          <p className="onboarding-tooltip__desc">{step.desc}</p>
          <div className="onboarding-tooltip__footer">
            <div className="onboarding-tooltip__dots">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`onboarding-tooltip__dot ${
                    i === currentStep
                      ? 'onboarding-tooltip__dot--active'
                      : i < currentStep
                        ? 'onboarding-tooltip__dot--done'
                        : ''
                  }`}
                />
              ))}
            </div>
            <div className="onboarding-tooltip__actions">
              <button className="onboarding-tooltip__skip" onClick={handleSkip}>
                Skip
              </button>
              <button className="onboarding-tooltip__next" onClick={handleNext}>
                {isLast ? 'Get Started' : 'Next'}
                {!isLast && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

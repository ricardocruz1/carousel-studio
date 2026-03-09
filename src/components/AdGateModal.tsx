import React, { useState, useEffect, useCallback, useRef } from 'react';
import './AdGateModal.css';

const COUNTDOWN_SECONDS = 5;

interface AdGateModalProps {
  onComplete: () => void;
  onClose: () => void;
}

export const AdGateModal: React.FC<AdGateModalProps> = ({
  onComplete,
  onClose,
}) => {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [canContinue, setCanContinue] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCanContinue(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleContinue = useCallback(() => {
    if (!canContinue) return;
    onComplete();
  }, [canContinue, onComplete]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="ad-gate" onClick={onClose}>
      <div className="ad-gate__card" onClick={(e) => e.stopPropagation()}>
        <button
          className="ad-gate__close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M6 6L14 14M14 6L6 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="ad-gate__header">
          <div className="ad-gate__icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="4" y="8" width="32" height="24" rx="4" stroke="currentColor" strokeWidth="2" />
              <path d="M17 15L26 20L17 25V15Z" fill="currentColor" />
            </svg>
          </div>
          <h2 className="ad-gate__title">Support Carousel Studio</h2>
          <p className="ad-gate__subtitle">
            Please wait a moment to unlock your export. This keeps the app free for everyone.
          </p>
        </div>

        {/* ── Ad Slot ────────────────────────────────── */}
        <div className="ad-gate__ad-container">
          {/*
            REPLACE THIS with your actual ad unit. Example for Google AdSense:

            <ins className="adsbygoogle"
              style={{ display: 'block', width: '300px', height: '250px' }}
              data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
              data-ad-slot="XXXXXXXXXX"
              data-ad-format="auto"
            />

            Then call (window as any).adsbygoogle?.push({}) in a useEffect.
          */}
          <div className="ad-gate__ad-placeholder">
            <span className="ad-gate__ad-label">Ad</span>
            <span className="ad-gate__ad-text">Your ad here</span>
            <span className="ad-gate__ad-size">300 x 250</span>
          </div>
        </div>

        {/* ── Countdown / Continue ───────────────────── */}
        <div className="ad-gate__footer">
          {canContinue ? (
            <button
              className="ad-gate__continue-btn"
              onClick={handleContinue}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 12.75V14.25C3 14.6642 3.16437 15.0613 3.45701 15.354C3.74964 15.6466 4.14775 15.811 4.5625 15.811H13.4375C13.8522 15.811 14.2504 15.6466 14.543 15.354C14.8356 15.0613 15 14.6642 15 14.25V12.75M9 3V11.25M9 11.25L12 8.25M9 11.25L6 8.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Continue to Export
            </button>
          ) : (
            <div className="ad-gate__countdown">
              <div className="ad-gate__countdown-ring">
                <svg viewBox="0 0 36 36">
                  <circle
                    className="ad-gate__countdown-bg"
                    cx="18" cy="18" r="15.5"
                  />
                  <circle
                    className="ad-gate__countdown-progress"
                    cx="18" cy="18" r="15.5"
                    style={{
                      strokeDashoffset: `${(countdown / COUNTDOWN_SECONDS) * 97.4}`,
                    }}
                  />
                </svg>
                <span className="ad-gate__countdown-number">{countdown}</span>
              </div>
              <span className="ad-gate__countdown-text">
                Your export unlocks in {countdown} second{countdown !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

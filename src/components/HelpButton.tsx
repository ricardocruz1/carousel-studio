import React, { useState, useEffect, useCallback } from 'react';
import './HelpButton.css';

const BALLOON_DISMISSED_KEY = 'carousel-studio-help-balloon-dismissed';

export const HelpButton: React.FC = () => {
  const [showBalloon, setShowBalloon] = useState(false);

  useEffect(() => {
    // Show the balloon on first visit (if not previously dismissed)
    const dismissed = localStorage.getItem(BALLOON_DISMISSED_KEY);
    if (!dismissed) {
      // Small delay so the button has rendered before balloon appears
      const timer = setTimeout(() => setShowBalloon(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissBalloon = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowBalloon(false);
    localStorage.setItem(BALLOON_DISMISSED_KEY, '1');
  }, []);

  const handleClick = useCallback(() => {
    setShowBalloon(false);
    localStorage.setItem(BALLOON_DISMISSED_KEY, '1');
    window.location.hash = '#/manual';
  }, []);

  return (
    <div className="help-button-wrapper">
      {showBalloon && (
        <div className="help-balloon">
          <span className="help-balloon__text">Need help? Check the manual</span>
          <button
            className="help-balloon__dismiss"
            onClick={dismissBalloon}
            aria-label="Dismiss"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="help-balloon__arrow" />
        </div>
      )}

      <button
        className="help-button"
        onClick={handleClick}
        title="Open user manual"
        aria-label="Open user manual"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M8.5 8.5C8.5 7.12 9.62 6 11 6C12.38 6 13.5 7.12 13.5 8.5C13.5 9.88 12.38 11 11 11V12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="11" cy="15.25" r="0.75" fill="currentColor"/>
        </svg>
      </button>
    </div>
  );
};

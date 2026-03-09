import { useState, useCallback, useEffect } from 'react';

const CONSENT_KEY = 'carousel-studio-cookie-consent';

export type ConsentStatus = 'pending' | 'accepted' | 'rejected';

/**
 * Manages cookie/ad consent state with localStorage persistence.
 * AdSense is only loaded after the user explicitly accepts.
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentStatus>(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored === 'accepted' || stored === 'rejected') return stored;
    } catch {
      // localStorage unavailable
    }
    return 'pending';
  });

  const accept = useCallback(() => {
    setConsent('accepted');
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch {
      // silently fail
    }
  }, []);

  const reject = useCallback(() => {
    setConsent('rejected');
    try {
      localStorage.setItem(CONSENT_KEY, 'rejected');
    } catch {
      // silently fail
    }
  }, []);

  // Load AdSense script only after consent is accepted
  useEffect(() => {
    if (consent !== 'accepted') return;

    // Don't inject twice
    if (document.querySelector('script[src*="adsbygoogle"]')) return;

    const script = document.createElement('script');
    script.async = true;
    script.src =
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2738398605135479';
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }, [consent]);

  return { consent, accept, reject };
}

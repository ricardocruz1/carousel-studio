import React from 'react';

interface CookieConsentBannerProps {
  onAccept: () => void;
  onReject: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  onAccept,
  onReject,
}) => {
  return (
    <div className="cookie-banner">
      <div className="cookie-banner__content">
        <p className="cookie-banner__text">
          We use cookies from Google AdSense to display ads and keep Carousel Studio free.
          No personal data is collected by us.{' '}
          <a href="#/privacy" className="cookie-banner__link">
            Privacy Policy
          </a>
        </p>
        <div className="cookie-banner__actions">
          <button className="cookie-banner__btn cookie-banner__btn--accept" onClick={onAccept}>
            Accept
          </button>
          <button className="cookie-banner__btn cookie-banner__btn--reject" onClick={onReject}>
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

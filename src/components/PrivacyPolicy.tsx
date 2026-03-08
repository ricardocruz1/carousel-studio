import React from 'react';
import './LegalPage.css';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="legal-page">
      <div className="legal-page__container">
        <button className="legal-page__back" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to App
        </button>

        <h1>Privacy Policy</h1>
        <p className="legal-page__updated">Last updated: March 8, 2026</p>

        <section>
          <h2>1. Introduction</h2>
          <p>
            Carousel Studio ("we", "us", "our") operates the website
            carouselstudio.pt (the "Service"). This Privacy Policy explains how
            we collect, use, and protect information when you use our Service.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <h3>2.1 Images You Upload</h3>
          <p>
            When you use Carousel Studio, you upload images to create carousel
            layouts. <strong>All image processing happens entirely in your
            browser.</strong> Your images are never uploaded to our servers. We
            do not store, transmit, or have access to any images you use in the
            app.
          </p>

          <h3>2.2 Local Storage</h3>
          <p>
            We use your browser's localStorage to save your export credit count.
            This data stays on your device and is not transmitted to us.
          </p>

          <h3>2.3 Advertising</h3>
          <p>
            We use Google AdSense to display advertisements. Google may collect
            and use data to personalize ads based on your browsing history. This
            is governed by Google's own privacy policy. You can opt out of
            personalized advertising by visiting{' '}
            <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
              Google Ads Settings
            </a>.
          </p>

          <h3>2.4 Cookies</h3>
          <p>
            We do not set cookies ourselves. However, Google AdSense and other
            third-party services may set cookies to serve and measure ads. You
            can manage cookie preferences through your browser settings.
          </p>
        </section>

        <section>
          <h2>3. How We Use Information</h2>
          <p>
            We use localStorage data solely to track your export credit balance
            within the app. We do not use any personal information for marketing,
            profiling, or any purpose beyond the basic functionality of the
            Service.
          </p>
        </section>

        <section>
          <h2>4. Data Sharing</h2>
          <p>
            We do not sell, trade, or transfer any user data to third parties.
            The only third-party service that may collect data through our site
            is Google AdSense, as described above.
          </p>
        </section>

        <section>
          <h2>5. Data Security</h2>
          <p>
            Since all image processing occurs locally in your browser and we do
            not collect personal data on our servers, there is minimal data
            security risk. Your images never leave your device.
          </p>
        </section>

        <section>
          <h2>6. Children's Privacy</h2>
          <p>
            Our Service is not directed to children under 13. We do not
            knowingly collect any personal information from children.
          </p>
        </section>

        <section>
          <h2>7. Your Rights (GDPR)</h2>
          <p>
            If you are located in the European Economic Area, you have the right
            to access, correct, or delete any personal data we hold about you.
            Since we do not store personal data on our servers, this primarily
            applies to data collected by Google AdSense. You can exercise your
            rights regarding Google's data collection through{' '}
            <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
              Google Ads Settings
            </a>{' '}
            or by contacting us.
          </p>
        </section>

        <section>
          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes
            will be posted on this page with an updated revision date.
          </p>
        </section>

        <section>
          <h2>9. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, contact us at:{' '}
            <a href="mailto:contact@carouselstudio.pt">contact@carouselstudio.pt</a>
          </p>
        </section>
      </div>
    </div>
  );
};

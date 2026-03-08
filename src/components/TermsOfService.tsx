import React from 'react';
import './LegalPage.css';

interface TermsOfServiceProps {
  onBack: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
  return (
    <div className="legal-page">
      <div className="legal-page__container">
        <button className="legal-page__back" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to App
        </button>

        <h1>Terms of Service</h1>
        <p className="legal-page__updated">Last updated: March 8, 2026</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using Carousel Studio at carouselstudio.pt (the
            "Service"), you agree to be bound by these Terms of Service. If you
            do not agree to these terms, do not use the Service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            Carousel Studio is a free, browser-based tool that allows you to
            create Instagram carousel layouts by arranging images across
            multiple slides and exporting them as PNG files. All processing
            happens locally in your browser.
          </p>
        </section>

        <section>
          <h2>3. User Content</h2>
          <p>
            You retain full ownership of all images and content you use with the
            Service. We do not claim any rights to your content. Since all
            processing is done locally in your browser, your images are never
            uploaded to or stored on our servers.
          </p>
          <p>
            You are solely responsible for ensuring you have the right to use
            any images you upload to the Service.
          </p>
        </section>

        <section>
          <h2>4. Export Credits and Advertising</h2>
          <p>
            The Service provides a limited number of free exports. Additional
            exports can be unlocked by viewing advertisements. This model allows
            us to keep the Service free for all users.
          </p>
          <p>
            Export credit balances are stored locally in your browser and may be
            lost if you clear your browser data. We are not responsible for lost
            credits.
          </p>
        </section>

        <section>
          <h2>5. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any illegal purpose</li>
            <li>Attempt to circumvent the export credit system</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Use automated tools to access the Service in a way that
                degrades performance for other users</li>
          </ul>
        </section>

        <section>
          <h2>6. Disclaimer of Warranties</h2>
          <p>
            The Service is provided "as is" without warranties of any kind,
            either express or implied. We do not guarantee that the Service will
            be uninterrupted, error-free, or meet your specific requirements.
          </p>
        </section>

        <section>
          <h2>7. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Carousel Studio shall not
            be liable for any indirect, incidental, special, or consequential
            damages arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2>8. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the
            Service after changes are posted constitutes acceptance of the
            revised Terms.
          </p>
        </section>

        <section>
          <h2>9. Governing Law</h2>
          <p>
            These Terms are governed by the laws of Portugal. Any disputes
            shall be resolved in the courts of Portugal.
          </p>
        </section>

        <section>
          <h2>10. Contact Us</h2>
          <p>
            If you have questions about these Terms, contact us at:{' '}
            <a href="mailto:contact@carouselstudio.pt">contact@carouselstudio.pt</a>
          </p>
        </section>
      </div>
    </div>
  );
};

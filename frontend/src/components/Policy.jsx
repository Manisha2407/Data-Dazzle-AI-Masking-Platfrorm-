import React from 'react';
import '../style/policy.css';

const Policy = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target.className === 'privacy-modal-overlay') {
      onClose();
    }
  };

  return (
    <div className="privacy-modal-overlay" onClick={handleOverlayClick}>
      <div className="privacy-modal-container">

        <div className="privacy-modal-content">
          <h2 className="privacy-modal-title">Privacy Policy</h2>
          <p className="privacy-modal-date">Last updated: February 28, 2025</p>

          <div className="privacy-modal-body">
            <section className="privacy-section">
              <h3>1. Information We Collect</h3>
              <p>
                When you use Data Dazzle, we collect information necessary to provide our PII redaction services:
              </p>
              <ul>
                <li><strong>Account Information:</strong> Username, email address and encrypted password</li>
                <li><strong>Document Data:</strong> Files and text you upload for redaction processing</li>
                <li><strong>Processing Metadata:</strong> Entity detection results, redaction statistics, and processing timestamps</li>
                <li><strong>Usage Data:</strong> Upload frequency, file types, and feature usage patterns</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h3>2. How We Use Your Information</h3>
              <p>
                We use collected information solely to:
              </p>
              <ul>
                <li>Process documents and detect personally identifiable information (PII)</li>
                <li>Generate redacted versions according to your selected method</li>
                <li>Maintain your account and document history</li>
                <li>Improve our NLP models and detection accuracy</li>
                <li>Enforce rate limits and prevent abuse</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h3>3. Data Security & Retention</h3>
              <p>
                Your privacy and data security are our top priorities:
              </p>
              <ul>
                <li><strong>Automatic Deletion:</strong> Original documents are automatically deleted 24 hours after upload</li>
                <li><strong>Encryption:</strong> All data is encrypted at rest and in transit using industry-standard protocols</li>
                <li><strong>Redacted Copies:</strong> Securely stored for your reference; you can delete them anytime</li>
                <li><strong>Access Control:</strong> Only you can access your documents; we never share with third parties</li>
                <li><strong>No Training Data:</strong> Your documents are never used to train AI models without explicit consent</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h3>4. Your Rights</h3>
              <p>
                You have complete control over your data:
              </p>
              <ul>
                <li><strong>Access:</strong> View all documents and data associated with your account</li>
                <li><strong>Export:</strong> Download your redacted documents at any time</li>
                <li><strong>Delete:</strong> Remove individual documents or your entire account</li>
                <li><strong>Opt-out:</strong> Decline optional data collection for service improvements</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h3>5. Rate Limiting & Quotas</h3>
              <p>
                To ensure fair usage and system stability:
              </p>
              <ul>
                <li>Free tier: 10 uploads per hour, reset hourly</li>
                <li>Rate limits protect against automated abuse</li>
                <li>Quota information visible in your dashboard</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h3>6. Cookies & Tracking</h3>
              <p>
                We use minimal tracking:
              </p>
              <ul>
                <li><strong>Authentication:</strong> Tokens stored locally for session management</li>
                <li><strong>Preferences:</strong> UI settings saved in browser localStorage</li>
                <li><strong>No Third-Party Tracking:</strong> We don't use analytics services that track across sites</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h3>7. Data Sharing</h3>
              <p>
                We do not sell, rent, or share your data with third parties. Your documents and personal information remain private. The only exception is if required by law enforcement with a valid legal request.
              </p>
            </section>

            <section className="privacy-section">
              <h3>8. Children's Privacy</h3>
              <p>
                Data Dazzle is not intended for users under 13 years of age. We do not knowingly collect information from children.
              </p>
            </section>

            <section className="privacy-section">
              <h3>9. Changes to This Policy</h3>
              <p>
                We may update this privacy policy periodically. Significant changes will be communicated via email or dashboard notification. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section className="privacy-section">
              <h3>10. Contact Us</h3>
              <p>
                Questions or concerns about privacy?
              </p>
              <ul>
                <li>Email: proxius31@gmail.com</li>
                <li>Support: proxius31@gmail.com</li>
              </ul>
            </section>

            <div className="privacy-footer">
              <p>
                By using Data Dazzle, you acknowledge that you have read and understood this Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Policy;

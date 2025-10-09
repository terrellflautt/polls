import React from 'react';
import './Footer.css';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>SnapIT Suite</h3>
          <ul>
            <li><a href="https://snapitsoftware.com" target="_blank" rel="noopener noreferrer">SnapIT Software</a></li>
            <li><a href="https://snapitforms.com" target="_blank" rel="noopener noreferrer">SnapIT Forms</a></li>
            <li><a href="https://snapitanalytics.com" target="_blank" rel="noopener noreferrer">SnapIT Analytics</a></li>
            <li><a href="https://snapitagent.com" target="_blank" rel="noopener noreferrer">SnapIT Agent</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Tools & Utilities</h3>
          <ul>
            <li><a href="https://burn.snapitsoftware.com" target="_blank" rel="noopener noreferrer">SnapIT Burn</a></li>
            <li><a href="https://polls.snapitsoftware.com" target="_blank" rel="noopener noreferrer">SnapIT Polls</a></li>
            <li><a href="https://snapitqr.com" target="_blank" rel="noopener noreferrer">SnapIT QR</a></li>
            <li><a href="https://snapiturl.com" target="_blank" rel="noopener noreferrer">SnapIT URL</a></li>
            <li><a href="https://urlstatuschecker.com" target="_blank" rel="noopener noreferrer">URL Status Checker</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Resources</h3>
          <ul>
            <li><a href="https://pdf.snapitsoftware.com" target="_blank" rel="noopener noreferrer">PDF Tools</a></li>
            <li><a href="https://chimera.snapitsoftware.com" target="_blank" rel="noopener noreferrer">Chimera</a></li>
            <li><a href="https://forum.snapitsoftware.com" target="_blank" rel="noopener noreferrer">SnapIT Forum</a></li>
            <li><a href="https://forums.snapitsoftware.com" target="_blank" rel="noopener noreferrer">Forum Builder</a></li>
            <li><a href="https://api.snapitsoftware.com" target="_blank" rel="noopener noreferrer">API Documentation</a></li>
            <li><a href="https://snapitsoft.com" target="_blank" rel="noopener noreferrer">SnapIT Soft</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Legal & Support</h3>
          <ul>
            <li><a href="/terms">Terms of Service</a></li>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/feedback">Send Feedback</a></li>
          </ul>
          <p className="footer-description">
            Create and share polls instantly. Get real-time results and insights.
          </p>
          <p className="footer-copyright">
            © 2025 SnapIT Software. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

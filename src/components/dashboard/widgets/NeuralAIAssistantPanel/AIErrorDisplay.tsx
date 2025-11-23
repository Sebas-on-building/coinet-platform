import React from 'react';
import styles from './design.module.css';

export const AIErrorDisplay: React.FC<{ error: string }> = ({ error }) => (
  <div className={styles['error-display']} role="alert" aria-live="assertive">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={styles['error-icon']} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="url(#errorGradient)" />
      <path d="M12 8v4m0 4h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="errorGradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff4e50" />
          <stop offset="1" stopColor="#fc913a" />
        </linearGradient>
      </defs>
    </svg>
    <span className={styles['error-text']}>{error}</span>
  </div>
); 
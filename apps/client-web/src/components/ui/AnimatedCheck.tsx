import React from 'react';

export function AnimatedCheck({ show }: { show: boolean }) {
  return show ? (
    <svg width="48" height="48" viewBox="0 0 48 48" style={{ display: 'block', margin: 'auto' }}>
      <circle cx="24" cy="24" r="22" fill="#e6f7ff" stroke="#0e76fd" strokeWidth="2" />
      <polyline
        points="16,24 22,30 32,18"
        fill="none"
        stroke="#0e76fd"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 32, strokeDashoffset: 0, transition: 'stroke-dashoffset 0.5s' }}
      />
    </svg>
  ) : null;
} 
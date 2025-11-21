import React from 'react';
// For production, use a confetti library like react-confetti
export function Confetti() {
  return <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9999 }}>🎉</div>;
} 
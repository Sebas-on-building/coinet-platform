import React from "react";

export const ChartGlowEffects: React.FC<{ color?: string; intensity?: number; children?: React.ReactNode }> = ({ color = "#7F5FFF", intensity = 0.7, children }) => {
  return (
    <div style={{ position: "relative", zIndex: 0 }}>
      <svg
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}
        width="100%"
        height="100%"
      >
        <defs>
          <radialGradient id="glow-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity={intensity} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#glow-gradient)" />
      </svg>
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}; 
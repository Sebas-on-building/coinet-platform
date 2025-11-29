import React from "react";

export const AnimatedParticlesBG: React.FC = () => {
  // Simple SVG particles, can be replaced with canvas/WebGL for more effects
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}>
      <circle cx="20%" cy="30%" r="32" fill="var(--color-primary)" opacity="0.08">
        <animate attributeName="cy" values="30%;40%;30%" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle cx="70%" cy="60%" r="24" fill="var(--color-accent)" opacity="0.10">
        <animate attributeName="cx" values="70%;80%;70%" dur="8s" repeatCount="indefinite" />
      </circle>
      <circle cx="50%" cy="80%" r="18" fill="var(--color-secondary)" opacity="0.10">
        <animate attributeName="cy" values="80%;70%;80%" dur="7s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}; 
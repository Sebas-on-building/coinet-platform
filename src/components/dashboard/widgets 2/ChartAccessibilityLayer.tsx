import React from "react";

export const ChartAccessibilityLayer: React.FC = () => {
  return (
    <div
      tabIndex={0}
      aria-label="Chart area"
      role="region"
      style={{ outline: "none", position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 10 }}
      onKeyDown={e => {
        // Keyboard navigation logic here
      }}
    >
      {/* Screen reader only text */}
      <span style={{ position: "absolute", left: -9999, top: "auto", width: 1, height: 1, overflow: "hidden" }}>
        Use arrow keys to navigate chart data. Press Enter to select a data point.
      </span>
    </div>
  );
}; 
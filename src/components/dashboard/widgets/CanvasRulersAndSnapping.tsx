import React from "react";

export const CanvasRulersAndSnapping: React.FC<{ dragging: boolean; x?: number; y?: number }> = ({ dragging, x, y }) => {
  return (
    <>
      {/* Top ruler */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 24, background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", zIndex: 2, display: "flex" }}>
        {[...Array(27)].map((_, i) => (
          <div key={i} style={{ width: 24, height: "100%", borderRight: i % 5 === 0 ? "2px solid var(--color-border)" : "1px solid var(--color-border)", opacity: i % 5 === 0 ? 0.5 : 0.2 }} />
        ))}
      </div>
      {/* Left ruler */}
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 24, background: "var(--color-surface)", borderRight: "1px solid var(--color-border)", zIndex: 2, display: "flex", flexDirection: "column" }}>
        {[...Array(17)].map((_, i) => (
          <div key={i} style={{ height: 24, width: "100%", borderBottom: i % 5 === 0 ? "2px solid var(--color-border)" : "1px solid var(--color-border)", opacity: i % 5 === 0 ? 0.5 : 0.2 }} />
        ))}
      </div>
      {/* Snapping guides (show only when dragging) */}
      {dragging && x !== undefined && y !== undefined && (
        <>
          <div style={{ position: "absolute", left: x, top: 24, bottom: 0, width: 2, background: "var(--color-primary)", opacity: 0.3, zIndex: 3 }} />
          <div style={{ position: "absolute", top: y, left: 24, right: 0, height: 2, background: "var(--color-primary)", opacity: 0.3, zIndex: 3 }} />
        </>
      )}
    </>
  );
}; 
import React from "react";

export const ChartGridLines: React.FC<{
  rows?: number;
  cols?: number;
  width?: number;
  height?: number;
  color?: string;
}> = ({ rows = 4, cols = 6, width = 640, height = 400, color = "#E5E7EB" }) => {
  const rowLines = Array.from({ length: rows + 1 }, (_, i) => (
    <line
      key={`row-${i}`}
      x1={0}
      y1={(height / rows) * i}
      x2={width}
      y2={(height / rows) * i}
      stroke={color}
      strokeDasharray="4 4"
      strokeWidth={1}
      opacity={0.5}
    />
  ));
  const colLines = Array.from({ length: cols + 1 }, (_, i) => (
    <line
      key={`col-${i}`}
      x1={(width / cols) * i}
      y1={0}
      x2={(width / cols) * i}
      y2={height}
      stroke={color}
      strokeDasharray="4 4"
      strokeWidth={1}
      opacity={0.5}
    />
  ));
  return (
    <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0, zIndex: 2, pointerEvents: "none" }} aria-hidden="true">
      {rowLines}
      {colLines}
    </svg>
  );
}; 
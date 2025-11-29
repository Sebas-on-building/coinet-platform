import React from "react";

export const ChartAxis: React.FC<{
  width?: number;
  height?: number;
  minY?: number;
  maxY?: number;
  ticks?: number;
  color?: string;
}> = ({ width = 640, height = 400, minY = 0, maxY = 100, ticks = 4, color = "#A1A1AA" }) => {
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) => minY + ((maxY - minY) * i) / ticks);
  return (
    <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0, zIndex: 3, pointerEvents: "none" }} aria-hidden="true">
      {tickValues.map((v, i) => (
        <g key={i}>
          <text
            x={0}
            y={height - (height / ticks) * i - 8}
            fill={color}
            fontSize={13}
            fontWeight={500}
            textAnchor="start"
            style={{ userSelect: "none" }}
          >
            {v.toFixed(0)}
          </text>
          <line
            x1={32}
            y1={height - (height / ticks) * i}
            x2={width}
            y2={height - (height / ticks) * i}
            stroke={color}
            strokeDasharray="2 4"
            strokeWidth={1}
            opacity={0.18}
          />
        </g>
      ))}
    </svg>
  );
}; 
import React from "react";
import { ChartCanvasSurface } from "./ChartCanvasSurface";
import { ChartGridLines } from "./ChartGridLines";
import { ChartAxis } from "./ChartAxis";

export const ChartRenderer: React.FC<{
  width?: number;
  height?: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  overlays?: React.ReactNode[];
  children?: React.ReactNode;
}> = ({ width = 640, height = 400, draw, overlays = [], children }) => {
  return (
    <div style={{ position: "relative", width, height, borderRadius: 16, overflow: "hidden" }}>
      <ChartGridLines width={width} height={height} />
      <ChartAxis width={width} height={height} />
      <ChartCanvasSurface width={width} height={height} draw={draw} />
      {overlays.map((o, i) => (
        <React.Fragment key={i}>{o}</React.Fragment>
      ))}
      {children}
    </div>
  );
}; 
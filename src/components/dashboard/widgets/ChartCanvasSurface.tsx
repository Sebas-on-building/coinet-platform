import React, { useRef, useEffect } from "react";

export const ChartCanvasSurface: React.FC<{
  width?: number;
  height?: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}> = ({ width = 640, height = 400, draw }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    draw(ctx, width, height);
  }, [draw, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 16,
        background: "var(--color-surface)",
        boxShadow: "0 2px 16px 0 rgba(24,25,43,0.10)",
        display: "block",
      }}
      aria-label="Chart canvas surface"
    />
  );
}; 
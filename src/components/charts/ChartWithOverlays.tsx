import React, { useState } from "react";
import { ChartOverlay, Overlay } from "./ChartOverlay";
import { motion } from "framer-motion";

interface ChartWithOverlaysProps {
  data: { x: number; y: number }[];
  overlays: Overlay[];
  width?: number;
  height?: number;
  controls?: React.ReactNode;
  children?: React.ReactNode; // For custom chart layers
}

/**
 * ChartWithOverlays: Composes a base chart and overlays
 * Supports advanced controls, overlays, and micro-interactions
 * Apple/Canva/TradingView/Solana design
 */
export function ChartWithOverlays({ data, overlays, width = 420, height = 180, controls, children }: ChartWithOverlaysProps) {
  // Chart state (timeframe, type, overlays, etc.) can be managed here
  return (
    <div style={{ position: "relative", width, height, background: "var(--widgetarea-bg, #18192b)", borderRadius: 16, boxShadow: "0 2px 12px 0 rgba(0,0,0,0.10)", overflow: "hidden" }}>
      {/* Chart controls */}
      {controls && <div style={{ position: "absolute", top: 8, right: 8, zIndex: 20 }}>{controls}</div>}
      {/* Base chart (simple line for demo) */}
      <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}>
        <polyline
          fill="none"
          stroke="#00ffa3"
          strokeWidth={3}
          points={data.map((d, i) => `${(d.x / 1) * width},${height - (d.y / 1) * height}`).join(" ")}
        />
      </svg>
      {/* Overlays */}
      <ChartOverlay overlays={overlays} width={width} height={height} />
      {/* Custom children (e.g., tooltips, markers) */}
      {children}
    </div>
  );
} 
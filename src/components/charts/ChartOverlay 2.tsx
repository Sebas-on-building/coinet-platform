import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, Smile, Frown, Edit3, User } from "lucide-react";

export interface Overlay {
  type: "ai" | "anomaly" | "news" | "sentiment" | "annotation" | "custom";
  label: string;
  x: number; // x position (0-1, relative)
  y?: number; // y position (0-1, relative, optional)
  color?: string;
  icon?: React.ReactNode;
  pulse?: boolean;
  confidence?: number;
  details?: string;
  impact?: "positive" | "negative" | "neutral";
  source?: string;
  userId?: string;
  userAvatar?: string;
}

interface ChartOverlayProps {
  overlays: Overlay[];
  width: number;
  height: number;
}

/**
 * ChartOverlay: Modular, animated overlay system for charts
 * Supports AI, anomaly, news, sentiment, annotation overlays, and more
 * Apple/Canva/TradingView/Solana design
 */
export function ChartOverlay({ overlays, width, height }: ChartOverlayProps) {
  // Tooltip state
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 10 }}>
      <AnimatePresence>
        {overlays.map((ov, i) => {
          // Overlay icon logic
          let icon = ov.icon;
          if (!icon) {
            if (ov.type === "news") icon = <Newspaper className="w-4 h-4 text-blue-400" />;
            if (ov.type === "sentiment") icon = ov.impact === "positive" ? <Smile className="w-4 h-4 text-green-400" /> : ov.impact === "negative" ? <Frown className="w-4 h-4 text-red-400" /> : <Smile className="w-4 h-4 text-yellow-400" />;
            if (ov.type === "annotation") icon = ov.userAvatar ? <image href={ov.userAvatar} width={20} height={20} /> : <Edit3 className="w-4 h-4 text-fuchsia-400" />;
          }
          // Overlay color logic
          let color = ov.color;
          if (!color) {
            if (ov.type === "news") color = "#0057ff";
            if (ov.type === "sentiment") color = ov.impact === "positive" ? "#10b981" : ov.impact === "negative" ? "#ef4444" : "#fbbf24";
            if (ov.type === "annotation") color = "#a21caf";
          }
          return (
            <motion.g
              key={ov.label + i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.32, type: "spring" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer", pointerEvents: "auto" }}
            >
              {/* Pulse for live overlays */}
              {ov.pulse && (
                <motion.circle
                  cx={ov.x * width}
                  cy={ov.y !== undefined ? ov.y * height : height / 2}
                  r={18}
                  fill={color}
                  opacity={0.18}
                  animate={{ scale: [1, 1.18, 1], opacity: [0.18, 0.32, 0.18] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                />
              )}
              {/* Main marker */}
              <circle
                cx={ov.x * width}
                cy={ov.y !== undefined ? ov.y * height : height / 2}
                r={10}
                fill={color}
                stroke="#fff"
                strokeWidth={2}
                filter="url(#shadow)"
              />
              {/* Icon or label */}
              {icon ? (
                <foreignObject x={ov.x * width - 12} y={(ov.y !== undefined ? ov.y * height : height / 2) - 12} width={24} height={24} style={{ pointerEvents: "auto" }}>
                  <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
                </foreignObject>
              ) : (
                <text
                  x={ov.x * width}
                  y={(ov.y !== undefined ? ov.y * height : height / 2) + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#fff"
                  fontWeight={700}
                  style={{ pointerEvents: "auto" }}
                >
                  {ov.label}
                </text>
              )}
              {/* Animated tooltip for overlay */}
              <AnimatePresence>
                {hovered === i && (
                  <motion.foreignObject
                    x={ov.x * width + 16}
                    y={(ov.y !== undefined ? ov.y * height : height / 2) - 32}
                    width={220}
                    height={80}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18 }}
                    style={{ pointerEvents: "auto", zIndex: 100 }}
                  >
                    <div
                      className="rounded-xl shadow-xl px-4 py-2 text-xs font-semibold"
                      style={{
                        background: "rgba(24,25,43,0.98)",
                        color: "#fff",
                        border: `1.5px solid ${color}`,
                        minWidth: 180,
                        maxWidth: 210,
                        pointerEvents: "auto",
                      }}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        {icon}
                        <span>{ov.label}</span>
                        {ov.source && <span className="ml-auto text-blue-300">{ov.source}</span>}
                      </div>
                      {ov.details && <div className="mb-1">{ov.details}</div>}
                      {ov.confidence !== undefined && (
                        <div className="text-xs text-blue-200">Confidence: {Math.round(ov.confidence * 100)}%</div>
                      )}
                      {ov.userId && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-fuchsia-300">
                          <User className="w-3 h-3" /> {ov.userId}
                        </div>
                      )}
                    </div>
                  </motion.foreignObject>
                )}
              </AnimatePresence>
            </motion.g>
          );
        })}
      </AnimatePresence>
      {/* SVG filter for shadow */}
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0057ff" floodOpacity="0.18" />
        </filter>
      </defs>
    </svg>
  );
} 
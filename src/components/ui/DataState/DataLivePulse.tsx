import React from "react";
import { useTheme } from "@/themes/ThemeProvider";
import { motion } from "framer-motion";

/**
 * DataLivePulse: Animated, theme-aware live data pulse indicator
 * Inspired by Solana, TradingView, Apple
 */
export const DataLivePulse: React.FC = () => {
  const { colors } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <motion.span
        animate={{ scale: [1, 1.4, 1] }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
        style={{
          display: "inline-block",
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "var(--color-success)",
          boxShadow: "0 0 0 0 rgba(16,185,129,0.4)",
        }}
        aria-label="Live"
      />
      <span style={{ color: "var(--color-success)", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>Live</span>
    </div>
  );
}; 
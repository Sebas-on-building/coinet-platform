import React from "react";
import { useTheme } from "@/themes/ThemeProvider";
import { motion } from "framer-motion";

/**
 * DataLoader: Animated, theme-aware loader for data fetching states
 * Inspired by Apple, Canva, TradingView, and Solana
 */
export const DataLoader: React.FC = () => {
  const { colors } = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 120 }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
        style={{
          width: 36,
          height: 36,
          border: "4px solid var(--color-border)",
          borderTop: `4px solid var(--color-primary)`,
          borderRadius: "50%",
          marginBottom: 16,
        }}
        aria-label="Loading"
        role="status"
      />
      <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>Loading…</span>
    </div>
  );
}; 
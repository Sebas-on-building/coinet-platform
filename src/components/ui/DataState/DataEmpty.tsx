import React from "react";
import { useTheme } from "@/themes/ThemeProvider";
import { motion } from "framer-motion";

interface DataEmptyProps {
  message?: string;
}

/**
 * DataEmpty: Animated, theme-aware empty state for data fetching
 * Inspired by Apple, Canva, TradingView, and Solana
 */
export const DataEmpty: React.FC<DataEmptyProps> = ({ message = "No data available." }) => {
  const { colors } = useTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 120,
        color: "var(--color-text-secondary)",
      }}
      role="status"
      aria-live="polite"
    >
      <svg width="32" height="32" fill="none" viewBox="0 0 32 32" style={{ marginBottom: 12 }}><circle cx="16" cy="16" r="16" fill="var(--color-primary)" fillOpacity="0.10" /><path d="M10 16h12" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" /></svg>
      <span style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-medium)" }}>{message}</span>
    </motion.div>
  );
}; 
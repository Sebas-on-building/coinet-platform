import React from "react";
import { useTheme } from "@/themes/ThemeProvider";
import { motion } from "framer-motion";

interface DataReconnectProps {
  onReconnect: () => void;
}

/**
 * DataReconnect: Animated, theme-aware reconnecting state for data fetching
 * Inspired by Apple, Canva, TradingView, and Solana
 */
export const DataReconnect: React.FC<DataReconnectProps> = ({ onReconnect }) => {
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
        color: "var(--color-warning)",
      }}
      role="alert"
      aria-live="polite"
    >
      <svg width="32" height="32" fill="none" viewBox="0 0 32 32" style={{ marginBottom: 12 }}><circle cx="16" cy="16" r="16" fill="var(--color-warning)" fillOpacity="0.12" /><path d="M16 10v6m0 4h.01" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-bold)", marginBottom: 8 }}>Connection lost</span>
      <button onClick={onReconnect} style={{ color: "var(--color-primary)", background: "none", border: "none", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", cursor: "pointer", marginTop: 8 }}>Reconnect</button>
    </motion.div>
  );
}; 
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export const ChartLegend: React.FC<{ items?: { label: string; color: string }[]; visible?: boolean }> = ({ items = [{ label: "Price", color: "#7F5FFF" }], visible = true }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: 16,
            right: 24,
            background: "var(--color-surface)",
            borderRadius: 8,
            boxShadow: "0 2px 8px 0 rgba(24,25,43,0.10)",
            padding: "6px 16px",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text)",
            zIndex: 20,
            display: "flex",
            gap: 16,
            alignItems: "center",
            border: "1px solid var(--color-border)",
          }}
          aria-label="Chart legend"
        >
          {items.map((item, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 6, background: item.color, display: "inline-block" }} />
              {item.label}
            </span>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 
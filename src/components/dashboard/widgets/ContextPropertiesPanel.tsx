import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ContextPropertiesPanelProps {
  open: boolean;
  type?: "chart" | "text";
  onClose: () => void;
}

export const ContextPropertiesPanel: React.FC<ContextPropertiesPanelProps> = ({ open, type, onClose }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          style={{
            background: "var(--color-surface)",
            borderLeft: "1px solid var(--color-border)",
            minWidth: 240,
            maxWidth: 320,
            padding: 24,
            boxShadow: "-2px 0 8px 0 rgba(24,25,43,0.04)",
            height: "100%",
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <button
            aria-label="Close properties panel"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-text-secondary)",
              fontSize: 20,
              position: "absolute",
              top: 16,
              right: 16,
              cursor: "pointer",
            }}
          >×</button>
          <h3 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", margin: 0, marginBottom: 16 }}>Properties</h3>
          {type === "chart" && <div>Chart controls (color, data, style, etc.)</div>}
          {type === "text" && <div>Text controls (font, size, color, etc.)</div>}
          {!type && <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>No selection</div>}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}; 
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export const ChartTooltip: React.FC<{ visible?: boolean; content?: React.ReactNode; x?: number; y?: number }> = ({ visible = false, content = null, x = 0, y = 0 }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: x,
            top: y,
            background: "var(--color-surface)",
            color: "var(--color-text)",
            borderRadius: 10,
            boxShadow: "0 4px 24px 0 rgba(24,25,43,0.12)",
            padding: "10px 16px",
            fontSize: 14,
            fontWeight: 500,
            pointerEvents: "none",
            zIndex: 99,
            minWidth: 120,
            maxWidth: 320,
            border: "1px solid var(--color-border)",
            backdropFilter: "blur(8px)",
          }}
          aria-live="polite"
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 
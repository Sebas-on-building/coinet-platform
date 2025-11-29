import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export const ChartSelectionHandles: React.FC<{ visible?: boolean; x?: number; y?: number }> = ({ visible = false, x = 100, y = 100 }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: x - 12,
            top: y - 12,
            width: 24,
            height: 24,
            borderRadius: 12,
            background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
            boxShadow: "0 2px 12px 0 rgba(127,95,255,0.18)",
            border: "2px solid var(--color-background)",
            zIndex: 100,
            pointerEvents: "none",
          }}
          aria-label="Selection handle"
        />
      )}
    </AnimatePresence>
  );
}; 
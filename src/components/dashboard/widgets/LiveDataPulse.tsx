import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export const LiveDataPulse: React.FC<{ active?: boolean }> = ({ active = true }) => (
  <AnimatePresence>
    {active && (
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.7 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          background: "radial-gradient(circle, #10b981 60%, transparent 100%)",
          boxShadow: "0 0 0 4px rgba(16,185,129,0.18)",
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 30,
        }}
        aria-label="Live data pulse"
      />
    )}
  </AnimatePresence>
); 
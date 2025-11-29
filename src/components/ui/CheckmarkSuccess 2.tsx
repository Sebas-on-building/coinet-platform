import React from "react";
import { motion } from "framer-motion";

export const CheckmarkSuccess: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      aria-live="polite"
    >
      <svg
        width="96"
        height="96"
        viewBox="0 0 96 96"
        className="drop-shadow-xl"
      >
        <circle
          cx="48"
          cy="48"
          r="46"
          fill="#22c55e"
          fillOpacity="0.15"
          stroke="#22c55e"
          strokeWidth="4"
        />
        <motion.path
          d="M30 50 L44 64 L68 36"
          fill="none"
          stroke="#22c55e"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      </svg>
    </motion.div>
  );
};

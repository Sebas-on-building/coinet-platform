import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TOOL_LIST = [
  { id: "select", icon: "🖱️", label: "Select" },
  { id: "move", icon: "✋", label: "Move" },
  { id: "draw", icon: "✏️", label: "Draw" },
  { id: "chart", icon: "📈", label: "Chart" },
  { id: "text", icon: "🅰️", label: "Text" },
  { id: "more", icon: "⋯", label: "More" },
];

export const NeuralToolbar: React.FC<{ context?: string }> = ({ context }) => {
  const [activeTool, setActiveTool] = useState("select");
  // In a real app, track usage frequency and adapt order
  return (
    <motion.div
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{
        position: "absolute",
        top: 48,
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--color-surface)",
        borderRadius: 16,
        boxShadow: "0 2px 16px 0 rgba(24,25,43,0.10)",
        padding: "8px 20px",
        display: "flex",
        gap: 12,
        zIndex: 10,
        alignItems: "center",
      }}
      aria-label="Neural Toolbar"
    >
      {TOOL_LIST.map(tool => (
        <button
          key={tool.id}
          aria-label={tool.label}
          onClick={() => setActiveTool(tool.id)}
          style={{
            background: activeTool === tool.id ? "var(--color-primary)" : "none",
            color: activeTool === tool.id ? "var(--color-background)" : "var(--color-text)",
            border: "none",
            borderRadius: 8,
            fontSize: 20,
            padding: "8px 12px",
            cursor: "pointer",
            transition: "background 0.18s, color 0.18s",
          }}
        >
          {tool.icon}
        </button>
      ))}
    </motion.div>
  );
}; 
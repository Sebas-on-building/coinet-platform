import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export const NeuralToolbar2: React.FC<{
  visible?: boolean;
  onAI?: () => void;
  onVoice?: () => void;
  onGesture?: () => void;
  onCollab?: () => void;
}> = ({ visible = true, onAI, onVoice, onGesture, onCollab }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{
            position: "fixed",
            left: "50%",
            bottom: 32,
            transform: "translateX(-50%)",
            zIndex: 200,
            background: "linear-gradient(90deg, #7F5FFF 0%, #10b981 100%)",
            boxShadow: "0 8px 40px 0 rgba(127,95,255,0.18)",
            borderRadius: 18,
            padding: "10px 32px",
            display: "flex",
            gap: 24,
            alignItems: "center",
            minHeight: 48,
            border: "1.5px solid var(--color-border)",
            backdropFilter: "blur(12px)",
          }}
          aria-label="Neural Toolbar"
        >
          <button onClick={onAI} style={{ background: "none", border: "none", color: "#fff", fontWeight: 600, fontSize: 16, cursor: "pointer", padding: "8px 16px", borderRadius: 10, transition: "background 0.18s", boxShadow: "0 2px 8px 0 rgba(127,95,255,0.10)" }}>AI</button>
          <button onClick={onVoice} style={{ background: "none", border: "none", color: "#fff", fontWeight: 600, fontSize: 16, cursor: "pointer", padding: "8px 16px", borderRadius: 10, transition: "background 0.18s" }}>Voice</button>
          <button onClick={onGesture} style={{ background: "none", border: "none", color: "#fff", fontWeight: 600, fontSize: 16, cursor: "pointer", padding: "8px 16px", borderRadius: 10, transition: "background 0.18s" }}>Gesture</button>
          <button onClick={onCollab} style={{ background: "none", border: "none", color: "#fff", fontWeight: 600, fontSize: 16, cursor: "pointer", padding: "8px 16px", borderRadius: 10, transition: "background 0.18s" }}>Collab</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 
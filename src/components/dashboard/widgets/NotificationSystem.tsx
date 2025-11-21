import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const NotificationSystem: React.FC = () => {
  const [open, setOpen] = useState(false);
  const notifications = [
    { id: 1, type: "info", message: "Chart added successfully." },
    { id: 2, type: "warning", message: "Data source disconnected." },
  ];
  return (
    <div style={{ position: "absolute", top: 24, right: 32, zIndex: 20 }}>
      <button
        aria-label="Notifications"
        onClick={() => setOpen(o => !o)}
        style={{
          background: "var(--color-surface)",
          border: "none",
          borderRadius: 12,
          boxShadow: "0 2px 8px 0 rgba(24,25,43,0.10)",
          padding: 8,
          position: "relative",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 22 }}>🔔</span>
        <span style={{ position: "absolute", top: 4, right: 4, width: 10, height: 10, background: "var(--color-error)", borderRadius: "50%", border: "2px solid var(--color-surface)", display: notifications.length ? "block" : "none" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: 44,
              right: 0,
              minWidth: 240,
              background: "var(--color-surface)",
              borderRadius: 16,
              boxShadow: "0 4px 24px 0 rgba(24,25,43,0.14)",
              padding: 16,
              zIndex: 30,
            }}
            aria-label="Notifications"
          >
            <h4 style={{ margin: 0, marginBottom: 12, fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-bold)" }}>Notifications</h4>
            {notifications.length === 0 && <div style={{ color: "var(--color-text-secondary)" }}>No notifications</div>}
            {notifications.map(n => (
              <div key={n.id} style={{ marginBottom: 8, color: n.type === "warning" ? "var(--color-warning)" : "var(--color-text)" }}>{n.message}</div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 
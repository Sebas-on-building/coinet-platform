import React from "react";
import type { LsonNotification } from "@/contexts/NotificationContext";
import { motion } from "framer-motion";

interface AISummaryProps {
  notifications: LsonNotification[];
}

export const AISummary: React.FC<AISummaryProps> = ({ notifications }) => {
  // Simple summary logic (replace with AI API call for advanced)
  const now = Date.now();
  const last24h = notifications.filter(n => now - n.createdAt < 1000 * 60 * 60 * 24);
  const counts = {
    comment: last24h.filter(n => n.type === "comment").length,
    reply: last24h.filter(n => n.type === "reply").length,
    mention: last24h.filter(n => n.type === "mention").length,
    resolve: last24h.filter(n => n.type === "resolve").length,
  };
  const total = last24h.length;

  let summary = "No new notifications in the last 24h.";
  if (total > 0) {
    const parts = [];
    if (counts.comment) parts.push(`${counts.comment} new comment${counts.comment > 1 ? "s" : ""}`);
    if (counts.reply) parts.push(`${counts.reply} repl${counts.reply > 1 ? "ies" : "y"}`);
    if (counts.mention) parts.push(`${counts.mention} mention${counts.mention > 1 ? "s" : ""}`);
    if (counts.resolve) parts.push(`${counts.resolve} resolved`);
    summary = parts.join(", ");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className="mb-3 p-3 rounded-xl bg-gradient-to-r from-blue-800/80 via-blue-900/80 to-blue-950/80 text-blue-100 font-semibold shadow-lg flex items-center gap-2"
      aria-live="polite"
    >
      <span className="text-xl">🤖</span>
      <span>{summary}</span>
    </motion.div>
  );
}; 
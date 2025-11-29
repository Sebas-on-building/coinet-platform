import React, { useState } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { NotificationPopover } from "./NotificationPopover";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationBellProps {
  userId: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const { unreadCount } = useNotifications(userId);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <motion.button
        className="relative flex items-center justify-center w-10 h-10 rounded-full bg-blue-900/60 hover:bg-blue-800/80 focus:bg-blue-700/90 shadow transition outline-none"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.96 }}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        onClick={() => setOpen((v) => !v)}
        tabIndex={0}
      >
        <span style={{ fontSize: 24, lineHeight: 1 }} aria-hidden>🔔</span>
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="unread"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-pink-500 text-white text-xs font-bold shadow-lg border-2 border-blue-900 animate-pulse"
              aria-label={`${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`}
            >
              {unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <NotificationPopover open={open} onClose={() => setOpen(false)} userId={userId} />
    </div>
  );
}; 
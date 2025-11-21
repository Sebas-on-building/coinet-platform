import React, { useState, useEffect } from "react";
import { useComments } from "@/hooks/useComments";
import { CommentPopover } from "./CommentPopover";
import { motion, AnimatePresence } from "framer-motion";

interface WidgetCommentsProps {
  threadId: string;
  iconSize?: number;
  userId: string;
}

export const WidgetComments: React.FC<WidgetCommentsProps> = ({ threadId, iconSize = 22, userId }) => {
  const { comments, getUnreadCount, markThreadRead } = useComments(threadId, userId);
  const [open, setOpen] = useState(false);
  const count = comments.length;
  const unread = getUnreadCount ? getUnreadCount() : 0;

  // Mark as read when popover opens
  useEffect(() => {
    if (open && markThreadRead) markThreadRead();
  }, [open, markThreadRead]);

  return (
    <div className="relative inline-block">
      <motion.button
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-900/60 hover:bg-blue-800/80 focus:bg-blue-700/90 text-blue-100 font-semibold shadow transition outline-none"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.96 }}
        aria-label={count === 1 ? "1 comment" : `${count} comments`}
        onClick={() => setOpen((v) => !v)}
        tabIndex={0}
      >
        <span style={{ fontSize: iconSize, lineHeight: 1 }} aria-hidden>💬</span>
        <AnimatePresence>
          {count > 0 && (
            <motion.span
              key="count"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold shadow"
            >
              {count}
            </motion.span>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="unread"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-pink-500 text-white text-xs font-bold shadow-lg border-2 border-blue-900 animate-pulse"
              aria-label={`${unread} unread comment${unread > 1 ? "s" : ""}`}
            >
              {unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <CommentPopover open={open} onClose={() => setOpen(false)} threadId={threadId} />
    </div>
  );
}; 
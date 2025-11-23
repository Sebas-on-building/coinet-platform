import React, { useRef, useEffect } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { useCommentHighlight } from "@/contexts/CommentHighlightContext";
import { AISummary } from "./AISummary";
import { motion, AnimatePresence } from "framer-motion";
import type { LsonNotification } from "@/contexts/NotificationContext";

interface NotificationPopoverProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

// Helper: group by type
function groupByType(notifications: LsonNotification[]): [string, LsonNotification[]][] {
  const groups: { [key: string]: LsonNotification[] } = { comment: [], reply: [], mention: [], resolve: [] };
  notifications.forEach((n: LsonNotification) => {
    if (groups[n.type]) groups[n.type].push(n);
  });
  return Object.entries(groups).filter(([, arr]) => arr.length > 0);
}

// Helper: group by time
function groupByTime(notifications: LsonNotification[]): { label: string; items: LsonNotification[] }[] {
  const now = Date.now();
  const today: LsonNotification[] = [];
  const thisWeek: LsonNotification[] = [];
  const earlier: LsonNotification[] = [];
  notifications.forEach((n: LsonNotification) => {
    const diff = now - n.createdAt;
    if (diff < 1000 * 60 * 60 * 24) today.push(n);
    else if (diff < 1000 * 60 * 60 * 24 * 7) thisWeek.push(n);
    else earlier.push(n);
  });
  return [
    { label: "Today", items: today },
    { label: "This Week", items: thisWeek },
    { label: "Earlier", items: earlier },
  ].filter(g => g.items.length > 0);
}

const typeLabels: { [key: string]: string } = {
  comment: "Comments",
  reply: "Replies",
  mention: "Mentions",
  resolve: "Resolves",
};
const typeColors: { [key: string]: string } = {
  comment: "text-blue-400 border-blue-400",
  reply: "text-green-400 border-green-400",
  mention: "text-pink-400 border-pink-400",
  resolve: "text-yellow-400 border-yellow-400",
};

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ open, onClose, userId }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, markAsRead, clearAll } = useNotifications(userId);
  const { setHighlightedCommentId } = useCommentHighlight();
  const ariaLiveRef = useRef<HTMLDivElement>(null);

  // Close on outside click or escape
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent | KeyboardEvent) {
      if (e instanceof MouseEvent && ref.current && !ref.current.contains(e.target as Node)) onClose();
      if (e instanceof KeyboardEvent && e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handle);
    };
  }, [open, onClose]);

  // Group by time, then by type within each time group
  const timeGroups = groupByTime(notifications);

  // Scroll to comment and highlight
  const handleNotificationClick = (n: LsonNotification) => {
    onClose();
    setTimeout(() => {
      const el = document.getElementById(`comment-${n.commentId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedCommentId(n.commentId);
        (el as HTMLElement).focus?.();
        if (ariaLiveRef.current) {
          ariaLiveRef.current.textContent = `Navigated to comment by ${n.fromUserName}`;
        }
      }
    }, 200); // Wait for popover to close
    markAsRead(n.id);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="absolute z-50 right-0 mt-2 w-96 max-w-[90vw] bg-gradient-to-br from-blue-950/95 via-blue-900/90 to-blue-950/95 rounded-2xl shadow-2xl border border-blue-800/60 p-0.5"
          tabIndex={-1}
          aria-modal="true"
          role="dialog"
        >
          <div className="bg-blue-900/80 rounded-2xl p-4">
            <AISummary notifications={notifications} />
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-blue-100 text-lg">Notifications</span>
              <button className="text-xs text-blue-300 hover:text-blue-100 underline" onClick={clearAll}>Clear all</button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-4 pr-1">
              {notifications.length === 0 && (
                <div className="text-blue-300 text-sm text-center py-8">No notifications</div>
              )}
              {timeGroups.map((tg, i) => (
                <div key={tg.label}>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="mb-2 mt-4 first:mt-0 text-blue-200 text-xs font-bold uppercase tracking-widest"
                  >
                    {tg.label}
                  </motion.div>
                  {groupByType(tg.items).map(([type, items]) => (
                    <div key={type}>
                      <motion.div
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        className={`flex items-center gap-2 mb-1 mt-2 ${typeColors[type] || "text-blue-400"} font-bold text-sm`}
                      >
                        <span className={`border-l-4 pl-2 ${typeColors[type] || "border-blue-400"}`}>{typeLabels[type] || type}</span>
                      </motion.div>
                      <div className="space-y-2">
                        {items.map((n: LsonNotification) => (
                          <motion.button
                            key={n.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ type: "spring", stiffness: 400, damping: 32 }}
                            className={`w-full text-left rounded-xl p-3 bg-blue-950/80 border border-blue-800/60 shadow flex items-center gap-3 focus:ring-2 focus:ring-pink-400 focus:outline-none ${!n.read ? "ring-2 ring-pink-500/60" : ""}`}
                            tabIndex={0}
                            aria-label={`Go to comment by ${n.fromUserName}`}
                            onClick={() => handleNotificationClick(n)}
                          >
                            <span className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-sm">
                              {n.fromUserAvatar ? <img src={n.fromUserAvatar} alt={n.fromUserName} className="w-full h-full object-cover rounded-full" /> : n.fromUserName[0]}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-blue-200 font-semibold text-sm truncate">
                                {n.type === "mention" && <span className="text-pink-400 font-bold mr-1">@mention</span>}
                                {n.type === "reply" && <span className="text-green-400 font-bold mr-1">Reply</span>}
                                {n.type === "comment" && <span className="text-blue-400 font-bold mr-1">Comment</span>}
                                {n.type === "resolve" && <span className="text-yellow-400 font-bold mr-1">Resolved</span>}
                                {n.fromUserName}
                              </div>
                              <div className="text-blue-100 text-xs truncate">{n.content}</div>
                              <div className="text-blue-300 text-xs mt-0.5">{new Date(n.createdAt).toLocaleString()}</div>
                            </div>
                            {!n.read && (
                              <span className="ml-2 px-2 py-1 rounded bg-pink-500 text-white text-xs font-bold shadow animate-pulse">New</span>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div ref={ariaLiveRef} className="sr-only" aria-live="polite" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 
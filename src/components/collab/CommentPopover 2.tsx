import React, { useRef, useEffect } from "react";
import { CommentThread } from "./CommentThread";
import { motion, AnimatePresence } from "framer-motion";

interface CommentPopoverProps {
  open: boolean;
  onClose: () => void;
  threadId: string;
}

export const CommentPopover: React.FC<CommentPopoverProps> = ({ open, onClose, threadId }) => {
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 w-96 max-w-[90vw] bg-gradient-to-br from-blue-950/95 via-blue-900/90 to-blue-950/95 rounded-2xl shadow-2xl border border-blue-800/60 p-0.5"
          tabIndex={-1}
          aria-modal="true"
          role="dialog"
        >
          <div className="bg-blue-900/80 rounded-2xl p-4">
            <CommentThread threadId={threadId} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 
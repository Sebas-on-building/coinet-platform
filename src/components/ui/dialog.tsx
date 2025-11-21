import { Fragment } from "react";
import { Dialog as HeadlessDialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  size = "md",
}: DialogProps) {
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-gradient-to-br from-black/80 via-[#181836]/80 to-[#23234d]/90 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Modal Panel */}
          <motion.div
            className={`relative w-full ${sizeClasses[size]} rounded-2xl bg-gradient-to-br from-[#181836] to-[#23234d] p-8 shadow-2xl border-2 border-blue-400/60 backdrop-blur-xl`}
            initial={{ scale: 0.95, opacity: 0, y: 32 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 32 }}
            transition={{ type: "spring", duration: 0.5 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                id="dialog-title"
                className="text-xl font-semibold text-white drop-shadow-lg"
              >
                {title}
              </h2>
              <motion.button
                type="button"
                className="rounded-lg p-1 hover:bg-blue-400/20 transition-colors focus:ring-2 focus:ring-blue-400"
                onClick={onClose}
                whileHover={{
                  scale: 1.2,
                  rotate: 90,
                  backgroundColor: "#00ffa3",
                }}
                whileTap={{ scale: 0.9 }}
                aria-label="Close dialog"
              >
                <X className="h-6 w-6 text-blue-200" />
              </motion.button>
            </div>
            <div className="text-blue-100">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import React from "react";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart2, Twitter, User, Plus, Sun, Moon } from "lucide-react";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

const features = [
  {
    icon: <BarChart2 className="w-6 h-6 text-brand" />,
    title: "Advanced Analytics",
    desc: "Visualize price, moving averages, and anomalies with stunning charts.",
  },
  {
    icon: <Twitter className="w-6 h-6 text-sky-400" />,
    title: "Social Feed",
    desc: "Stay updated with real-time news, tweets, and sentiment.",
  },
  {
    icon: <User className="w-6 h-6 text-green-400" />,
    title: "Personalized Dashboard",
    desc: "Add, remove, and rearrange widgets to fit your workflow.",
  },
  {
    icon: <Plus className="w-6 h-6 text-blue-400" />,
    title: "Add Widgets",
    desc: "Choose from a variety of widgets for market, portfolio, DeFi, and more.",
  },
  {
    icon: <Sun className="w-6 h-6 text-yellow-400" />,
    title: "Dark & Light Mode",
    desc: "Switch themes for a visually balanced experience.",
  },
];

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and ESC
  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        aria-modal="true"
        role="dialog"
        aria-labelledby="onboarding-modal-title"
        ref={modalRef}
      >
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-lg animate-fade-in"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", duration: 0.4 }}
          tabIndex={-1}
        >
          <h2
            id="onboarding-modal-title"
            className="text-2xl font-bold mb-4 text-center"
          >
            Welcome to Coinet 🚀
          </h2>
          <p className="text-center text-gray-500 mb-6">
            Your all-in-one crypto dashboard. Here's what you can do:
          </p>
          <ul className="space-y-4 mb-6">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-4">
                <span>{f.icon}</span>
                <div>
                  <div className="font-semibold text-base">{f.title}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {f.desc}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <button
            ref={closeButtonRef}
            className="w-full py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 transition"
            onClick={onClose}
            aria-label="Close onboarding"
          >
            Get Started
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowRight,
  FiCheckCircle,
  FiXCircle,
  FiInfo,
  FiHelpCircle,
} from "react-icons/fi";

const steps = [
  {
    title: "Welcome to Coinet",
    desc: "Your all-in-one crypto analytics dashboard, inspired by Solana & TradingView. Let's take a quick tour!",
    target: null,
  },
  {
    title: "Portfolio Breakdown",
    desc: "See your asset allocation and performance at a glance.",
    target: "portfolio",
  },
  {
    title: "Alerts & Signals",
    desc: "Get real-time alerts and trading signals with stunning animations.",
    target: "alerts",
  },
  {
    title: "News Feed",
    desc: "Stay updated with the latest crypto news and social trends.",
    target: "news",
  },
  {
    title: "AI Insights",
    desc: "Get executive summaries, forward signals, and narrative timelines powered by AI.",
    target: "ai",
  },
  {
    title: "Strategy Backtesting",
    desc: "Test trading strategies with animated, interactive results.",
    target: "backtest",
  },
  {
    title: "Collaboration",
    desc: "Invite teammates, share dashboards, and collaborate in real time.",
    target: "collab",
  },
  {
    title: "Settings & Customization",
    desc: "Personalize your experience with themes, widgets, and more.",
    target: "settings",
  },
];

const targetSelectors: Record<string, string> = {
  portfolio: '[data-tour="portfolio"]',
  alerts: '[data-tour="alerts"]',
  news: '[data-tour="news"]',
  ai: '[data-tour="ai"]',
  backtest: '[data-tour="backtest"]',
  collab: '[data-tour="collab"]',
  settings: '[data-tour="settings"]',
};

function getTargetRect(target: string | null) {
  if (!target) return null;
  const el = document.querySelector(targetSelectors[target]);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return rect;
}

export function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);

  // Open on first visit or when help button is clicked
  React.useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  const currentTarget = steps[step].target;
  const rect =
    typeof window !== "undefined" ? getTargetRect(currentTarget) : null;

  if (!open) {
    return (
      <button
        className="fixed bottom-24 right-8 z-50 bg-[#23234d] text-blue-300 p-4 rounded-full shadow-lg border-2 border-blue-400 hover:bg-[#00ffa3] hover:text-[#23234d] transition"
        onClick={() => {
          setStep(0);
          setOpen(true);
          setForceOpen(false);
        }}
        title="Show onboarding tour"
      >
        <FiHelpCircle size={24} />
      </button>
    );
  }

  return (
    <>
      {/* Overlay and highlight ring */}
      <AnimatePresence>
        {rect && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-40 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
        {rect && (
          <motion.div
            className="fixed z-50 border-4 border-[#00ffa3] rounded-2xl pointer-events-none"
            style={{
              top: rect.top - 8,
              left: rect.left - 8,
              width: rect.width + 16,
              height: rect.height + 16,
              boxShadow: "0 0 32px #00ffa3",
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, type: "spring" }}
          />
        )}
      </AnimatePresence>
      {/* Tour popover */}
      <AnimatePresence>
        <motion.div
          key={step}
          className="fixed bottom-24 right-8 z-50 max-w-xs bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-2xl border-2 border-[#23234d] backdrop-blur-xl"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <FiInfo className="text-[#00ffa3]" />
            <span className="text-white font-bold text-lg">
              {steps[step].title}
            </span>
          </div>
          <div className="text-blue-300 text-sm mb-4">{steps[step].desc}</div>
          <div className="flex items-center gap-2">
            {step < steps.length - 1 ? (
              <motion.button
                className="bg-[#00ffa3] text-[#23234d] px-4 py-2 rounded-lg font-bold shadow hover:bg-[#0057ff] hover:text-white transition flex items-center gap-1"
                onClick={() => setStep((s) => s + 1)}
                whileHover={{ scale: 1.08, boxShadow: "0 0 12px #00ffa3" }}
                whileTap={{ scale: 0.96 }}
              >
                Next <FiArrowRight />
              </motion.button>
            ) : (
              <motion.button
                className="bg-[#00ffa3] text-[#23234d] px-4 py-2 rounded-lg font-bold shadow hover:bg-[#0057ff] hover:text-white transition flex items-center gap-1"
                onClick={() => setOpen(false)}
                whileHover={{ scale: 1.08, boxShadow: "0 0 12px #00ffa3" }}
                whileTap={{ scale: 0.96 }}
              >
                Finish <FiCheckCircle />
              </motion.button>
            )}
            <motion.button
              className="bg-[#23234d] text-blue-300 px-4 py-2 rounded-lg font-bold shadow hover:bg-[#ff4d4f] hover:text-white transition flex items-center gap-1"
              onClick={() => setOpen(false)}
              whileHover={{ scale: 1.08, boxShadow: "0 0 12px #ff4d4f" }}
              whileTap={{ scale: 0.96 }}
            >
              Skip <FiXCircle />
            </motion.button>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`w-2 h-2 rounded-full ${idx === step ? "bg-[#00ffa3]" : "bg-[#23234d] border border-[#00ffa3]"}`}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

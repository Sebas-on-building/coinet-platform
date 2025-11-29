import { motion, AnimatePresence } from "framer-motion";
import { AnomalyEvent } from "@/hooks/useAnomaliesFeed";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export function AnomalyToast({
  anomaly,
  onClose,
}: {
  anomaly?: AnomalyEvent;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!anomaly) return;
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [anomaly, onClose]);

  if (!anomaly) return null;
  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-8 right-8 z-[100] bg-glass/90 rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4 border-2 border-yellow-400/40 backdrop-blur-xl"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.4, type: "spring" }}
        role="alert"
        aria-live="assertive"
      >
        <AlertTriangle
          className="w-8 h-8 text-yellow-400 animate-pulse"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-yellow-500 text-lg mb-1">
            Anomaly Detected
          </div>
          <div className="text-sm text-gray-800 dark:text-gray-200">
            <span className="font-semibold">{anomaly.symbol}</span> price
            deviated from MA20
            <br />
            <span className="text-xs text-gray-500">{anomaly.reason}</span>
            <br />
            <span className="text-xs">
              Price:{" "}
              <span className="font-mono">${anomaly.price.toFixed(2)}</span> |
              MA20: <span className="font-mono">{anomaly.ma20.toFixed(2)}</span>{" "}
              | Vol:{" "}
              <span className="font-mono">{anomaly.volatility.toFixed(2)}</span>
            </span>
            <br />
            <span className="text-xs text-gray-400">
              {new Date(anomaly.time).toLocaleString()}
            </span>
          </div>
        </div>
        <button
          className="ml-4 text-yellow-500 hover:text-yellow-700 focus:ring-2 focus:ring-yellow-400 rounded-full p-1"
          onClick={onClose}
          aria-label="Dismiss anomaly notification"
        >
          ×
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

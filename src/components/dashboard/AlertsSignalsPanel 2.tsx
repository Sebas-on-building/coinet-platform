import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const mockAlerts = [
  {
    id: 1,
    type: "Price Alert",
    message: "BTC crossed $70,000",
    time: "Just now",
  },
  {
    id: 2,
    type: "Signal",
    message: "SOL: Buy signal detected",
    time: "2 min ago",
  },
  {
    id: 3,
    type: "News Alert",
    message: "ETH upgrade announced",
    time: "10 min ago",
  },
];

export function AlertsSignalsPanel() {
  const [alerts, setAlerts] = useState(mockAlerts);
  const [toast, setToast] = useState<null | { message: string }>(null);

  // Simulate a new alert for demo
  const triggerAlert = () => {
    const newAlert = {
      id: Date.now(),
      type: "Signal",
      message: "New bullish signal for BTC",
      time: "Now",
    };
    setAlerts([newAlert, ...alerts]);
    setToast({ message: newAlert.message });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-xl mx-auto border-2 border-blue-400/40 backdrop-blur-xl"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Alerts & Signals</h3>
        <motion.button
          onClick={triggerAlert}
          className="bg-[#00ffa3] text-[#23234d] px-4 py-2 rounded-lg font-bold shadow hover:bg-[#0057ff] hover:text-white transition"
          whileHover={{ scale: 1.08, boxShadow: "0 0 12px #00ffa3" }}
          whileTap={{ scale: 0.97 }}
        >
          Trigger Alert
        </motion.button>
      </div>
      <div className="space-y-3">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              className="bg-gradient-to-br from-[#23234d] to-[#181836] rounded-lg px-4 py-3 flex items-center gap-3 shadow border border-blue-400/20 backdrop-blur-md"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: "spring", stiffness: 80 }}
            >
              <span className="text-blue-300 font-mono text-xs">
                [{alert.type}]
              </span>
              <span className="text-white flex-1">{alert.message}</span>
              <span className="text-xs text-gray-400">{alert.time}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed bottom-8 right-8 bg-gradient-to-br from-[#00ffa3] to-[#0057ff] text-[#23234d] px-6 py-3 rounded-xl shadow-2xl font-bold z-50 border-2 border-blue-400/60 backdrop-blur-xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.4, type: "spring" }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

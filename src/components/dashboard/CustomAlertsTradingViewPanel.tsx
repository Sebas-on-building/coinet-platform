import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiBarChart2, FiTrendingUp, FiActivity } from "react-icons/fi";

const tradingViewActions = [
  { label: "Open Chart", icon: <FiBarChart2 size={22} />, color: "#0057ff" },
  { label: "Indicators", icon: <FiTrendingUp size={22} />, color: "#00ffa3" },
  {
    label: "Strategy Tester",
    icon: <FiActivity size={22} />,
    color: "#ffb300",
  },
];

export function CustomAlertsTradingViewPanel() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ asset: "", condition: "", value: "" });

  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">
          Custom Alerts & TradingView Analytics
        </h3>
        <button
          onClick={() => setOpen((v) => !v)}
          className="bg-[#00ffa3] text-[#23234d] px-4 py-2 rounded-lg font-bold shadow hover:bg-[#0057ff] hover:text-white transition flex items-center gap-2"
        >
          <FiPlus /> New Alert
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.form
            className="bg-[#23234d] rounded-xl p-4 mb-6 flex flex-col gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, type: "spring" }}
            onSubmit={(e) => {
              e.preventDefault();
              setOpen(false);
              setForm({ asset: "", condition: "", value: "" });
            }}
          >
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Asset (e.g. BTC)"
                className="flex-1 px-3 py-2 rounded bg-[#1a1a2e] text-white"
                value={form.asset}
                onChange={(e) =>
                  setForm((f) => ({ ...f, asset: e.target.value }))
                }
                required
              />
              <input
                type="text"
                placeholder="Condition (e.g. >)"
                className="w-20 px-3 py-2 rounded bg-[#1a1a2e] text-white"
                value={form.condition}
                onChange={(e) =>
                  setForm((f) => ({ ...f, condition: e.target.value }))
                }
                required
              />
              <input
                type="number"
                placeholder="Value"
                className="w-24 px-3 py-2 rounded bg-[#1a1a2e] text-white"
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value: e.target.value }))
                }
                required
              />
            </div>
            <button
              type="submit"
              className="bg-[#00ffa3] text-[#23234d] px-4 py-2 rounded-lg font-bold shadow hover:bg-[#0057ff] hover:text-white transition mt-2"
            >
              Create Alert
            </button>
          </motion.form>
        )}
      </AnimatePresence>
      <div className="flex gap-4 justify-center mt-2">
        {tradingViewActions.map((action, idx) => (
          <motion.button
            key={action.label}
            className="flex flex-col items-center bg-[#23234d] rounded-xl p-4 shadow-lg border-2 min-w-[110px] font-bold text-sm"
            style={{ borderColor: action.color, color: action.color }}
            whileHover={{ scale: 1.09, boxShadow: `0 0 16px ${action.color}` }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 120 }}
          >
            <span>{action.icon}</span>
            <span className="mt-2">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

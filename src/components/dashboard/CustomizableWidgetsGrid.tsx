import { useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { FiBarChart2, FiBell, FiFileText, FiPlus } from "react-icons/fi";

const widgetTypes = [
  { type: "Chart", icon: <FiBarChart2 />, color: "#00ffa3" },
  { type: "News", icon: <FiFileText />, color: "#0057ff" },
  { type: "Alerts", icon: <FiBell />, color: "#ffb300" },
];

function Widget({
  type,
  icon,
  color,
}: {
  type: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <motion.div
      className="bg-[#23234d] rounded-xl p-6 shadow-lg flex flex-col items-center border-2 min-w-[180px] min-h-[120px]"
      style={{ borderColor: color }}
      whileHover={{ scale: 1.04, boxShadow: `0 0 16px ${color}` }}
    >
      <span className="text-3xl mb-2" style={{ color }}>
        {icon}
      </span>
      <span className="text-white font-bold">{type}</span>
      <span className="text-blue-300 text-xs mt-2">(Mock Widget)</span>
    </motion.div>
  );
}

export function CustomizableWidgetsGrid() {
  const [widgets, setWidgets] = useState([
    { id: 1, ...widgetTypes[0] },
    { id: 2, ...widgetTypes[1] },
    { id: 3, ...widgetTypes[2] },
  ]);
  const [nextId, setNextId] = useState(4);

  const addWidget = (typeIdx: number) => {
    setWidgets((w) => [...w, { id: nextId, ...widgetTypes[typeIdx] }]);
    setNextId((id) => id + 1);
  };
  const removeWidget = (id: number) =>
    setWidgets((w) => w.filter((x) => x.id !== id));

  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">
          Customizable Dashboard Widgets
        </h3>
        <div className="flex gap-2">
          {widgetTypes.map((w, idx) => (
            <button
              key={w.type}
              className="flex items-center gap-1 px-3 py-1 rounded-full font-mono text-sm font-bold transition bg-[#23234d] text-blue-300 border border-[#23234d] hover:bg-[#00ffa3]/20"
              onClick={() => addWidget(idx)}
            >
              <FiPlus /> {w.type}
            </button>
          ))}
        </div>
      </div>
      <Reorder.Group
        axis="x"
        values={widgets}
        onReorder={setWidgets}
        className="flex gap-4 flex-wrap"
      >
        <AnimatePresence>
          {widgets.map((widget) => (
            <Reorder.Item key={widget.id} value={widget} as="div">
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 100 }}
                className="relative"
              >
                <Widget
                  type={widget.type}
                  icon={widget.icon}
                  color={widget.color}
                />
                <button
                  className="absolute top-2 right-2 bg-[#ff4d4f] text-white rounded-full p-1 text-xs hover:bg-[#ffb300] transition"
                  onClick={() => removeWidget(widget.id)}
                  title="Remove Widget"
                >
                  ×
                </button>
              </motion.div>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </motion.div>
  );
}

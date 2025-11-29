import { motion, AnimatePresence } from "framer-motion";
import {
  FiSettings,
  FiBarChart2,
  FiTrendingUp,
  FiGlobe,
  FiUsers,
} from "react-icons/fi";
import React, { Suspense } from "react";

const widgets = [
  {
    key: "analytics",
    label: "Analytics",
    icon: <FiBarChart2 />,
    accent: "#00ffa3",
  },
  {
    key: "market",
    label: "Market Movers",
    icon: <FiTrendingUp />,
    accent: "#0057ff",
  },
  { key: "news", label: "News Digest", icon: <FiGlobe />, accent: "#ffb300" },
  {
    key: "social",
    label: "Social Trends",
    icon: <FiUsers />,
    accent: "#7c3aed",
  },
];

// WidgetLoader with Suspense and ErrorBoundary (copied from dashboard page)
class WidgetErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className="text-red-600 font-bold mb-2">
            Widget failed to load.
          </div>
          <button
            className="bg-blue-600 text-white px-4 py-1 rounded"
            onClick={() => this.setState({ hasError: false })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
function WidgetLoader({ children }: { children: React.ReactNode }) {
  return (
    <WidgetErrorBoundary>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-32 animate-pulse">
            <div className="w-8 h-8 border-4 border-blue-300 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        {children}
      </Suspense>
    </WidgetErrorBoundary>
  );
}

// Widget type
interface Widget {
  key: string;
  name?: string;
  component: React.ComponentType<any>;
  defaultLayout: any;
}

interface WidgetsGridProps {
  widgets: Widget[];
  layout: any[];
  draggingKey: string | null;
  handleRemoveWidget: (key: string) => void;
  openConfigModal: (key: string) => void;
  widgetConfigs: { [key: string]: any };
}

export default function WidgetsGrid({
  widgets,
  layout,
  draggingKey,
  handleRemoveWidget,
  openConfigModal,
  widgetConfigs,
}: WidgetsGridProps) {
  return (
    <AnimatePresence>
      {widgets.map((widget, idx) => (
        <motion.div
          key={widget.key}
          data-grid={
            layout.find((l) => l.i === widget.key) || widget.defaultLayout
          }
          className={`bg-white rounded-lg shadow p-2 sm:p-4 relative transition-all duration-200
            hover:shadow-2xl hover:border-blue-400 border border-transparent
            focus-within:ring-2 focus-within:ring-blue-300
            ${draggingKey === widget.key ? "border-blue-500 shadow-2xl z-20" : ""}
            animate-fade-in`}
          aria-label={widget.name}
          tabIndex={0}
          initial={{ opacity: 0, scale: 0.95, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 32 }}
          transition={{ type: "spring", duration: 0.5, delay: idx * 0.07 }}
          whileHover={{ scale: 1.03, boxShadow: "0 4px 32px #00ffa3" }}
          whileTap={{ scale: 0.97 }}
          layout
        >
          {/* Drag Handle */}
          <motion.div
            className="drag-handle absolute top-2 left-2 cursor-move text-gray-400 hover:text-blue-500 focus:text-blue-700 focus:ring-2 focus:ring-blue-300"
            title="Drag widget"
            aria-label="Drag widget"
            tabIndex={0}
            role="button"
            whileHover={{ scale: 1.2, color: "#00ffa3" }}
            whileTap={{ scale: 0.9 }}
          >
            <span className="text-xl">⠿</span>
          </motion.div>
          {/* Remove Widget Button */}
          <motion.button
            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-lg z-10 focus:ring-2 focus:ring-red-300"
            onClick={() => handleRemoveWidget(widget.key)}
            aria-label={`Remove ${widget.name} widget`}
            whileHover={{ scale: 1.2, color: "#ff4d4f" }}
            whileTap={{ scale: 0.9 }}
          >
            ×
          </motion.button>
          {/* Configure Widget Button */}
          <motion.button
            className="absolute top-2 right-10 text-gray-400 hover:text-blue-500 text-lg z-10 focus:ring-2 focus:ring-blue-300"
            onClick={() => openConfigModal(widget.key)}
            aria-label={`Configure ${widget.name} widget`}
            whileHover={{ scale: 1.2, color: "#00bcd4" }}
            whileTap={{ scale: 0.9 }}
          >
            ⚙️
          </motion.button>
          <WidgetLoader>
            <widget.component
              config={widgetConfigs[widget.key]}
              analyticsEvent={`dashboard_widget_${widget.key}`}
            />
          </WidgetLoader>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

export function WidgetsGridOld() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 p-8 mt-24">
      <AnimatePresence>
        {widgets.map((w, i) => (
          <motion.div
            key={w.key}
            className="relative rounded-2xl shadow-2xl border-2 border-[#23234d] bg-gradient-to-br from-[#181836] to-[#23234d] p-6 flex flex-col min-h-[220px]"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ delay: i * 0.1, duration: 0.5, type: "spring" }}
            style={{ boxShadow: `0 0 0 2px ${w.accent}33` }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl" style={{ color: w.accent }}>
                {w.icon}
              </span>
              <span className="font-bold text-lg text-white">{w.label}</span>
              <button
                className="ml-auto text-blue-300 hover:text-white p-2 rounded-full transition"
                title="Widget settings"
              >
                <FiSettings />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center text-blue-200 text-xl opacity-60">
              {w.label} content here
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

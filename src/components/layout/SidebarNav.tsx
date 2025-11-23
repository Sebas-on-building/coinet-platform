import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiHome,
  FiBarChart2,
  FiTrendingUp,
  FiGlobe,
  FiUsers,
  FiSettings,
} from "react-icons/fi";

const navItems = [
  {
    label: "Dashboard",
    icon: <FiHome />,
    route: "/dashboard",
    accent: "#00ffa3",
  },
  {
    label: "Analytics",
    icon: <FiBarChart2 />,
    route: "/analytics",
    accent: "#0057ff",
  },
  {
    label: "Market",
    icon: <FiTrendingUp />,
    route: "/market",
    accent: "#ffb300",
  },
  { label: "News", icon: <FiGlobe />, route: "/news", accent: "#7c3aed" },
  { label: "Social", icon: <FiUsers />, route: "/social", accent: "#ff4d4f" },
  {
    label: "Settings",
    icon: <FiSettings />,
    route: "/settings",
    accent: "#00ffa3",
  },
];

export function SidebarNav({
  activeRoute = "/dashboard",
  onNavigate,
}: {
  activeRoute?: string;
  onNavigate?: (route: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      {/* Toggle button */}
      <button
        className="fixed top-6 left-6 z-50 bg-[#23234d] text-blue-300 p-3 rounded-full shadow-lg border-2 border-blue-400 hover:bg-[#1a1a2e] transition"
        onClick={() => setOpen((v) => !v)}
        title={open ? "Close sidebar" : "Open sidebar"}
        aria-label="Toggle sidebar"
      >
        <motion.div
          animate={{ rotate: open ? 0 : 180 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <FiBarChart2 size={22} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.nav
            className="fixed top-0 left-0 h-full w-64 bg-gradient-to-br from-[#1a1a2e] to-[#23234d] shadow-2xl z-40 flex flex-col pt-24 pb-8 px-4 border-r-2 border-[#23234d]"
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <button
                  key={item.route}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-lg transition-all relative ${activeRoute === item.route ? "bg-white/10 shadow-lg" : "hover:bg-white/5"} ${activeRoute === item.route ? "" : "text-blue-200"}`}
                  style={
                    activeRoute === item.route
                      ? {
                          color: item.accent,
                          boxShadow: `0 0 0 2px ${item.accent}55`,
                        }
                      : {}
                  }
                  onClick={() => onNavigate?.(item.route)}
                  title={item.label}
                  aria-label={item.label}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="transition-all duration-300 group-hover:ml-2">
                    {item.label}
                  </span>
                  {activeRoute === item.route && (
                    <motion.span
                      className="absolute left-0 top-0 h-full w-1 rounded bg-gradient-to-b"
                      style={{
                        background: `linear-gradient(180deg, ${item.accent}, transparent)`,
                      }}
                      layoutId="sidebar-active-indicator"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
export default SidebarNav;

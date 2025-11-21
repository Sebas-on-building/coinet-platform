import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSettings,
  FiSun,
  FiMoon,
  FiSmartphone,
  FiBell,
  FiGrid,
  FiEye,
} from "react-icons/fi";

const accentColors = [
  { name: "Solana Green", color: "#00ffa3" },
  { name: "TradingView Blue", color: "#0057ff" },
  { name: "Gold", color: "#ffb300" },
  { name: "Red", color: "#ff4d4f" },
  { name: "Purple", color: "#7c3aed" },
];

const fontSizes = [
  { label: "Small", value: "text-sm" },
  { label: "Medium", value: "text-base" },
  { label: "Large", value: "text-lg" },
];

export function UserSettingsThemePanel() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "auto">("auto");
  const [accent, setAccent] = useState(accentColors[0].color);
  const [layout, setLayout] = useState("grid");
  const [notifications, setNotifications] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState("text-base");

  // For demo: apply font size and high-contrast to body
  if (typeof window !== "undefined") {
    document.body.classList.remove(
      "text-sm",
      "text-base",
      "text-lg",
      "high-contrast",
    );
    document.body.classList.add(fontSize);
    if (highContrast) document.body.classList.add("high-contrast");
  }

  return (
    <div>
      <button
        className="fixed bottom-6 left-6 z-50 bg-[#23234d] text-blue-300 p-4 rounded-full shadow-lg border-2 border-blue-400 hover:bg-[#1a1a2e] transition"
        onClick={() => setOpen((v) => !v)}
        title="Settings"
        aria-label="Open settings"
      >
        <FiSettings size={24} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed bottom-24 left-6 z-50 bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-2xl w-80 border-2 border-[#23234d]"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FiSettings /> User Settings
            </h3>
            {/* Theme toggle */}
            <div className="mb-4">
              <div className="text-blue-300 font-mono mb-2">Theme</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme("light")}
                  className={`p-2 rounded-lg flex items-center gap-1 font-bold ${theme === "light" ? "bg-[#00ffa3] text-[#23234d]" : "bg-[#23234d] text-blue-300"}`}
                >
                  <FiSun /> Light
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`p-2 rounded-lg flex items-center gap-1 font-bold ${theme === "dark" ? "bg-[#0057ff] text-white" : "bg-[#23234d] text-blue-300"}`}
                >
                  <FiMoon /> Dark
                </button>
                <button
                  onClick={() => setTheme("auto")}
                  className={`p-2 rounded-lg flex items-center gap-1 font-bold ${theme === "auto" ? "bg-[#ffb300] text-[#23234d]" : "bg-[#23234d] text-blue-300"}`}
                >
                  <FiSmartphone /> Auto
                </button>
              </div>
            </div>
            {/* Accent color picker */}
            <div className="mb-4">
              <div className="text-blue-300 font-mono mb-2">Accent Color</div>
              <div className="flex gap-2">
                {accentColors.map((a) => (
                  <button
                    key={a.color}
                    className={`w-8 h-8 rounded-full border-2 ${accent === a.color ? "ring-2 ring-white" : ""}`}
                    style={{ background: a.color, borderColor: a.color }}
                    onClick={() => setAccent(a.color)}
                  />
                ))}
              </div>
            </div>
            {/* Widget layout (mock) */}
            <div className="mb-4">
              <div className="text-blue-300 font-mono mb-2">Widget Layout</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setLayout("grid")}
                  className={`p-2 rounded-lg flex items-center gap-1 font-bold ${layout === "grid" ? "bg-[#00ffa3] text-[#23234d]" : "bg-[#23234d] text-blue-300"}`}
                >
                  <FiGrid /> Grid
                </button>
                <button
                  onClick={() => setLayout("list")}
                  className={`p-2 rounded-lg flex items-center gap-1 font-bold ${layout === "list" ? "bg-[#0057ff] text-white" : "bg-[#23234d] text-blue-300"}`}
                >
                  <FiGrid style={{ transform: "rotate(90deg)" }} /> List
                </button>
              </div>
            </div>
            {/* Notification preferences (mock) */}
            <div className="mb-4">
              <div className="text-blue-300 font-mono mb-2">Notifications</div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  className="accent-[#00ffa3] w-5 h-5"
                />
                <FiBell /> Enable alerts & signals
              </label>
            </div>
            {/* High-contrast mode */}
            <div className="mb-4">
              <div className="text-blue-300 font-mono mb-2">Accessibility</div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  className="accent-[#00ffa3] w-5 h-5"
                />
                <FiEye /> High-contrast mode
              </label>
              <div className="flex gap-2 items-center">
                <span className="text-blue-300 text-xs">Font size:</span>
                {fontSizes.map((f) => (
                  <button
                    key={f.value}
                    className={`px-2 py-1 rounded font-bold text-xs border-2 ${fontSize === f.value ? "bg-[#00ffa3] text-[#23234d]" : "bg-[#23234d] text-blue-300"}`}
                    onClick={() => setFontSize(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Live preview (mock) */}
            <div className="mt-6">
              <div className="text-blue-300 font-mono mb-2">Live Preview</div>
              <div
                className="rounded-xl p-4 flex items-center gap-4"
                style={{ background: accent + "22", color: accent }}
              >
                <FiSettings size={24} />{" "}
                {theme.charAt(0).toUpperCase() + theme.slice(1)} Theme, {layout}{" "}
                layout, {highContrast ? "High-contrast" : "Normal"},{" "}
                {fontSizes.find((f) => f.value === fontSize)?.label} font
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

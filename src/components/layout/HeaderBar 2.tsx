import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSearch,
  FiBell,
  FiUser,
  FiChevronDown,
  FiSun,
  FiMoon,
} from "react-icons/fi";

export function HeaderBar({
  onThemeToggle,
  theme = "auto",
  accent = "#00ffa3",
}: {
  onThemeToggle?: () => void;
  theme?: "light" | "dark" | "auto";
  accent?: string;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [unread, setUnread] = useState(3);

  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-20 flex items-center px-8 bg-gradient-to-r from-[#23234d] to-[#1a1a2e] shadow-lg border-b-2 border-[#23234d]">
      {/* Animated Search */}
      <div className="flex-1 flex items-center">
        <motion.div
          className="relative"
          animate={{ width: searchOpen ? 320 : 48 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <button
            className="absolute left-0 top-0 h-12 w-12 flex items-center justify-center text-blue-300 hover:text-white focus:outline-none"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
          >
            <FiSearch size={22} />
          </button>
          <AnimatePresence>
            {searchOpen && (
              <motion.input
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.3 }}
                autoFocus
                type="text"
                placeholder="Search news, assets, analytics..."
                className="pl-12 pr-4 py-3 rounded-xl bg-[#181836] text-white w-80 border-2 border-[#23234d] focus:border-blue-400 outline-none shadow"
                onBlur={() => setSearchOpen(false)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      {/* Notification Bell */}
      <div className="relative mx-4">
        <button
          className="relative text-blue-300 hover:text-white p-3 rounded-full focus:outline-none"
          onClick={() => setNotifOpen((v) => !v)}
          aria-label="Notifications"
        >
          <FiBell size={22} />
          {unread > 0 && (
            <motion.span
              className="absolute top-2 right-2 bg-[#ff4d4f] text-white text-xs font-bold rounded-full px-2 py-0.5 shadow"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              {unread}
            </motion.span>
          )}
        </button>
        <AnimatePresence>
          {notifOpen && (
            <motion.div
              className="absolute right-0 mt-2 w-80 bg-[#23234d] rounded-xl shadow-2xl border-2 border-[#23234d] p-4 z-50"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="font-bold text-blue-200 mb-2">Notifications</div>
              <ul className="space-y-2">
                <li className="text-white">
                  🔔 New signal: BTC breakout alert
                </li>
                <li className="text-white">📈 Portfolio up 5% today</li>
                <li className="text-white">
                  📰 New article: Solana DeFi trends
                </li>
              </ul>
              <button
                className="mt-3 text-xs text-blue-400 hover:underline"
                onClick={() => {
                  setUnread(0);
                  setNotifOpen(false);
                }}
              >
                Mark all as read
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* User Avatar Dropdown */}
      <div className="relative mx-4">
        <button
          className="flex items-center gap-2 text-blue-300 hover:text-white p-3 rounded-full focus:outline-none"
          onClick={() => setUserOpen((v) => !v)}
          aria-label="User menu"
        >
          <span className="bg-gradient-to-br from-[#00ffa3] to-[#0057ff] rounded-full w-8 h-8 flex items-center justify-center font-bold text-[#23234d]">
            S
          </span>
          <FiChevronDown size={18} />
        </button>
        <AnimatePresence>
          {userOpen && (
            <motion.div
              className="absolute right-0 mt-2 w-56 bg-[#23234d] rounded-xl shadow-2xl border-2 border-[#23234d] p-4 z-50"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="font-bold text-blue-200 mb-2">User Menu</div>
              <ul className="space-y-2">
                <li className="text-white cursor-pointer hover:text-[#00ffa3]">
                  Profile
                </li>
                <li className="text-white cursor-pointer hover:text-[#00ffa3]">
                  Settings
                </li>
                <li className="text-white cursor-pointer hover:text-[#ff4d4f]">
                  Logout
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Theme/Accent Toggle */}
      <div className="mx-4">
        <button
          className="flex items-center gap-2 text-blue-300 hover:text-white p-3 rounded-full focus:outline-none"
          onClick={onThemeToggle}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <FiMoon size={20} /> : <FiSun size={20} />}
          <span className="hidden md:inline" style={{ color: accent }}>
            Theme
          </span>
        </button>
      </div>
    </header>
  );
}
export default HeaderBar;

import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Home, BarChart, Newspaper, User, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";

const mainNavItems = [
  { icon: <Home />, label: "Dashboard", href: "/" },
  { icon: <Newspaper />, label: "News", href: "/news" },
  { icon: <BarChart />, label: "Analytics", href: "/analytics" },
];
const profileNavItems = [
  { icon: <User />, label: "Profile", href: "/profile" },
];

const links = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { label: 'Portfolio', href: '/portfolio', icon: '💼' },
  { label: 'Charts', href: '/charts/BTC', icon: '📈' },
  { label: 'Strategy', href: '/strategy', icon: '🧠' },
  { label: 'Alerts', href: '/alerts', icon: '🔔' },
  { label: 'Video', href: '/video', icon: '🎬' },
];

export function Sidebar({ expanded = true }: { expanded?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  return (
    <motion.aside
      className={`fixed top-0 left-0 h-full flex flex-col justify-between
        ${expanded ? "w-56" : "w-20"}
        bg-white/10 backdrop-blur-2xl shadow-2xl z-20 transition-all duration-300 border-r border-blue-900/30 rounded-r-3xl`}
      initial={{ width: 80 }}
      animate={{ width: expanded ? 224 : 80 }}
      transition={{ type: "spring", stiffness: 80 }}
    >
      <button onClick={() => setOpen(o => !o)} style={{ marginBottom: 32, background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 24, cursor: 'pointer' }}>{open ? '←' : '→'}</button>
      {/* Top: Logo and Main Nav */}
      <div className="flex flex-col items-center w-full">
        {/* Logo */}
        <div className="flex items-center justify-center w-full mb-8 mt-2 select-none">
          <span className="text-3xl font-extrabold bg-gradient-to-r from-[#00ffa3] to-[#0057ff] bg-clip-text text-transparent tracking-tight drop-shadow-lg">
            C
          </span>
          {expanded && (
            <span className="ml-2 text-xl font-bold text-blue-200 tracking-wide drop-shadow">
              Coinet
            </span>
          )}
        </div>
        {/* Main Section */}
        <div className="w-full px-2">
          <div
            className={`text-xs uppercase tracking-widest text-blue-300/60 mb-2 ${expanded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
          >
            Main
          </div>
          {mainNavItems.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link href={item.href} key={item.label} className="w-full">
                <motion.div
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer group relative
                    ${isActive ? "border-l-4 border-[#00ffa3] bg-gradient-to-r from-[#00ffa3]/10 to-[#0057ff]/10 shadow-lg" : "hover:bg-white/10"}
                  `}
                  whileHover={{
                    scale: 1.08,
                    boxShadow: isActive
                      ? "0 0 24px #00ffa3"
                      : "0 0 16px #00ffa3",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <motion.span
                    className={`text-blue-400 flex items-center justify-center`}
                    animate={{ scale: isActive ? 1.2 : 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {item.icon}
                  </motion.span>
                  <AnimatePresence>
                    {expanded && (
                      <motion.span
                        className="text-white text-base font-medium"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </div>
        {/* Divider */}
        <div
          className={`w-4/5 mx-auto my-4 border-t border-blue-300/20 ${expanded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
        />
        {/* Profile Section */}
        <div className="w-full px-2">
          <div
            className={`text-xs uppercase tracking-widest text-blue-300/60 mb-2 ${expanded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
          >
            Profile
          </div>
          {profileNavItems.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link href={item.href} key={item.label} className="w-full">
                <motion.div
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer group relative
                    ${isActive ? "border-l-4 border-[#00ffa3] bg-gradient-to-r from-[#00ffa3]/10 to-[#0057ff]/10 shadow-lg" : "hover:bg-white/10"}
                  `}
                  whileHover={{
                    scale: 1.08,
                    boxShadow: isActive
                      ? "0 0 24px #00ffa3"
                      : "0 0 16px #00ffa3",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <motion.span
                    className={`text-blue-400 flex items-center justify-center`}
                    animate={{ scale: isActive ? 1.2 : 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {item.icon}
                  </motion.span>
                  <AnimatePresence>
                    {expanded && (
                      <motion.span
                        className="text-white text-base font-medium"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
      {/* Bottom: Settings */}
      <div className="flex flex-col items-center w-full mb-4">
        <motion.button
          className="flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-white/10 text-blue-300 focus:outline-none transition shadow border border-blue-900/30 backdrop-blur-xl"
          whileHover={{ scale: 1.12, boxShadow: "0 0 16px #00ffa3" }}
        >
          <Settings size={22} />
          <AnimatePresence>
            {expanded && (
              <motion.span
                className="text-base font-medium"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
      {/* Neon floating accent */}
      <motion.div
        className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-32 bg-gradient-to-br from-[#00ffa3]/30 to-[#0057ff]/20 rounded-full blur-2xl z-0 animate-pulse"
        animate={{ scale: [1, 1.08, 1], rotate: [0, 10, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
      />
    </motion.aside>
  );
}

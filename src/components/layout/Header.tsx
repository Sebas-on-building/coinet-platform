import { motion } from "framer-motion";

export function Header() {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#1a1a2e]/80 backdrop-blur-md flex items-center justify-between px-8 py-4 shadow-md">
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold text-gradient bg-gradient-to-r from-[#00ffa3] to-[#0057ff] bg-clip-text text-transparent">
          Coinet
        </span>
      </div>
      <motion.input
        type="text"
        placeholder="Search news, assets, topics..."
        className="bg-[#23234d] text-white px-4 py-2 rounded-lg w-64 focus:w-96 transition-all duration-300 outline-none shadow-inner"
        whileFocus={{ scale: 1.04, boxShadow: "0 0 12px #00ffa3" }}
      />
      <div className="flex items-center gap-4">
        <button className="relative">
          <span className="absolute top-0 right-0 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <svg
            className="w-6 h-6 text-blue-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 7.165 6 9.388 6 12v2.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
          </svg>
        </button>
        <img
          src="/avatar.png"
          alt="User"
          className="w-8 h-8 rounded-full border-2 border-blue-400"
        />
      </div>
    </header>
  );
}

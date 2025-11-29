import React from "react";
import { useOthers } from "@liveblocks/react";
import { motion, AnimatePresence } from "framer-motion";

// Type guard for presence fields
function getPresenceString(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}

// Divine: Avatar, name, color, status, role, click to DM (future)
export const PresenceAvatars = () => {
  const others = useOthers();

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gradient-to-r from-blue-900/60 via-blue-800/40 to-blue-900/60 shadow-lg">
      <AnimatePresence initial={false}>
        {others.map(({ connectionId, presence }) => {
          const name = getPresenceString(presence?.name, "Anon");
          const avatarUrl = getPresenceString(presence?.avatarUrl);
          const color = getPresenceString(presence?.color, "#64748b");
          const firstLetter = name[0]?.toUpperCase() || "?";
          return (
            <motion.div
              key={connectionId}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="flex items-center gap-1 group cursor-pointer"
              tabIndex={0}
              aria-label={name}
            >
              <span
                className="w-7 h-7 rounded-full border-2 border-white/30 shadow overflow-hidden flex items-center justify-center"
                style={{
                  background: avatarUrl ? undefined : color,
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                    {firstLetter}
                  </span>
                )}
              </span>
              <span className="text-xs text-white/80 font-semibold group-hover:text-blue-200 transition">
                {name}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}; 
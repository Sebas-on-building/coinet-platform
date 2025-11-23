import React from "react";
import { PresenceAvatars } from "./PresenceAvatars";
import { LiveCursor } from "./LiveCursor";

// Divine: Presence bar for header/sidebar, modular for future features
export const PresenceBar = () => {
  return (
    <div className="relative z-50 flex items-center gap-4 px-4 py-2 bg-gradient-to-r from-blue-950/80 via-blue-900/60 to-blue-950/80 rounded-xl shadow-xl border border-blue-900/40">
      <PresenceAvatars />
      {/* Add more presence features here (status, invite, DM, etc.) */}
      <LiveCursor />
    </div>
  );
}; 
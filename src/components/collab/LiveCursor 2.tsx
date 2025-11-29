import React from "react";
import { useOthers, useSelf } from "@liveblocks/react";
import { motion, AnimatePresence } from "framer-motion";

// Helper for type-safe presence
function getCursor(presence: any) {
  return presence && typeof presence.cursor === "object" ? presence.cursor : null;
}
function getColor(presence: any) {
  return typeof presence?.color === "string" ? presence.color : "#64748b";
}
function getName(presence: any) {
  return typeof presence?.name === "string" ? presence.name : "Anon";
}

const LiveCursor = React.memo(({ x, y, name, color }: { x: number; y: number; name: string; color: string }) => (
  <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none', zIndex: 9999 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 16, height: 16, background: color, borderRadius: '50%', border: '2px solid #fff' }} />
      <span style={{ background: color, color: '#fff', borderRadius: 8, padding: '2px 8px', fontWeight: 600, fontSize: 12 }}>{name}</span>
    </div>
  </div>
));

export default LiveCursor;

export const LiveCursorComponent = () => {
  const others = useOthers();
  const me = useSelf();

  // Render all other users' cursors
  return (
    <>
      <AnimatePresence initial={false}>
        {others.map(({ connectionId, presence }) => {
          const cursor = getCursor(presence);
          if (!cursor) return null;
          const color = getColor(presence);
          const name = getName(presence);
          return (
            <motion.div
              key={connectionId}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{
                position: "fixed",
                left: cursor.x,
                top: cursor.y,
                zIndex: 9999,
                pointerEvents: "none",
              }}
            >
              <div className="flex items-center gap-1">
                <span
                  className="w-4 h-4 rounded-full border-2 border-white shadow"
                  style={{ background: color }}
                />
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-black/70 text-white shadow-lg">
                  {name}
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {/* Optionally render your own cursor for debugging */}
      {/* {me?.presence?.cursor && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            position: "fixed",
            left: me.presence.cursor.x,
            top: me.presence.cursor.y,
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          <div className="flex items-center gap-1">
            <span
              className="w-4 h-4 rounded-full border-2 border-white shadow"
              style={{ background: getColor(me.presence) }}
            />
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-black/70 text-white shadow-lg">
              {getName(me.presence)}
            </span>
          </div>
        </motion.div>
      )} */}
    </>
  );
}; 
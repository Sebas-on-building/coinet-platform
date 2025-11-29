import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

export function NewsDigestCard({
  title,
  summary,
  sentiment = 0.5,
  tags = [],
  details = "",
  accent = "#00ffa3",
}: {
  title: string;
  summary: string;
  sentiment?: number; // 0 (bearish) to 1 (bullish)
  tags?: string[];
  details?: string;
  accent?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      className="rounded-2xl shadow-xl border-2 border-[#23234d] bg-gradient-to-br from-[#181836] to-[#23234d] p-6 mb-6"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.5, type: "spring" }}
      style={{ boxShadow: `0 0 0 2px ${accent}33` }}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="font-bold text-lg text-white flex-1">{title}</span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-blue-300 hover:text-white p-2 rounded-full transition"
          aria-label="Expand details"
        >
          {open ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>
      <div className="text-blue-200 mb-2">{summary}</div>
      {/* Sentiment bar */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-blue-300">Sentiment</span>
        <div className="flex-1 h-3 rounded bg-[#23234d] overflow-hidden">
          <motion.div
            className="h-3 rounded"
            style={{
              width: `${Math.round(sentiment * 100)}%`,
              background: `linear-gradient(90deg, ${accent}, #0057ff)`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(sentiment * 100)}%` }}
            transition={{ duration: 0.7, type: "spring" }}
          />
        </div>
        <span className="text-xs font-bold" style={{ color: accent }}>
          {Math.round(sentiment * 100)}%
        </span>
      </div>
      {/* Tags */}
      <div className="flex gap-2 flex-wrap mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: accent + "22", color: accent }}
          >
            {tag}
          </span>
        ))}
      </div>
      {/* Expandable details */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="mt-2 text-blue-100 text-sm"
          >
            {details}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default NewsDigestCard;

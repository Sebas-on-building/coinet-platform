import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiAlertCircle,
  FiTrendingUp,
  FiMessageCircle,
  FiInfo,
  FiShield,
  FiArrowUpRight,
  FiLink,
  FiUsers,
  FiBookOpen,
  FiShare2,
  FiExternalLink,
  FiTwitter,
  FiSend,
  FiLink2,
} from "react-icons/fi";
import {
  FaDiscord,
  FaRedditAlien,
  FaWhatsapp,
  FaFacebookF,
  FaLinkedin,
  FaEnvelope,
} from "react-icons/fa";

export interface ChartEvent {
  time: string; // YYYY-MM-DD
  type:
    | "news"
    | "signal"
    | "onchain"
    | "custom"
    | "hack"
    | "upgrade"
    | "partnership"
    | "regulation";
  title: string;
  description: string;
  color?: string;
  icon?: React.ReactNode;
  url?: string;
  explorerUrl?: string;
  onchainTx?: string;
  onchainTxData?: {
    amount: string;
    sender: string;
    receiver: string;
    tokenSymbol?: string;
    decimals?: number;
    tokenLogo?: string;
    blockNumber?: number;
  };
  relatedEvents?: {
    title: string;
    url: string;
    whatsapp?: string;
    facebook?: string;
    linkedin?: string;
    email?: string;
  }[];
}

const typeIconMap: Record<string, React.ReactNode> = {
  news: <FiAlertCircle />,
  signal: <FiTrendingUp />,
  onchain: <FiMessageCircle />,
  custom: <FiInfo />,
  hack: <FiShield />,
  upgrade: <FiArrowUpRight />,
  partnership: <FiUsers />,
  regulation: <FiBookOpen />,
};

function getExplorerUrl(tx: string, symbol?: string) {
  if (!tx) return undefined;
  if (symbol && symbol.toLowerCase() === "solana")
    return `https://solscan.io/tx/${tx}`;
  if (symbol && symbol.toLowerCase() === "ethereum")
    return `https://etherscan.io/tx/${tx}`;
  return undefined;
}

export function ChartEventMarkers({
  events,
  xScale,
  y,
  highlightedIndex,
  assetSymbol,
}: {
  events: ChartEvent[];
  xScale: (time: string) => number; // maps time to x pixel
  y: number; // y pixel for marker row
  highlightedIndex?: number | null;
  assetSymbol?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [modalIdx, setModalIdx] = useState<number | null>(null);
  // Pulse for important types
  const pulseTypes = ["hack", "upgrade", "regulation", "signal", "onchain"];
  return (
    <>
      <svg
        className="absolute left-0 top-0 w-full h-full pointer-events-none z-30"
        style={{ pointerEvents: "none" }}
      >
        <AnimatePresence>
          {events.map((ev, i) => (
            <g key={i}>
              <foreignObject
                x={xScale(ev.time) - 12}
                y={y}
                width={24}
                height={24}
                style={{
                  pointerEvents: "auto",
                  zIndex: hovered === i || highlightedIndex === i ? 20 : 10,
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setModalIdx(i)}
              >
                <motion.div
                  className={`rounded-full shadow-lg border-2 flex items-center justify-center cursor-pointer ${hovered === i || highlightedIndex === i ? "ring-4 ring-blue-400" : ""}`}
                  style={{
                    background: ev.color || "#23234d",
                    borderColor: ev.color || "#00ffa3",
                    width: 24,
                    height: 24,
                  }}
                  initial={{ scale: 0.7, opacity: 0, y: -16 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.7, opacity: 0, y: -16 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 24,
                    delay: i * 0.07,
                  }}
                  whileHover={{ scale: 1.15, boxShadow: "0 0 0 4px #00ffa3" }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Pulse for important types */}
                  {pulseTypes.includes(ev.type) && (
                    <motion.div
                      className="absolute rounded-full"
                      style={{
                        width: 32,
                        height: 32,
                        left: -4,
                        top: -4,
                        background: ev.color || "#00ffa3",
                        opacity: 0.25,
                        zIndex: 0,
                      }}
                      animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.25, 0.1, 0.25],
                      }}
                      transition={{
                        duration: 1.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  )}
                  <span style={{ position: "relative", zIndex: 1 }}>
                    {ev.icon || typeIconMap[ev.type] || <FiInfo />}
                  </span>
                </motion.div>
              </foreignObject>
              {/* Tooltip */}
              <foreignObject
                x={xScale(ev.time) - 80}
                y={y - 70}
                width={180}
                height={60}
                style={{ pointerEvents: "auto" }}
              >
                <AnimatePresence>
                  {hovered === i && (
                    <motion.div
                      className="bg-[#23234d] border-2 border-blue-400 rounded-xl shadow-xl p-3 text-xs text-white z-50"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      style={{ pointerEvents: "auto" }}
                    >
                      <div
                        className="font-bold mb-1"
                        style={{ color: ev.color || "#00ffa3" }}
                      >
                        {ev.title}
                      </div>
                      <div className="text-blue-200 mb-1">{ev.description}</div>
                      <div className="text-blue-400 font-mono">{ev.time}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </foreignObject>
            </g>
          ))}
        </AnimatePresence>
      </svg>
      {/* Modal for event details */}
      <AnimatePresence>
        {modalIdx !== null && events[modalIdx] && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalIdx(null)}
          >
            <motion.div
              className="bg-gradient-to-br from-[#181836] to-[#23234d] rounded-2xl shadow-2xl p-8 w-full max-w-md relative border-2 border-blue-400"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="text-2xl"
                  style={{ color: events[modalIdx].color }}
                >
                  {events[modalIdx].icon ||
                    typeIconMap[events[modalIdx].type] || <FiInfo />}
                </span>
                <span
                  className="font-bold text-lg text-white"
                  style={{ color: events[modalIdx].color }}
                >
                  {events[modalIdx].title}
                </span>
              </div>
              <div className="text-blue-200 mb-2">
                {events[modalIdx].description}
              </div>
              <div className="text-blue-400 font-mono mb-2">
                {events[modalIdx].time}
              </div>
              {/* Social sharing */}
              <div className="flex gap-4 mt-4 mb-2">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(events[modalIdx].title + " " + (events[modalIdx].url || ""))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-[#00ffa3] transition"
                  title="Share on Twitter"
                >
                  <FiTwitter size={22} />
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(events[modalIdx].url || "")}&text=${encodeURIComponent(events[modalIdx].title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-[#00ffa3] transition"
                  title="Share on Telegram"
                >
                  <FiSend size={22} />
                </a>
                <a
                  href={`https://discord.com/channels/@me`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-[#00ffa3] transition"
                  title="Share on Discord"
                >
                  <FaDiscord size={22} />
                </a>
                <a
                  href={`https://reddit.com/submit?url=${encodeURIComponent(events[modalIdx].url || "")}&title=${encodeURIComponent(events[modalIdx].title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-[#00ffa3] transition"
                  title="Share on Reddit"
                >
                  <FaRedditAlien size={22} />
                </a>
                {events[modalIdx].url && (
                  <a
                    href={events[modalIdx].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-[#00ffa3] transition"
                    title="Open news link"
                  >
                    <FiExternalLink size={22} />
                  </a>
                )}
                {/* On-chain link */}
                {(events[modalIdx].explorerUrl ||
                  events[modalIdx].onchainTx) && (
                  <a
                    href={
                      events[modalIdx].explorerUrl ||
                      getExplorerUrl(
                        events[modalIdx].onchainTx || "",
                        assetSymbol,
                      )
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-[#00ffa3] transition"
                    title="View on Explorer"
                  >
                    <FiLink size={22} />
                  </a>
                )}
              </div>
              {/* On-chain data */}
              {events[modalIdx].onchainTxData && (
                <motion.div
                  className="mt-2 mb-2 p-3 rounded-xl bg-[#23234d] border border-blue-400 text-xs text-blue-200"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <div className="mb-1 font-bold text-blue-300">
                    On-Chain Transfer
                  </div>
                  <div>
                    Amount:{" "}
                    <span className="font-mono text-white">
                      {events[modalIdx].onchainTxData.amount}
                    </span>
                  </div>
                  <div>
                    Sender:{" "}
                    <span className="font-mono text-white">
                      {events[modalIdx].onchainTxData.sender}
                    </span>
                  </div>
                  <div>
                    Receiver:{" "}
                    <span className="font-mono text-white">
                      {events[modalIdx].onchainTxData.receiver}
                    </span>
                  </div>
                  {events[modalIdx].onchainTxData.tokenSymbol && (
                    <div className="flex items-center gap-2">
                      Token:{" "}
                      <span className="font-mono text-white">
                        {events[modalIdx].onchainTxData.tokenSymbol}
                      </span>{" "}
                      {events[modalIdx].onchainTxData.tokenLogo && (
                        <img
                          src={events[modalIdx].onchainTxData.tokenLogo}
                          alt="token logo"
                          className="w-5 h-5 rounded-full bg-[#23234d]"
                        />
                      )}
                    </div>
                  )}
                  {typeof events[modalIdx].onchainTxData.decimals ===
                    "number" && (
                    <div>
                      Decimals:{" "}
                      <span className="font-mono text-white">
                        {events[modalIdx].onchainTxData.decimals}
                      </span>
                    </div>
                  )}
                  {typeof events[modalIdx].onchainTxData.blockNumber ===
                    "number" && (
                    <div>
                      Block:{" "}
                      <span className="font-mono text-white">
                        {events[modalIdx].onchainTxData.blockNumber}
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
              {events[modalIdx].relatedEvents &&
                events[modalIdx].relatedEvents.length > 0 && (
                  <div className="mt-4">
                    <div className="text-blue-300 font-bold mb-2">
                      Related News
                    </div>
                    <ul className="space-y-2">
                      {events[modalIdx].relatedEvents.map((rel, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <a
                            href={rel.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <FiLink2 /> {rel.title}
                          </a>
                          {/* WhatsApp, Facebook, LinkedIn, Email sharing for related events */}
                          {rel.whatsapp && (
                            <a
                              href={rel.whatsapp}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-400 hover:text-[#00ffa3] transition"
                              title="Share on WhatsApp"
                            >
                              <FaWhatsapp size={18} />
                            </a>
                          )}
                          {rel.facebook && (
                            <a
                              href={rel.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-[#00ffa3] transition"
                              title="Share on Facebook"
                            >
                              <FaFacebookF size={18} />
                            </a>
                          )}
                          {rel.linkedin && (
                            <a
                              href={rel.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-[#00ffa3] transition"
                              title="Share on LinkedIn"
                            >
                              <FaLinkedin size={18} />
                            </a>
                          )}
                          {rel.email && (
                            <a
                              href={rel.email}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-[#00ffa3] transition"
                              title="Share via Email"
                            >
                              <FaEnvelope size={18} />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              <button
                className="mt-6 px-4 py-2 rounded bg-[#00ffa3] text-[#23234d] font-bold"
                onClick={() => setModalIdx(null)}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
export default ChartEventMarkers;

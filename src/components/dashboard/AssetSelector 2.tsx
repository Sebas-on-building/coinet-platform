import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiX } from "react-icons/fi";

const allAssets = [
  {
    label: "Solana",
    value: "solana",
    icon: "/icons/solana.svg",
    accent: "#00ffa3",
  },
  {
    label: "Bitcoin",
    value: "bitcoin",
    icon: "/icons/bitcoin.svg",
    accent: "#ffb300",
  },
  {
    label: "Ethereum",
    value: "ethereum",
    icon: "/icons/ethereum.svg",
    accent: "#0057ff",
  },
  {
    label: "Avalanche",
    value: "avalanche",
    icon: "/icons/avalanche.svg",
    accent: "#e84142",
  },
  {
    label: "Polygon",
    value: "polygon",
    icon: "/icons/polygon.svg",
    accent: "#7c3aed",
  },
  {
    label: "Dogecoin",
    value: "dogecoin",
    icon: "/icons/dogecoin.svg",
    accent: "#c2a633",
  },
  // ...add more assets as needed
];

export function AssetSelector({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: (typeof allAssets)[0]) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = allAssets.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gradient-to-br from-[#181836] to-[#23234d] rounded-2xl shadow-2xl p-8 w-full max-w-md relative border-2 border-blue-400/60 backdrop-blur-xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.4 }}
          >
            <motion.button
              className="absolute top-4 right-4 text-blue-300 hover:text-white"
              onClick={onClose}
              aria-label="Close"
              whileHover={{ scale: 1.2, color: "#00ffa3" }}
              whileTap={{ scale: 0.9 }}
            >
              <FiX size={24} />
            </motion.button>
            <div className="flex items-center gap-2 mb-4">
              <FiSearch className="text-blue-300" />
              <input
                className="flex-1 bg-transparent border-b-2 border-[#23234d] focus:border-blue-400 outline-none text-white px-2 py-1 text-lg"
                placeholder="Search assets..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto">
              {filtered.length === 0 && (
                <div className="text-blue-300 text-center py-8">
                  No assets found.
                </div>
              )}
              {filtered.map((asset) => (
                <motion.button
                  key={asset.value}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-[#23234d] transition mb-2"
                  style={{ color: asset.accent }}
                  onClick={() => {
                    onSelect(asset);
                    onClose();
                  }}
                  whileHover={{
                    scale: 1.04,
                    boxShadow: `0 0 12px ${asset.accent}`,
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  <img
                    src={asset.icon}
                    alt={asset.label}
                    className="w-7 h-7 rounded-full bg-[#23234d]"
                  />
                  <span
                    className="font-bold text-lg text-white"
                    style={{ color: asset.accent }}
                  >
                    {asset.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export default AssetSelector;

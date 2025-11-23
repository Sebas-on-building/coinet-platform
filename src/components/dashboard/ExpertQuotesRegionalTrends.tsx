import { motion } from "framer-motion";

const expertQuotes = [
  {
    name: "Jane Doe",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    quote: "Solana is setting the pace for DeFi innovation in 2024.",
    color: "#00ffa3",
  },
  {
    name: "Satoshi Nakamoto",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
    quote:
      "Bitcoin ETF approval could be a game changer for institutional adoption.",
    color: "#0057ff",
  },
  {
    name: "Vitalik Buterin",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    quote: "Ethereum upgrades will unlock new scaling possibilities.",
    color: "#ffb300",
  },
];

const regionalTrends = [
  { region: "Asia", trend: "High NFT activity", color: "#7c3aed" },
  { region: "Europe", trend: "BTC ETF buzz", color: "#0057ff" },
  { region: "US", trend: "DeFi protocol launches", color: "#00ffa3" },
];

export function ExpertQuotesRegionalTrends() {
  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-xl font-bold text-white mb-4">
        Expert Quotes & Regional Trends
      </h3>
      {/* Expert Quotes Carousel */}
      <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar mb-6">
        {expertQuotes.map((expert, idx) => (
          <motion.div
            key={expert.name}
            className="min-w-[260px] bg-[#23234d] rounded-xl p-4 shadow-lg flex flex-col items-center border-2"
            style={{ borderColor: expert.color }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx, type: "spring", stiffness: 80 }}
            whileHover={{ scale: 1.07, boxShadow: `0 0 16px ${expert.color}` }}
          >
            <img
              src={expert.avatar}
              alt={expert.name}
              className="w-14 h-14 rounded-full border-2 mb-2"
              style={{ borderColor: expert.color }}
            />
            <span className="text-white font-semibold mb-1">{expert.name}</span>
            <span className="text-blue-300 text-sm text-center">
              “{expert.quote}”
            </span>
          </motion.div>
        ))}
      </div>
      {/* Regional Trends */}
      <div className="flex gap-4 justify-center">
        {regionalTrends.map((region, idx) => (
          <motion.div
            key={region.region}
            className="bg-[#23234d] rounded-xl p-4 shadow-lg flex flex-col items-center border-2 min-w-[120px]"
            style={{ borderColor: region.color }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx, type: "spring", stiffness: 80 }}
            whileHover={{ scale: 1.07, boxShadow: `0 0 16px ${region.color}` }}
          >
            <span className="text-lg font-bold" style={{ color: region.color }}>
              {region.region}
            </span>
            <span className="text-blue-300 text-xs mt-1 text-center">
              {region.trend}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Add hide-scrollbar utility if not present in your CSS:
// .hide-scrollbar::-webkit-scrollbar { display: none; }
// .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

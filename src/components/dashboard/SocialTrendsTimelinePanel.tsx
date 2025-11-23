import { motion } from "framer-motion";

const trendingTopics = [
  { tag: "#SolanaSummer", color: "#00ffa3" },
  { tag: "#BTCETF", color: "#0057ff" },
  { tag: "#DeFi", color: "#ffb300" },
  { tag: "#Airdrop", color: "#ff4d4f" },
  { tag: "#NFTs", color: "#7c3aed" },
];

const narrativeTimeline = [
  { time: "09:00", event: "BTC ETF approval rumors surge", color: "#0057ff" },
  { time: "11:30", event: "SOL ecosystem hackathon trends", color: "#00ffa3" },
  { time: "13:00", event: "Major DeFi protocol exploit", color: "#ff4d4f" },
  { time: "15:45", event: "NFT floor prices spike", color: "#7c3aed" },
  { time: "17:20", event: "Airdrop snapshot announced", color: "#ffb300" },
];

export function SocialTrendsTimelinePanel() {
  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-xl font-bold text-white mb-4">
        Social Trends & Narrative Timeline
      </h3>
      <div className="flex flex-wrap gap-2 mb-6">
        {trendingTopics.map((topic, idx) => (
          <motion.span
            key={topic.tag}
            className="px-3 py-1 rounded-full font-mono text-sm font-bold shadow"
            style={{ background: topic.color + "22", color: topic.color }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05 * idx, type: "spring" }}
            whileHover={{ scale: 1.1, boxShadow: `0 0 12px ${topic.color}` }}
          >
            {topic.tag}
          </motion.span>
        ))}
      </div>
      <div className="relative pl-8">
        <div className="absolute left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-[#00ffa3] via-[#0057ff] to-[#ffb300] opacity-30 rounded-full" />
        <ul className="space-y-8">
          {narrativeTimeline.map((item, idx) => (
            <motion.li
              key={item.time}
              className="relative flex items-start gap-4"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * idx, type: "spring", stiffness: 80 }}
            >
              <span className="absolute left-[-2.5rem] top-1.5">
                <span
                  className="block w-4 h-4 rounded-full border-2"
                  style={{
                    background: item.color,
                    borderColor: item.color,
                    boxShadow: `0 0 8px ${item.color}`,
                  }}
                ></span>
              </span>
              <span className="text-xs text-blue-300 font-mono w-16">
                {item.time}
              </span>
              <span className="text-white font-semibold">{item.event}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

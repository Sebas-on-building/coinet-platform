import { motion } from "framer-motion";

export function SocialTrendsPanel({
  hashtags,
  influencers,
}: {
  hashtags: string[];
  influencers: Array<{ username: string; followers: number; tweet: string }>;
}) {
  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-xl font-bold text-white mb-2">Social Trends</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {hashtags.map((tag) => (
          <span
            key={tag}
            className="bg-blue-800 text-blue-200 px-3 py-1 rounded-full text-xs font-mono animate-pulse"
          >{`#${tag}`}</span>
        ))}
      </div>
      <div>
        <h4 className="text-white/80 font-semibold mb-1">Influencers:</h4>
        {influencers.map((inf) => (
          <div key={inf.username} className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 font-mono">@{inf.username}</span>
            <span className="text-xs text-gray-400">
              {inf.followers.toLocaleString()} followers
            </span>
            <span className="text-xs text-white/80 italic">"{inf.tweet}"</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

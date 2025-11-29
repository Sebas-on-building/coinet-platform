import { motion } from "framer-motion";

const mockInsights = [
  {
    title: "Your Portfolio is Outperforming the Market",
    detail: "Your portfolio grew 12% this week vs. 4% for the market average.",
    icon: "🚀",
    color: "#00ffa3",
  },
  {
    title: "High Correlation Detected",
    detail:
      "SOL and ETH in your portfolio are moving in sync (r=0.89). Consider diversifying.",
    icon: "🔗",
    color: "#0057ff",
  },
  {
    title: "Sentiment Shift",
    detail: "Market sentiment for BTC turned bullish after recent news.",
    icon: "📈",
    color: "#ffb300",
  },
];

export function PersonalizedInsightsPanel() {
  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-xl font-bold text-white mb-4">
        Personalized Insights
      </h3>
      <div className="grid gap-4">
        {mockInsights.map((insight, idx) => (
          <motion.div
            key={insight.title}
            className="flex items-center gap-4 bg-[#23234d] rounded-xl p-4 shadow-lg"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * idx, type: "spring", stiffness: 80 }}
            whileHover={{ scale: 1.03, boxShadow: `0 0 16px ${insight.color}` }}
          >
            <span className="text-3xl" style={{ color: insight.color }}>
              {insight.icon}
            </span>
            <div>
              <div className="text-white font-semibold">{insight.title}</div>
              <div className="text-blue-300 text-sm">{insight.detail}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

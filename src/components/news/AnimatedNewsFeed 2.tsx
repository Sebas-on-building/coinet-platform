import NewsDigestCard from "./NewsDigestCard";

const mockNews = [
  {
    title: "Solana Surges 15% as DeFi TVL Hits New High",
    summary:
      "Solana ecosystem sees explosive growth in DeFi, with TVL reaching record levels. Analysts cite strong developer activity and new protocol launches.",
    sentiment: 0.82,
    tags: ["Solana", "DeFi", "TVL"],
    details:
      "Solana's DeFi sector is booming, with protocols like Orca and Raydium leading the charge. Experts warn of volatility but remain bullish long-term.",
    accent: "#00ffa3",
  },
  {
    title: "Bitcoin Faces Resistance at $70k",
    summary:
      "Bitcoin struggles to break above $70,000 as traders eye macroeconomic data and ETF flows.",
    sentiment: 0.55,
    tags: ["Bitcoin", "Macro", "ETF"],
    details:
      "Market participants are watching for US inflation data and ETF inflows. Some analysts expect a short-term pullback before further upside.",
    accent: "#ffb300",
  },
  {
    title: "Ethereum Gas Fees Drop to 6-Month Low",
    summary:
      "Ethereum network sees relief as gas fees fall, boosting on-chain activity and NFT trading.",
    sentiment: 0.68,
    tags: ["Ethereum", "Gas Fees", "NFT"],
    details:
      "Lower gas costs are driving renewed interest in NFT mints and DeFi swaps. Layer 2 solutions continue to gain traction.",
    accent: "#0057ff",
  },
];

export function AnimatedNewsFeed() {
  return (
    <div className="max-w-2xl mx-auto mt-12">
      {mockNews.map((news, i) => (
        <NewsDigestCard key={i} {...news} />
      ))}
    </div>
  );
}
export default AnimatedNewsFeed;

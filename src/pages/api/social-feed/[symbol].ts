import type { NextApiRequest, NextApiResponse } from "next";

const users = [
  { name: "Alice", avatar: "https://randomuser.me/api/portraits/women/68.jpg" },
  { name: "Bob", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
  { name: "Charlie", avatar: "https://randomuser.me/api/portraits/men/45.jpg" },
  { name: "Diana", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
  { name: "Eve", avatar: "https://randomuser.me/api/portraits/women/12.jpg" },
];
const newsSamples = [
  "Bitcoin surges past $40,000 as ETF rumors swirl.",
  "Solana network sees record transaction volume.",
  "Ethereum upgrade scheduled for next week.",
  "Major exchange lists new DeFi token.",
  "Regulators discuss crypto framework in EU.",
];
const tweetSamples = [
  "Just bought more $BTC 🚀",
  "Bearish on $ETH short term, bullish long term.",
  "SOL is the future of DeFi! #Solana",
  "Watching the market closely today...",
  "Is this the start of alt season?",
];
const commentSamples = [
  "Great analysis, thanks for sharing!",
  "I disagree, here's why...",
  "Can someone explain this news?",
  "Love this dashboard UI!",
  "What are your price targets?",
];
const sentiments = ["positive", "neutral", "negative"];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFeed(symbol: string) {
  const now = Date.now();
  const feed = [];
  for (let i = 0; i < 20; i++) {
    const type = randomItem(["news", "tweet", "comment"]);
    const user = randomItem(users);
    let content = "";
    if (type === "news") content = randomItem(newsSamples);
    if (type === "tweet") content = randomItem(tweetSamples);
    if (type === "comment") content = randomItem(commentSamples);
    feed.push({
      id: `${type}-${i}-${symbol}`,
      type,
      user: user.name,
      avatar: user.avatar,
      content,
      sentiment: randomItem(sentiments),
      timestamp: now - i * 1000 * 60 * (Math.random() * 10 + 1),
    });
  }
  return feed;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { symbol } = req.query;
  const feed = generateFeed(typeof symbol === "string" ? symbol : "btc");
  res.status(200).json({ symbol, feed });
}

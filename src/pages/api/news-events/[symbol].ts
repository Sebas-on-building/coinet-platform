import type { NextApiRequest, NextApiResponse } from "next";

// Example: fetch from CryptoPanic public API (replace with your API key or use mock data)
const CRYPTOPANIC_API_KEY = process.env.CRYPTOPANIC_API_KEY;

const typeColorMap: Record<string, string> = {
  news: "#00ffa3",
  signal: "#ffb300",
  onchain: "#0057ff",
  custom: "#7c3aed",
  hack: "#ff4d4f",
  upgrade: "#e84142",
  partnership: "#c2a633",
  regulation: "#00bcd4",
  airdrop: "#ffb3e6",
  governance: "#b3ffb3",
  funding: "#b3e6ff",
  scam: "#ff4d4f",
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { symbol } = req.query;
  if (!symbol || typeof symbol !== "string") {
    return res.status(400).json({ error: "Missing symbol" });
  }

  try {
    // Example: fetch news from CryptoPanic (replace with your preferred API)
    let news: any[] = [];
    if (CRYPTOPANIC_API_KEY) {
      const url = `https://cryptopanic.com/api/v1/posts/?auth_token=${CRYPTOPANIC_API_KEY}&currencies=${symbol.toUpperCase()}&public=true`;
      const resp = await fetch(url);
      const data = await resp.json();
      news = data.results || [];
    } else {
      // Fallback: mock data with related events, on-chain data, and more social links
      news = [
        {
          published_at: "2024-06-02",
          title: `${symbol.toUpperCase()} DeFi TVL Hits ATH`,
          url: "https://example.com/news1",
          description: `${symbol.toUpperCase()} DeFi total value locked reaches new all-time high.`,
          tags: ["news"],
          relatedEvents: [
            {
              title: "Solana DEX Volume Surges",
              url: "https://example.com/related1",
              whatsapp: "https://wa.me/?text=Solana%20DEX%20Volume%20Surges",
              facebook:
                "https://facebook.com/sharer/sharer.php?u=https://example.com/related1",
              linkedin:
                "https://www.linkedin.com/sharing/share-offsite/?url=https://example.com/related1",
              email:
                "mailto:?subject=Solana%20DEX%20Volume%20Surges&body=https://example.com/related1",
            },
            {
              title: "New Protocol Launch",
              url: "https://example.com/related2",
              whatsapp: "https://wa.me/?text=New%20Protocol%20Launch",
              facebook:
                "https://facebook.com/sharer/sharer.php?u=https://example.com/related2",
              linkedin:
                "https://www.linkedin.com/sharing/share-offsite/?url=https://example.com/related2",
              email:
                "mailto:?subject=New%20Protocol%20Launch&body=https://example.com/related2",
            },
          ],
        },
        {
          published_at: "2024-06-03",
          title: "Breakout Signal",
          url: "https://example.com/news2",
          description: "Algorithmic signal: breakout detected.",
          tags: ["signal"],
          relatedEvents: [
            {
              title: "BTC RSI Crosses 70",
              url: "https://example.com/related3",
              whatsapp: "https://wa.me/?text=BTC%20RSI%20Crosses%2070",
              facebook:
                "https://facebook.com/sharer/sharer.php?u=https://example.com/related3",
              linkedin:
                "https://www.linkedin.com/sharing/share-offsite/?url=https://example.com/related3",
              email:
                "mailto:?subject=BTC%20RSI%20Crosses%2070&body=https://example.com/related3",
            },
          ],
        },
        {
          published_at: "2024-06-04",
          title: "Whale Transfer",
          url: "https://example.com/news3",
          description: "Large transfer detected on-chain.",
          tags: ["onchain"],
          onchainTx: "0x1234567890abcdef",
          onchainTxData: {
            amount: 12000,
            sender: "0xSenderAddress",
            receiver: "0xReceiverAddress",
            tokenSymbol: "SOL",
            decimals: 9,
            tokenLogo: "https://cryptologos.cc/logos/solana-sol-logo.png",
            blockNumber: 12345678,
          },
          explorerUrl: "https://etherscan.io/tx/0x1234567890abcdef",
        },
        {
          published_at: "2024-06-05",
          title: "Protocol Upgrade",
          url: "https://example.com/news4",
          description: "Major protocol upgrade announced.",
          tags: ["upgrade"],
        },
        {
          published_at: "2024-06-06",
          title: "Regulation News",
          url: "https://example.com/news5",
          description: "New regulation affecting the asset.",
          tags: ["regulation"],
        },
      ];
    }

    // Transform to ChartEvent format
    const events = news.map((n: any) => ({
      time: (n.published_at || n.created_at || "").slice(0, 10),
      type: n.tags?.[0] || "news",
      title: n.title,
      description: n.description || n.body || "",
      color: typeColorMap[n.tags?.[0] || "news"] || "#00ffa3",
      url: n.url,
      relatedEvents: n.relatedEvents,
      onchainTx: n.onchainTx,
      explorerUrl: n.explorerUrl,
      onchainTxData: n.onchainTxData,
    }));
    res.status(200).json(events);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
}

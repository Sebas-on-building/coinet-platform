export const config = {
  api: {
    coingecko: {
      baseUrl:
        process.env.NEXT_PUBLIC_COINGECKO_API ||
        "https://api.coingecko.com/api/v3",
      apiKeys: (process.env.COINGECKO_API_KEYS || "")
        .split(",")
        .filter(Boolean)
        .map((key) => ({
          key,
          rateLimit: 50,
          interval: 60000, // 1 minute
        })),
      defaultRateLimit: 50,
      defaultInterval: 60000,
    },
    etherscan: {
      baseUrl:
        process.env.NEXT_PUBLIC_ETHERSCAN_API || "https://api.etherscan.io/api",
      apiKeys: (process.env.ETHERSCAN_API_KEYS || "")
        .split(",")
        .filter(Boolean)
        .map((key) => ({
          key,
          rateLimit: 5,
          interval: 1000, // 1 second
        })),
      defaultRateLimit: 5,
      defaultInterval: 1000,
    },
    binance: {
      baseUrl: "https://api.binance.com/api/v3",
      apiKeys: (process.env.BINANCE_API_KEYS || "")
        .split(",")
        .filter(Boolean)
        .map((key) => ({
          key,
          rateLimit: 1200,
          interval: 60000, // 1 minute
        })),
      defaultRateLimit: 1200,
      defaultInterval: 60000,
    },
    twitter: {
      baseUrl:
        process.env.NEXT_PUBLIC_TWITTER_API || "https://api.twitter.com/2",
      apiKeys: (process.env.TWITTER_API_KEYS || "")
        .split(",")
        .filter(Boolean)
        .map((key) => ({
          key,
          rateLimit: 450,
          interval: 900000, // 15 minutes
        })),
      defaultRateLimit: 450,
      defaultInterval: 900000,
      apiSecret: process.env.TWITTER_API_SECRET,
    },
    reddit: {
      clientId: process.env.REDDIT_CLIENT_ID || "",
      clientSecret: process.env.REDDIT_CLIENT_SECRET || "",
      apiKeys: (process.env.REDDIT_API_KEYS || "")
        .split(",")
        .filter(Boolean)
        .map((key) => ({
          key,
          rateLimit: 60,
          interval: 60000, // 1 minute
        })),
      defaultRateLimit: 60,
      defaultInterval: 60000,
    },
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD,
    ttl: parseInt(process.env.REDIS_CACHE_TTL || "3600", 10), // 1 hour default
  },
  websocket: {
    url: process.env.NEXT_PUBLIC_WS_URL || "wss://ws.coincap.io/prices",
    binance: "wss://stream.binance.com:9443/ws",
    coingecko: "wss://streamer.cryptocompare.com/v2",
    kraken: "wss://ws.kraken.com",
    huobi: "wss://api.huobi.pro/ws",
    bitfinex: "wss://api-pub.bitfinex.com/ws/2",
    okx: "wss://ws.okx.com:8443/ws/v5/public",
    bybit: "wss://stream.bybit.com/v5/public/spot",
  },
  defaultCoin: "bitcoin",
  refreshInterval: 30000, // 30 seconds
  supportedCoins: [
    { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
    { id: "ethereum", symbol: "ETH", name: "Ethereum" },
    { id: "binancecoin", symbol: "BNB", name: "Binance Coin" },
    { id: "ripple", symbol: "XRP", name: "XRP" },
    { id: "cardano", symbol: "ADA", name: "Cardano" },
  ],
};

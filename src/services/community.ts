// Community data service for CoinProfile
// Extensible for comments, ratings, trending posts, sharing, etc.

export async function getCommunityData(coinId: string): Promise<any> {
  // Placeholder: Use real APIs and DB in production
  if (coinId === "bitcoin") {
    return {
      comments: [
        {
          user: "Alice",
          text: "BTC is the king!",
          timestamp: new Date(Date.now() - 3600 * 1000).toISOString(),
        },
        {
          user: "Bob",
          text: "ETF news is huge for adoption.",
          timestamp: new Date(Date.now() - 7200 * 1000).toISOString(),
        },
      ],
      averageRating: 4.8,
      trendingPosts: [
        {
          title: "Why Bitcoin is still undervalued",
          url: "https://community.coinet.com/post/1",
        },
        {
          title: "Best wallets for BTC in 2024",
          url: "https://community.coinet.com/post/2",
        },
      ],
      lastUpdated: new Date().toISOString(),
    };
  }
  // TODO: Add more coins and real API integration
  return {
    comments: [],
    averageRating: null,
    trendingPosts: [],
    lastUpdated: null,
  };
}

export async function getDeepCommunityStats(coinId: string): Promise<any> {
  // Placeholder: Use real APIs for community, forum, and on-chain data in production
  const now = new Date();
  const trendingPosts = [
    {
      id: 1,
      title: "Why is BTC pumping?",
      url: "#",
      upvotes: 42,
      user: "Alice",
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      title: "Best wallets for 2024?",
      url: "#",
      upvotes: 35,
      user: "Bob",
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    },
  ];
  const comments = [
    {
      id: 1,
      user: "Charlie",
      text: "I think ETF news is the main driver.",
      timestamp: new Date(now.getTime() - 90 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      user: "Dana",
      text: "Ledger and Trezor are both solid.",
      timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    },
  ];
  const leaderboards = [
    { user: "Alice", upvotes: 120 },
    { user: "Bob", upvotes: 110 },
    { user: "Charlie", upvotes: 95 },
  ];
  const moderation = [
    {
      action: "removed",
      postId: 3,
      reason: "Spam",
      timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
    },
  ];
  const anomalies = [
    {
      metric: "comments",
      description: "Unusual surge in comments",
      date: now.toISOString(),
    },
  ];
  return {
    averageRating: 4.7,
    trendingPosts,
    comments,
    leaderboards,
    moderation,
    engagement: { posts: 120, comments: 340, upvotes: 900 },
    anomalies,
    aiExplainer:
      "Community engagement is high, with trending topics around price action and wallets. Recent comment surge may be related to ETF news.",
    qna: [],
    lastUpdated: now.toISOString(),
    definition:
      "Aggregated community data from platform, forums, and on-chain. Includes trending posts, comments, ratings, leaderboards, and moderation.",
  };
}
// Extensibility: Add more features, moderation, and user profiles as needed.

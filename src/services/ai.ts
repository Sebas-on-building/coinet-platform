// AI insights data service for CoinProfile
// Extensible for OpenAI, Anthropic, custom LLMs, etc.

export async function getAiInsights(coinId: string): Promise<any> {
  // Placeholder: Use real LLM APIs in production
  if (coinId === "bitcoin") {
    return {
      summary:
        "Bitcoin is the first and most widely adopted cryptocurrency. It is often seen as digital gold and a hedge against inflation. Recent market movements have been driven by ETF approval rumors and macroeconomic factors.",
      riskScore: 0.32, // 0 (low risk) to 1 (high risk)
      keyInsights: [
        "Strong institutional interest due to ETF developments.",
        "On-chain activity remains robust with high active addresses.",
        "Community sentiment is positive, but regulatory risks remain.",
      ],
      lastUpdated: new Date().toISOString(),
    };
  }
  // TODO: Add more coins and real API integration
  return {
    summary: "No AI insights available yet.",
    riskScore: null,
    keyInsights: [],
    lastUpdated: null,
  };
}

export async function getDeepAIInsights(coinId: string): Promise<any> {
  // Placeholder: Use real LLMs and analytics in production
  const now = new Date();
  const keyInsights = [
    "ETF approval has significantly increased institutional interest.",
    "On-chain activity and active addresses are at a 6-month high.",
    "DeFi TVL and yields are trending upward, indicating capital inflow.",
    "Upcoming token unlocks may introduce short-term volatility.",
    "Community sentiment is strongly positive, with high engagement.",
  ];
  const anomalies = [
    {
      metric: "risk",
      description: "Short-term volatility risk due to unlocks",
      date: now.toISOString(),
    },
  ];
  return {
    summary:
      "Bitcoin is in a strong uptrend, driven by ETF approval, on-chain growth, and positive community sentiment. Short-term risks include upcoming token unlocks and potential regulatory headlines.",
    riskScore: 0.18, // 0 (safe) to 1 (risky)
    keyInsights,
    anomalies,
    aiExplainer:
      "AI analysis combines on-chain, market, and community data to provide actionable insights. Risk is currently low, but monitor unlocks and regulatory news.",
    qna: [],
    lastUpdated: now.toISOString(),
    definition:
      "AI-powered insights, risk scores, and summaries generated from all available data. Includes anomaly detection, trend analysis, and predictive analytics.",
  };
}

// Extensibility: Add more advanced AI features, user Q&A, and explainability as needed.

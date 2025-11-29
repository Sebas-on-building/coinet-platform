import Link from "next/link";

const FEATURES = [
  {
    name: "Dashboard",
    description: "Unified trading, analytics, and portfolio management.",
    subgroups: [
      {
        name: "Market Data",
        description: "Live prices, charts, and market movers.",
        subgroups: [
          {
            name: "Price Charts",
            description: "Real-time and historical charts.",
          },
          {
            name: "Market Movers",
            description: "Top gainers, losers, and trending coins.",
          },
        ],
      },
      {
        name: "Portfolio",
        description: "Track your assets and performance.",
        subgroups: [
          { name: "Analytics", description: "Risk, allocation, and P&L." },
          {
            name: "Custom Alerts",
            description: "Set up price, volume, and anomaly alerts.",
          },
        ],
      },
    ],
  },
  {
    name: "Analytics",
    description: "Advanced analytics and AI insights.",
    subgroups: [
      {
        name: "Technical Analysis",
        description: "Indicators, overlays, and signals.",
        subgroups: [
          {
            name: "RSI, MACD, MA",
            description: "Popular technical indicators.",
          },
          {
            name: "Custom Chart Builder",
            description: "Build your own analytics.",
          },
        ],
      },
      {
        name: "AI Insights",
        description: "Executive summaries and anomaly detection.",
        subgroups: [
          { name: "Risk Score", description: "AI-powered risk assessment." },
          {
            name: "Predictive Analytics",
            description: "Market move predictions.",
          },
        ],
      },
    ],
  },
  {
    name: "News & Social",
    description: "Crypto news, social sentiment, and community.",
    subgroups: [
      {
        name: "News Aggregator",
        description: "Latest news and verified sources.",
        subgroups: [
          { name: "Crypto News", description: "Curated news feed." },
          { name: "Verified News", description: "Fact-checked updates." },
        ],
      },
      {
        name: "Social Analytics",
        description: "Sentiment and engagement metrics.",
        subgroups: [
          { name: "Twitter/Reddit", description: "Social media analysis." },
          { name: "Influencer Tracking", description: "Key opinion leaders." },
        ],
      },
    ],
  },
  {
    name: "DeFi & On-Chain",
    description: "DeFi stats, on-chain metrics, and blockchain analytics.",
    subgroups: [
      {
        name: "DeFi Stats",
        description: "TVL, yields, and protocol health.",
        subgroups: [
          { name: "TVL", description: "Total value locked." },
          { name: "Yields", description: "Current DeFi yields." },
        ],
      },
      {
        name: "On-Chain Analytics",
        description: "Transactions, fees, and activity.",
        subgroups: [
          { name: "Active Addresses", description: "Network usage." },
          { name: "MEV Monitor", description: "Miner extractable value." },
        ],
      },
    ],
  },
];

function FeatureCard({ feature }: any) {
  return (
    <div className="bg-gradient-to-br from-[#18192b] to-[#23234d] rounded-2xl shadow-xl p-6 hover:scale-105 transition-all border border-[#23234d] min-w-[260px] max-w-xs mx-auto">
      <h3 className="text-xl font-bold text-white mb-2">{feature.name}</h3>
      <p className="text-gray-300 mb-4 text-sm">{feature.description}</p>
      <div className="space-y-2">
        {feature.subgroups.map((sg: any) => (
          <div key={sg.name} className="bg-[#23234d] rounded-lg p-3 mb-1">
            <div className="font-semibold text-blue-300">{sg.name}</div>
            <div className="text-xs text-gray-400 mb-1">{sg.description}</div>
            <div className="flex flex-wrap gap-2 mt-1">
              {sg.subgroups.map((ssg: any) => (
                <span
                  key={ssg.name}
                  className="bg-blue-900 text-blue-200 px-2 py-1 rounded text-xs"
                >
                  {ssg.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingHero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-[#0a0a23] via-[#18192b] to-[#23234d] px-4 py-16 overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="w-full h-full bg-gradient-to-tr from-purple-900/30 via-blue-900/20 to-transparent" />
      </div>
      <div className="relative z-10 max-w-3xl text-center mb-16">
        <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight drop-shadow-xl">
          Coinet: Unified Crypto Intelligence
        </h1>
        <p className="text-xl md:text-2xl text-blue-200 mb-8 font-medium drop-shadow-lg">
          All your trading, analytics, DeFi, and social tools in one powerful,
          beautiful platform.
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg transition"
          >
            Go to Dashboard
          </Link>
          <a
            href="#features"
            className="bg-gray-800 hover:bg-gray-700 text-blue-200 font-semibold px-8 py-4 rounded-xl text-lg shadow-lg transition border border-blue-700"
          >
            Explore Features
          </a>
        </div>
      </div>
      <div
        id="features"
        className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl"
      >
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.name} feature={feature} />
        ))}
      </div>
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#23234d] to-transparent pointer-events-none" />
    </section>
  );
}

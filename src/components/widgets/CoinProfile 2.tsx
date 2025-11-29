import { useQuery } from "@tanstack/react-query";
import {
  getCoinProfile,
  CoinProfile as CoinProfileType,
} from "@/services/coinProfile";
import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Twitter,
  MessageCircle,
  Code2,
  GitBranch,
  Star,
  GitFork,
  AlertCircle,
  CalendarCheck2,
  Newspaper,
  Banknote,
  Sparkles,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { CoinProfileSocialDeep } from "./CoinProfileSocialDeep";
import { CoinProfileDevDeep } from "./CoinProfileDevDeep";
import { CoinProfileNewsDeep } from "./CoinProfileNewsDeep";
import { CoinProfileTokenomicsDeep } from "./CoinProfileTokenomicsDeep";
import { CoinProfileDeFiDeep } from "./CoinProfileDeFiDeep";
import { CoinProfileHistoricalDeep } from "./CoinProfileHistoricalDeep";
import { CoinProfileCommunityDeep } from "./CoinProfileCommunityDeep";
import { CoinProfileAIDeep } from "./CoinProfileAIDeep";

const TABS = [
  "Overview",
  "On-Chain",
  "Social",
  "Dev",
  "News",
  "Tokenomics",
  "DeFi",
  "Historical",
  "Community",
  "AI Insights",
];

export function CoinProfile({ coinId }: { coinId: string }) {
  const { data, isLoading, error } = useQuery<CoinProfileType>({
    queryKey: ["coin-profile", coinId],
    queryFn: () => getCoinProfile(coinId),
  });
  const [tab, setTab] = useState("Overview");

  if (isLoading) return <div className="text-gray-400">Loading profile...</div>;
  if (error || !data)
    return <div className="text-red-400">Failed to load coin profile.</div>;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <img
            src={data.image}
            alt={data.name}
            className="w-12 h-12 rounded-full"
          />
          <div>
            <h2 className="text-2xl font-bold">
              {data.name}{" "}
              <span className="text-lg text-gray-400 uppercase">
                ({data.symbol})
              </span>
            </h2>
            <div className="text-xs text-gray-500">
              {data.description?.slice(0, 120)}...
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap mt-2 md:mt-0">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded ${tab === t ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {tab === "Overview" && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Market Data</h3>
            <pre className="bg-gray-100 dark:bg-gray-800 rounded p-2 overflow-x-auto text-xs">
              {JSON.stringify(data.marketData, null, 2)}
            </pre>
          </div>
        )}
        {tab === "On-Chain" && (
          <div>
            <h3 className="text-lg font-semibold mb-2">On-Chain Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-4 flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-1">
                  Active Addresses
                </span>
                <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {data.onChainStats.activeAddresses?.toLocaleString() ?? "N/A"}
                </span>
                <BarChart3 className="h-5 w-5 text-blue-400 mt-2" />
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded p-4 flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-1">Transactions</span>
                <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {data.onChainStats.transactions?.toLocaleString() ?? "N/A"}
                </span>
                <BarChart3 className="h-5 w-5 text-green-400 mt-2" />
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded p-4 flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-1">
                  Circulating Supply
                </span>
                <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  {data.onChainStats.circulatingSupply?.toLocaleString() ??
                    "N/A"}
                </span>
                <BarChart3 className="h-5 w-5 text-yellow-400 mt-2" />
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 rounded p-4 flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-1">Holders</span>
                <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {data.onChainStats.holders?.toLocaleString() ?? "N/A"}
                </span>
                <BarChart3 className="h-5 w-5 text-purple-400 mt-2" />
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Last updated:{" "}
              {data.onChainStats.lastUpdated
                ? new Date(data.onChainStats.lastUpdated).toLocaleString()
                : "N/A"}
            </div>
            <div className="text-xs text-neutral-400 mt-2">
              More on-chain metrics and charts coming soon!
            </div>
          </div>
        )}
        {tab === "Social" && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Social Metrics</h3>
            <CoinProfileSocialDeep coinId={coinId} />
          </div>
        )}
        {tab === "Dev" && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Development Activity</h3>
            <CoinProfileDevDeep coinId={coinId} />
          </div>
        )}
        {tab === "News" && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Latest News</h3>
            <CoinProfileNewsDeep coinId={coinId} />
          </div>
        )}
        {tab === "Tokenomics" && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Tokenomics</h3>
            <CoinProfileTokenomicsDeep coinId={coinId} />
          </div>
        )}
        {tab === "DeFi" && (
          <div>
            <h3 className="text-lg font-semibold mb-2">DeFi Stats</h3>
            <CoinProfileDeFiDeep coinId={coinId} />
          </div>
        )}
        {tab === "Historical" && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Historical Data</h3>
            <CoinProfileHistoricalDeep coinId={coinId} />
          </div>
        )}
        {tab === "Community" && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Community</h3>
            <CoinProfileCommunityDeep coinId={coinId} />
          </div>
        )}
        {tab === "AI Insights" && (
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-400" />
              AI Insights
            </h3>
            <CoinProfileAIDeep coinId={coinId} />
          </div>
        )}
      </div>
      <div className="text-xs text-neutral-400 mt-4">
        Tip: Explore all tabs for deep insights. Community and AI features
        coming soon!
      </div>
    </div>
  );
}

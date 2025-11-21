import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/services/api";
import {
  CurrencyDollarIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  ScaleIcon,
} from "@heroicons/react/24/solid";

interface DeFiProtocol {
  name: string;
  type: "lending" | "dex" | "yield" | "bridge";
  tvl: number;
  apy: number;
  volume_24h: number;
  risk_score: number;
  supported_assets: string[];
  features: string[];
  security: {
    audit_status: "audited" | "in_progress" | "not_audited";
    audit_firm?: string;
    insurance_coverage: boolean;
    total_incidents: number;
  };
}

interface LendingOpportunity {
  protocol: string;
  asset: string;
  supply_apy: number;
  borrow_apy: number;
  total_supplied: number;
  total_borrowed: number;
  utilization_rate: number;
  collateral_factor: number;
  liquidation_threshold: number;
}

interface YieldOpportunity {
  protocol: string;
  pool_name: string;
  assets: string[];
  apy: number;
  tvl: number;
  risk_level: "low" | "medium" | "high";
  rewards_tokens: string[];
  min_deposit: number;
  fees: {
    deposit: number;
    withdrawal: number;
    performance: number;
  };
}

interface SwapRoute {
  from_token: string;
  to_token: string;
  amount_in: number;
  amount_out: number;
  price_impact: number;
  route: {
    protocol: string;
    path: string[];
    portion: number;
  }[];
  gas_estimate: number;
}

export function DeFiHub() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "lending" | "yield" | "swap"
  >("overview");
  const [selectedAsset, setSelectedAsset] = useState("USDC");
  const [protocols, setProtocols] = useState<DeFiProtocol[]>([]);
  const [lendingOpportunities, setLendingOpportunities] = useState<
    LendingOpportunity[]
  >([]);
  const [yieldOpportunities, setYieldOpportunities] = useState<
    YieldOpportunity[]
  >([]);
  const [bestSwapRoutes, setBestSwapRoutes] = useState<SwapRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [protocolsData, lendingData, yieldData, swapData] =
          await Promise.all([
            api.getDefiProtocols(),
            api.getLendingOpportunities(selectedAsset),
            api.getYieldOpportunities(selectedAsset),
            api.getBestSwapRoutes(selectedAsset, "ETH", 1000),
          ]);
        setProtocols(protocolsData);
        setLendingOpportunities(lendingData);
        setYieldOpportunities(yieldData);
        setBestSwapRoutes(swapData as unknown as SwapRoute[]);
      } catch (error) {
        console.error("Error fetching DeFi data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 60 * 1000); // Update every minute
    return () => clearInterval(intervalId);
  }, [selectedAsset]);

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Protocol Categories */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            type: "lending",
            icon: <BanknotesIcon className="h-5 w-5" />,
            color: "blue",
          },
          {
            type: "dex",
            icon: <ArrowsRightLeftIcon className="h-5 w-5" />,
            color: "purple",
          },
          {
            type: "yield",
            icon: <ChartBarIcon className="h-5 w-5" />,
            color: "green",
          },
          {
            type: "bridge",
            icon: <ArrowTrendingUpIcon className="h-5 w-5" />,
            color: "orange",
          },
        ].map(({ type, icon, color }) => {
          const typeProtocols = protocols.filter((p) => p.type === type);
          const totalTVL = typeProtocols.reduce((sum, p) => sum + p.tvl, 0);

          return (
            <Card key={type} variant="glass" className="p-4">
              <div className={`text-${color}-400 mb-2 flex items-center gap-2`}>
                {icon}
                <h3 className="text-lg font-medium capitalize">{type}</h3>
              </div>
              <p className="text-2xl font-bold">${totalTVL.toLocaleString()}</p>
              <p className="text-sm text-gray-400">Total Value Locked</p>
              <p className="text-xs text-gray-500 mt-1">
                {typeProtocols.length} protocols
              </p>
            </Card>
          );
        })}
      </div>

      {/* Top Protocols */}
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-medium mb-4">Top Protocols by TVL</h3>
        <div className="space-y-4">
          {protocols
            .sort((a, b) => b.tvl - a.tvl)
            .slice(0, 5)
            .map((protocol) => (
              <div
                key={protocol.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="font-medium">{protocol.name}</span>
                    <span className="text-sm text-gray-400 capitalize">
                      {protocol.type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="font-medium">
                      ${protocol.tvl.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-sm text-gray-400">APY</span>
                      <Badge variant="success">
                        {protocol.apy.toFixed(2)}%
                      </Badge>
                    </div>
                  </div>
                  <Badge
                    variant={
                      protocol.security.audit_status === "audited"
                        ? "success"
                        : "warning"
                    }
                    icon={<ShieldCheckIcon className="h-4 w-4" />}
                  >
                    {protocol.security.audit_status === "audited"
                      ? "Audited"
                      : "Pending Audit"}
                  </Badge>
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );

  const renderLendingTab = () => (
    <div className="space-y-6">
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Lending Markets</h3>
          <select
            className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2"
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
          >
            <option value="USDC">USDC</option>
            <option value="ETH">ETH</option>
            <option value="WBTC">WBTC</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">
                  Protocol
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-400">
                  Supply APY
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-400">
                  Borrow APY
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-400">
                  Total Supplied
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-400">
                  Utilization
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-400">
                  Collateral Factor
                </th>
              </tr>
            </thead>
            <tbody>
              {lendingOpportunities.map((market) => (
                <tr key={market.protocol} className="border-t border-gray-800">
                  <td className="px-4 py-3">{market.protocol}</td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant="success">
                      {market.supply_apy.toFixed(2)}%
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant="warning">
                      {market.borrow_apy.toFixed(2)}%
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${market.total_supplied.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-gray-200/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${market.utilization_rate * 100}%` }}
                        />
                      </div>
                      <span>{(market.utilization_rate * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(market.collateral_factor * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderYieldTab = () => (
    <div className="space-y-6">
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Yield Opportunities</h3>
          <select
            className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2"
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
          >
            <option value="USDC">USDC</option>
            <option value="ETH">ETH</option>
            <option value="WBTC">WBTC</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {yieldOpportunities.map((opportunity) => (
            <Card
              key={`${opportunity.protocol}-${opportunity.pool_name}`}
              variant="glass"
              className="p-4"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-medium">{opportunity.protocol}</h4>
                  <p className="text-sm text-gray-400">
                    {opportunity.pool_name}
                  </p>
                </div>
                <Badge
                  variant={
                    opportunity.risk_level === "low"
                      ? "success"
                      : opportunity.risk_level === "medium"
                        ? "warning"
                        : "danger"
                  }
                >
                  {opportunity.risk_level} risk
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-400">APY</p>
                  <p className="text-2xl font-bold text-green-400">
                    {opportunity.apy.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">TVL</p>
                  <p className="text-2xl font-bold">
                    ${opportunity.tvl.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Assets</span>
                  <div className="flex gap-1">
                    {opportunity.assets.map((asset) => (
                      <Badge key={asset} variant="default">
                        {asset}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Rewards</span>
                  <div className="flex gap-1">
                    {opportunity.rewards_tokens.map((token) => (
                      <Badge key={token} variant="default">
                        {token}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Min. Deposit</span>
                  <span>${opportunity.min_deposit.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Fees</span>
                  <div className="text-right">
                    <div>Entry: {opportunity.fees.deposit}%</div>
                    <div>Exit: {opportunity.fees.withdrawal}%</div>
                    <div>Performance: {opportunity.fees.performance}%</div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderSwapTab = () => (
    <div className="space-y-6">
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Smart Order Router</h3>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">From</label>
              <select
                className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2"
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
              >
                <option value="USDC">USDC</option>
                <option value="ETH">ETH</option>
                <option value="WBTC">WBTC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Amount</label>
              <input
                type="number"
                className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2"
                placeholder="Enter amount"
                value="1000"
                onChange={() => {}}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">To</label>
              <select
                className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2"
                value="ETH"
                onChange={() => {}}
              >
                <option value="ETH">ETH</option>
                <option value="USDC">USDC</option>
                <option value="WBTC">WBTC</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {bestSwapRoutes.map((route, index) => (
            <div key={index} className="bg-gray-800/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium">
                    {route.amount_in.toLocaleString()} {route.from_token}
                  </span>
                  <ArrowsRightLeftIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-lg font-medium">
                    {route.amount_out.toLocaleString()} {route.to_token}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={route.price_impact < 1 ? "success" : "warning"}
                  >
                    Impact: {route.price_impact.toFixed(2)}%
                  </Badge>
                  <Badge variant="default">
                    Gas: {route.gas_estimate.toLocaleString()} GWEI
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {route.route.map((step, stepIndex) => (
                    <div key={stepIndex} className="flex-1 flex items-center">
                      <div className="bg-gray-800/50 rounded-lg px-3 py-2 text-sm">
                        {step.protocol}
                      </div>
                      {stepIndex < route.route.length - 1 && (
                        <>
                          <div className="h-px flex-1 border-t border-dashed border-gray-600 mx-2" />
                          <Badge variant="default" className="text-xs">
                            {step.path[step.path.length - 1]}
                          </Badge>
                          <div className="h-px flex-1 border-t border-dashed border-gray-600 mx-2" />
                        </>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="text-gray-400 mb-2">Route Details</h4>
                    <div className="space-y-1">
                      {route.route.map((step, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{step.protocol}</span>
                          <span>{(step.portion * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-gray-400 mb-2">Route Metrics</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Price Impact</span>
                        <span
                          className={
                            route.price_impact < 1
                              ? "text-green-400"
                              : "text-yellow-400"
                          }
                        >
                          {route.price_impact.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gas Cost</span>
                        <span>{route.gas_estimate.toLocaleString()} GWEI</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Minimum Received</span>
                        <span>
                          {(route.amount_out * 0.995).toFixed(4)}{" "}
                          {route.to_token}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm">
                    View Details
                  </Button>
                  <Button variant="primary" size="sm">
                    Execute Swap
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-medium mb-4">Market Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-4">
              Price Impact Analysis
            </h4>
            <div className="space-y-3">
              {[1000, 10000, 100000].map((amount) => (
                <div key={amount} className="bg-gray-800/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">${amount.toLocaleString()}</span>
                    <Badge variant={amount < 50000 ? "success" : "warning"}>
                      {(0.1 + (amount / 100000) * 0.5).toFixed(2)}% Impact
                    </Badge>
                  </div>
                  <div className="w-full h-2 bg-gray-200/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${amount < 50000 ? "bg-green-500" : "bg-yellow-500"}`}
                      style={{
                        width: `${Math.min((amount / 100000) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-4">
              Liquidity Distribution
            </h4>
            <div className="space-y-3">
              {["Uniswap V3", "Curve", "Balancer"].map((dex) => (
                <div key={dex} className="bg-gray-800/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">{dex}</span>
                    <span className="text-sm">
                      ${(Math.random() * 10000000).toFixed(0).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${Math.random() * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-4">
              Gas Optimization
            </h4>
            <div className="space-y-3">
              {["Fast", "Standard", "Slow"].map((speed) => (
                <div key={speed} className="bg-gray-800/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">{speed}</span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          speed === "Fast"
                            ? "danger"
                            : speed === "Standard"
                              ? "warning"
                              : "success"
                        }
                      >
                        {speed === "Fast"
                          ? "15"
                          : speed === "Standard"
                            ? "5"
                            : "2"}{" "}
                        GWEI
                      </Badge>
                      <span className="text-sm text-gray-400">
                        ~
                        {speed === "Fast"
                          ? "30s"
                          : speed === "Standard"
                            ? "1m"
                            : "2m"}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-200/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        speed === "Fast"
                          ? "bg-red-500"
                          : speed === "Standard"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                      style={{
                        width:
                          speed === "Fast"
                            ? "100%"
                            : speed === "Standard"
                              ? "66%"
                              : "33%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CurrencyDollarIcon className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-semibold">DeFi Integration Hub</h2>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {(["overview", "lending", "yield", "swap"] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "primary" : "ghost"}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === "overview" && renderOverviewTab()}
          {activeTab === "lending" && renderLendingTab()}
          {activeTab === "yield" && renderYieldTab()}
          {activeTab === "swap" && renderSwapTab()}
        </div>
      )}
    </div>
  );
}

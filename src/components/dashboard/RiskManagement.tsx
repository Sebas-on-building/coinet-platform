import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/services/api";
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ShieldExclamationIcon,
  ChartPieIcon,
  ScaleIcon,
  BoltIcon,
} from "@heroicons/react/24/solid";

interface RiskMetrics {
  valueAtRisk: {
    daily: number;
    weekly: number;
    monthly: number;
    confidence: number;
    historical: {
      date: string;
      value: number;
    }[];
    conditionalVar: number; // Expected Shortfall/CVaR
    componentVar: {
      // VaR contribution by asset
      asset: string;
      value: number;
      percentage: number;
    }[];
  };
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  beta: number;
  alpha: number;
  treynorRatio: number;
  informationRatio: number;
  calmarRatio: number;
  trackingError: number;
  downCapture: number;
  upCapture: number;
  correlationMatrix: {
    asset1: string;
    asset2: string;
    correlation: number;
    covariance: number;
    betweenReturn: number;
  }[];
  stressTests: {
    scenario: string;
    impact: number;
    description: string;
    affectedAssets: string[];
    probabilityScore: number;
    recoveryEstimate: {
      timeframe: string;
      percentage: number;
    };
    historicalPrecedent?: {
      date: string;
      description: string;
      recovery: {
        duration: string;
        percentage: number;
      };
    };
  }[];
  riskContribution: {
    asset: string;
    contribution: number;
    volatility: number;
    tailRisk: number;
    liquidityScore: number;
    concentrationRisk: number;
    counterpartyRisk?: {
      score: number;
      factors: string[];
    };
  }[];
  optimalPortfolio: {
    weights: {
      asset: string;
      current: number;
      suggested: number;
      reason: string[];
    }[];
    expectedReturn: number;
    expectedRisk: number;
    sharpeRatio: number;
    turnover: number;
    rebalancingCost: number;
  };
  riskDecomposition: {
    market: number;
    size: number;
    value: number;
    momentum: number;
    volatility: number;
    other: number;
  };
  scenarioAnalysis: {
    name: string;
    probability: number;
    impact: {
      portfolio: number;
      byAsset: {
        asset: string;
        impact: number;
      }[];
    };
    triggers: string[];
    hedgingSuggestions: {
      instrument: string;
      allocation: number;
      cost: number;
      effectiveness: number;
    }[];
  }[];
  liquidityAnalysis: {
    portfolioScore: number;
    timeToLiquidate: {
      percentage: number;
      days: number;
      slippage: number;
    }[];
    assetScores: {
      asset: string;
      score: number;
      averageVolume: number;
      daysToLiquidate: number;
    }[];
  };
}

interface PortfolioAsset {
  symbol: string;
  amount: number;
  value_usd: number;
  weight: number;
  risk_score: number;
}

export function RiskManagement() {
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "correlation" | "stress" | "optimization"
  >("overview");
  const [timeframe, setTimeframe] = useState<"1d" | "1w" | "1m">("1d");
  const [confidenceLevel, setConfidenceLevel] = useState<0.95 | 0.99>(0.95);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [metricsData, portfolioData] = await Promise.all([
          api.getRiskMetrics(timeframe, confidenceLevel),
          api.getPortfolioAssets(),
        ]);
        setRiskMetrics(metricsData);
        setPortfolio(portfolioData);
      } catch (error) {
        console.error("Error fetching risk data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeframe, confidenceLevel]);

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* VaR Analysis */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Value at Risk Analysis</h3>
          <div className="flex gap-2">
            <select
              className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2"
              value={confidenceLevel}
              onChange={(e) =>
                setConfidenceLevel(Number(e.target.value) as 0.95 | 0.99)
              }
            >
              <option value={0.95}>95% Confidence</option>
              <option value={0.99}>99% Confidence</option>
            </select>
            <select
              className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2"
              value={timeframe}
              onChange={(e) =>
                setTimeframe(e.target.value as "1d" | "1w" | "1m")
              }
            >
              <option value="1d">Daily</option>
              <option value="1w">Weekly</option>
              <option value="1m">Monthly</option>
            </select>
          </div>
        </div>

        {riskMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/30 rounded-lg p-4">
              <p className="text-sm text-gray-400">Daily VaR</p>
              <p className="text-2xl font-bold text-red-500">
                ${riskMetrics.valueAtRisk.daily.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                Maximum expected daily loss at {confidenceLevel * 100}%
                confidence
              </p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-4">
              <p className="text-sm text-gray-400">Weekly VaR</p>
              <p className="text-2xl font-bold text-orange-500">
                ${riskMetrics.valueAtRisk.weekly.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                Maximum expected weekly loss at {confidenceLevel * 100}%
                confidence
              </p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-4">
              <p className="text-sm text-gray-400">Monthly VaR</p>
              <p className="text-2xl font-bold text-yellow-500">
                ${riskMetrics.valueAtRisk.monthly.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                Maximum expected monthly loss at {confidenceLevel * 100}%
                confidence
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="glass" className="p-6">
          <h3 className="text-lg font-medium mb-4">
            Risk-Adjusted Performance
          </h3>
          {riskMetrics && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Sharpe Ratio</span>
                <Badge
                  variant={riskMetrics.sharpeRatio > 1 ? "success" : "warning"}
                  icon={<ChartBarIcon className="h-4 w-4" />}
                >
                  {riskMetrics.sharpeRatio.toFixed(2)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Sortino Ratio</span>
                <Badge
                  variant={riskMetrics.sortinoRatio > 1 ? "success" : "warning"}
                  icon={<ChartBarIcon className="h-4 w-4" />}
                >
                  {riskMetrics.sortinoRatio.toFixed(2)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Maximum Drawdown</span>
                <Badge
                  variant="danger"
                  icon={<ArrowTrendingDownIcon className="h-4 w-4" />}
                >
                  {riskMetrics.maxDrawdown.toFixed(2)}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Portfolio Beta</span>
                <Badge
                  variant={riskMetrics.beta < 1 ? "success" : "warning"}
                  icon={<ScaleIcon className="h-4 w-4" />}
                >
                  {riskMetrics.beta.toFixed(2)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Alpha (annualized)
                </span>
                <Badge
                  variant={riskMetrics.alpha > 0 ? "success" : "danger"}
                  icon={<ArrowTrendingUpIcon className="h-4 w-4" />}
                >
                  {riskMetrics.alpha.toFixed(2)}%
                </Badge>
              </div>
            </div>
          )}
        </Card>

        <Card variant="glass" className="p-6">
          <h3 className="text-lg font-medium mb-4">
            Risk Contribution by Asset
          </h3>
          {riskMetrics && (
            <div className="space-y-3">
              {riskMetrics.riskContribution.map((asset) => (
                <div
                  key={asset.asset}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{asset.asset}</span>
                    <span className="text-xs text-gray-500">
                      Vol: {asset.volatility.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${asset.contribution * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {(asset.contribution * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );

  const renderCorrelationTab = () => (
    <div className="space-y-6">
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-medium mb-4">Asset Correlation Matrix</h3>
        {riskMetrics && (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  {portfolio.map((asset) => (
                    <th
                      key={asset.symbol}
                      className="px-4 py-2 text-left text-sm font-medium text-gray-500"
                    >
                      {asset.symbol}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {portfolio.map((asset1) => (
                  <tr key={asset1.symbol}>
                    {portfolio.map((asset2) => {
                      const correlation =
                        riskMetrics.correlationMatrix.find(
                          (c) =>
                            (c.asset1 === asset1.symbol &&
                              c.asset2 === asset2.symbol) ||
                            (c.asset1 === asset2.symbol &&
                              c.asset2 === asset1.symbol),
                        )?.correlation || 0;

                      const getCorrelationColor = (value: number) => {
                        if (value === 1) return "bg-gray-800/50";
                        if (value > 0.5) return "bg-red-500/10 text-red-400";
                        if (value < -0.5)
                          return "bg-green-500/10 text-green-400";
                        return "bg-gray-800/30";
                      };

                      return (
                        <td
                          key={`${asset1.symbol}-${asset2.symbol}`}
                          className={`px-4 py-2 text-sm ${getCorrelationColor(correlation)}`}
                        >
                          {correlation.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );

  const renderStressTab = () => (
    <div className="space-y-6">
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-medium mb-4">Stress Test Scenarios</h3>
        {riskMetrics && (
          <div className="space-y-4">
            {riskMetrics.stressTests.map((test) => (
              <div
                key={test.scenario}
                className="bg-gray-800/30 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{test.scenario}</h4>
                    <p className="text-sm text-gray-400">{test.description}</p>
                  </div>
                  <Badge
                    variant={test.impact > -10 ? "warning" : "danger"}
                    icon={<BoltIcon className="h-4 w-4" />}
                  >
                    {test.impact.toFixed(2)}%
                  </Badge>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">Affected Assets:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {test.affectedAssets.map((asset) => (
                      <Badge key={asset} variant="default">
                        {asset}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  const renderOptimizationTab = () => (
    <div className="space-y-6">
      {riskMetrics && (
        <>
          <Card variant="glass" className="p-6">
            <h3 className="text-lg font-medium mb-4">Portfolio Optimization</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-4">
                  Suggested Allocation Changes
                </h4>
                <div className="space-y-4">
                  {riskMetrics.optimalPortfolio.weights.map((weight) => (
                    <div
                      key={weight.asset}
                      className="bg-gray-800/30 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{weight.asset}</span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              weight.current === weight.suggested
                                ? "success"
                                : "warning"
                            }
                          >
                            {(weight.current * 100).toFixed(1)}% →{" "}
                            {(weight.suggested * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {weight.reason.map((reason, index) => (
                          <p key={index} className="text-sm text-gray-400">
                            • {reason}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-4">
                    Expected Portfolio Metrics
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <p className="text-sm text-gray-400">Expected Return</p>
                      <p className="text-2xl font-bold text-green-400">
                        {riskMetrics.optimalPortfolio.expectedReturn.toFixed(1)}
                        %
                      </p>
                    </div>
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <p className="text-sm text-gray-400">Expected Risk</p>
                      <p className="text-2xl font-bold text-yellow-400">
                        {riskMetrics.optimalPortfolio.expectedRisk.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <p className="text-sm text-gray-400">Sharpe Ratio</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {riskMetrics.optimalPortfolio.sharpeRatio.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <p className="text-sm text-gray-400">
                        Portfolio Turnover
                      </p>
                      <p className="text-2xl font-bold">
                        {(riskMetrics.optimalPortfolio.turnover * 100).toFixed(
                          1,
                        )}
                        %
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-4">
                    Risk Decomposition
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(riskMetrics.riskDecomposition).map(
                      ([factor, value]) => (
                        <div
                          key={factor}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm capitalize">{factor}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${value * 100}%` }}
                              />
                            </div>
                            <span className="text-sm">
                              {(value * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card variant="glass" className="p-6">
            <h3 className="text-lg font-medium mb-4">
              Scenario Analysis & Hedging
            </h3>
            <div className="space-y-6">
              {riskMetrics.scenarioAnalysis.map((scenario) => (
                <div
                  key={scenario.name}
                  className="bg-gray-800/30 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium">{scenario.name}</h4>
                      <p className="text-sm text-gray-400">
                        Probability: {(scenario.probability * 100).toFixed(1)}%
                      </p>
                    </div>
                    <Badge
                      variant={
                        scenario.impact.portfolio >= 0 ? "success" : "danger"
                      }
                      icon={
                        scenario.impact.portfolio >= 0 ? (
                          <ArrowTrendingUpIcon className="h-4 w-4" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-4 w-4" />
                        )
                      }
                    >
                      {scenario.impact.portfolio >= 0 ? "+" : ""}
                      {scenario.impact.portfolio.toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-sm font-medium text-gray-400 mb-2">
                        Impact by Asset
                      </h5>
                      <div className="space-y-2">
                        {scenario.impact.byAsset.map((asset) => (
                          <div
                            key={asset.asset}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm">{asset.asset}</span>
                            <Badge
                              variant={asset.impact >= 0 ? "success" : "danger"}
                            >
                              {asset.impact >= 0 ? "+" : ""}
                              {asset.impact.toFixed(1)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-400 mb-2">
                        Triggers
                      </h5>
                      <div className="space-y-1">
                        {scenario.triggers.map((trigger, index) => (
                          <p key={index} className="text-sm">
                            • {trigger}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-400 mb-2">
                      Hedging Suggestions
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {scenario.hedgingSuggestions.map((hedge, index) => (
                        <div
                          key={index}
                          className="bg-gray-800/50 rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">
                              {hedge.instrument}
                            </span>
                            <Badge variant="default">
                              {(hedge.allocation * 100).toFixed(1)}%
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">
                              Cost: ${hedge.cost}
                            </span>
                            <span className="text-gray-400">
                              Effectiveness:{" "}
                              {(hedge.effectiveness * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="glass" className="p-6">
            <h3 className="text-lg font-medium mb-4">Liquidity Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="bg-gray-800/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Portfolio Liquidity Score</h4>
                    <Badge
                      variant={
                        riskMetrics.liquidityAnalysis.portfolioScore >= 90
                          ? "success"
                          : riskMetrics.liquidityAnalysis.portfolioScore >= 70
                            ? "warning"
                            : "danger"
                      }
                    >
                      {riskMetrics.liquidityAnalysis.portfolioScore}/100
                    </Badge>
                  </div>
                </div>

                <h4 className="text-sm font-medium text-gray-400 mb-2">
                  Time to Liquidate
                </h4>
                <div className="space-y-3">
                  {riskMetrics.liquidityAnalysis.timeToLiquidate.map((time) => (
                    <div
                      key={time.percentage}
                      className="bg-gray-800/30 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span>{time.percentage}% of Portfolio</span>
                        <div className="text-right">
                          <p className="font-medium">{time.days} days</p>
                          <p className="text-sm text-gray-400">
                            Est. Slippage: {time.slippage.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-4">
                  Asset Liquidity Scores
                </h4>
                <div className="space-y-4">
                  {riskMetrics.liquidityAnalysis.assetScores.map((asset) => (
                    <div
                      key={asset.asset}
                      className="bg-gray-800/30 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{asset.asset}</span>
                        <Badge
                          variant={
                            asset.score >= 90
                              ? "success"
                              : asset.score >= 70
                                ? "warning"
                                : "danger"
                          }
                        >
                          {asset.score}/100
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm text-gray-400">
                        <div className="flex justify-between">
                          <span>24h Volume:</span>
                          <span>
                            ${(asset.averageVolume / 1e6).toFixed(1)}M
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Days to Liquidate:</span>
                          <span>{asset.daysToLiquidate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldExclamationIcon className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-semibold">Portfolio Risk Management</h2>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {(["overview", "correlation", "stress", "optimization"] as const).map(
          (tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "primary" : "secondary"}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          ),
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === "overview" && renderOverviewTab()}
          {activeTab === "correlation" && renderCorrelationTab()}
          {activeTab === "stress" && renderStressTab()}
          {activeTab === "optimization" && renderOptimizationTab()}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { api, SwapRoute } from "@/services/api";
import {
  ArrowsRightLeftIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  FireIcon as GasIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";

interface Route {
  protocol: string;
  path: string[];
  portion: number;
  expectedOutput: number;
  priceImpact: number;
  gasEstimate: number;
}

interface RoutingResult {
  routes: Route[];
  totalOutput: number;
  averagePriceImpact: number;
  totalGasCost: number;
  executionTime: number;
  confidence: number;
}

function transformSwapRoute(route: SwapRoute): Route {
  return {
    protocol: route.protocol,
    path: route.path,
    portion: route.portion,
    expectedOutput: route.amount_out,
    priceImpact: route.price_impact,
    gasEstimate: route.gas_estimate,
  };
}

export function SmartOrderRouter() {
  const [fromToken, setFromToken] = useState("");
  const [toToken, setToToken] = useState("");
  const [amount, setAmount] = useState("");
  const [slippageTolerance, setSlippageTolerance] = useState("0.5");
  const [gasPrice, setGasPrice] = useState<number | null>(null);
  const [routes, setRoutes] = useState<RoutingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<number>(0);

  useEffect(() => {
    const fetchGasPrice = async () => {
      try {
        const price = await api.getGasPrice();
        setGasPrice(price);
      } catch (error) {
        console.error("Failed to fetch gas price:", error);
      }
    };

    fetchGasPrice();
    const interval = setInterval(fetchGasPrice, 15000); // Update every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const findRoutes = async () => {
    if (!fromToken || !toToken || !amount) return;

    setLoading(true);
    try {
      const result = await api.getBestSwapRoutes(
        fromToken,
        toToken,
        parseFloat(amount),
      );
      const transformedRoutes = result.map(transformSwapRoute);
      setRoutes({
        routes: transformedRoutes,
        totalOutput: transformedRoutes.reduce(
          (sum, r) => sum + r.expectedOutput * r.portion,
          0,
        ),
        averagePriceImpact: transformedRoutes.reduce(
          (sum, r) => sum + r.priceImpact * r.portion,
          0,
        ),
        totalGasCost: transformedRoutes.reduce(
          (sum, r) => sum + r.gasEstimate,
          0,
        ),
        executionTime: 0,
        confidence: 95,
      });
      setSelectedRoute(0);
    } catch (error) {
      console.error("Failed to find routes:", error);
    } finally {
      setLoading(false);
    }
  };

  const executeSwap = async () => {
    if (!routes || !routes.routes[selectedRoute]) return;

    try {
      const route = routes.routes[selectedRoute];
      await api.executeSwap({
        fromToken,
        toToken,
        amount: parseFloat(amount),
        route,
        slippageTolerance: parseFloat(slippageTolerance),
      });
    } catch (error) {
      console.error("Failed to execute swap:", error);
    }
  };

  const formatGas = (gas: number) => {
    if (!gasPrice) return "Loading...";
    const costInEth = (gas * gasPrice) / 1e9;
    return `${costInEth.toFixed(6)} ETH`;
  };

  const handleFromTokenChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setFromToken(e.target.value);
  };

  const handleToTokenChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setToToken(e.target.value);
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  };

  const handleSlippageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSlippageTolerance(e.target.value);
  };

  return (
    <div className="space-y-6">
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-medium mb-4">Smart Order Router</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">From</label>
            <Select
              value={fromToken}
              onChange={handleFromTokenChange}
              className="w-full"
            >
              <option value="">Select token</option>
              <option value="ETH">ETH</option>
              <option value="USDC">USDC</option>
              <option value="WBTC">WBTC</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">To</label>
            <Select
              value={toToken}
              onChange={handleToTokenChange}
              className="w-full"
            >
              <option value="">Select token</option>
              <option value="ETH">ETH</option>
              <option value="USDC">USDC</option>
              <option value="WBTC">WBTC</option>
            </Select>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Amount</label>
          <Input
            type="number"
            value={amount}
            onChange={handleAmountChange}
            placeholder="Enter amount"
            className="w-full"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Slippage Tolerance (%)
          </label>
          <Input
            type="number"
            value={slippageTolerance}
            onChange={handleSlippageChange}
            step="0.1"
            min="0.1"
            max="5"
            className="w-full"
          />
        </div>

        <Button
          onClick={findRoutes}
          disabled={!fromToken || !toToken || !amount || loading}
          className="w-full mb-6"
        >
          {loading ? "Finding best routes..." : "Find Routes"}
        </Button>

        {routes && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Available Routes</h4>
              <Badge variant="default">
                Gas:{" "}
                {gasPrice
                  ? `${(gasPrice / 1e9).toFixed(1)} Gwei`
                  : "Loading..."}
              </Badge>
            </div>

            {routes.routes.map((route, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  selectedRoute === index
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-gray-700 hover:border-gray-600"
                } cursor-pointer`}
                onClick={() => setSelectedRoute(index)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{route.protocol}</Badge>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      {route.path.join(" → ")}
                    </div>
                  </div>
                  <Badge variant="default">
                    {(route.portion * 100).toFixed(0)}%
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">
                      <CurrencyDollarIcon className="w-4 h-4 inline mr-1" />
                      Output
                    </div>
                    <div className="font-medium">
                      {route.expectedOutput.toFixed(6)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-400 mb-1">
                      <ChartBarIcon className="w-4 h-4 inline mr-1" />
                      Price Impact
                    </div>
                    <div className="font-medium">
                      {route.priceImpact.toFixed(2)}%
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-400 mb-1">
                      <GasIcon className="w-4 h-4 inline mr-1" />
                      Gas
                    </div>
                    <div className="font-medium">
                      {formatGas(route.gasEstimate)}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-4 p-4 bg-gray-800/30 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Total Output</div>
                  <div className="text-lg font-medium">
                    {routes.totalOutput.toFixed(6)} {toToken}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-400 mb-1">Price Impact</div>
                  <div className="text-lg font-medium">
                    {routes.averagePriceImpact.toFixed(2)}%
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-400 mb-1">Gas Cost</div>
                  <div className="text-lg font-medium">
                    {formatGas(routes.totalGasCost)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-400 mb-1">
                    Routing Score
                  </div>
                  <div className="text-lg font-medium">
                    {routes.confidence.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              variant="primary"
              disabled={!fromToken || !toToken || !amount || loading}
            >
              Execute Swap
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

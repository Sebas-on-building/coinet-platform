import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
  CodeBracketIcon,
  PlayIcon,
  StopIcon,
} from "@heroicons/react/24/solid";
import {
  strategyExecutor,
  type Strategy,
  type StrategyConfig,
} from "@/services/trading/strategies";

interface OrderCondition {
  type: "price" | "volume" | "indicator" | "time";
  operator: ">" | "<" | "==" | ">=<" | "crosses";
  value: number | string;
  timeframe?: string;
}

interface AlgorithmicRule {
  name: string;
  description: string;
  conditions: OrderCondition[];
  actions: {
    type: "market" | "limit";
    side: "buy" | "sell";
    size: number | string;
    price?: number;
  }[];
}

interface AlgorithmicStrategy {
  name: string;
  config: StrategyConfig;
  active: boolean;
}

export function AdvancedOrderForm() {
  const [selectedTab, setSelectedTab] = useState<
    "basic" | "conditional" | "algorithmic"
  >("basic");
  const [conditions, setConditions] = useState<OrderCondition[]>([]);
  const [activeStrategies, setActiveStrategies] = useState<
    AlgorithmicStrategy[]
  >([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(
    null,
  );
  const [strategyConfig, setStrategyConfig] = useState<Partial<StrategyConfig>>(
    {},
  );

  useEffect(() => {
    const handleStrategySignal = (signal: any) => {
      console.log("Strategy signal received:", signal);
      // Implement order execution based on strategy signals
    };

    strategyExecutor.on("strategySignal", handleStrategySignal);
    return () => {
      strategyExecutor.removeListener("strategySignal", handleStrategySignal);
    };
  }, []);

  const [orderForm, setOrderForm] = useState({
    type: "limit",
    side: "buy",
    size: "",
    price: "",
    timeInForce: "GTC",
    postOnly: false,
    reduceOnly: false,
  });

  const handleStrategySelect = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setStrategyConfig({
      ...strategy.defaultConfig,
      symbol: "BTCUSDT", // Default symbol, should be made configurable
    });
  };

  const handleStrategyStart = () => {
    if (!selectedStrategy || !strategyConfig) return;

    const newStrategy: AlgorithmicStrategy = {
      name: selectedStrategy.name,
      config: strategyConfig as StrategyConfig,
      active: true,
    };

    setActiveStrategies([...activeStrategies, newStrategy]);
    strategyExecutor.startStrategy(
      selectedStrategy.name,
      strategyConfig as StrategyConfig,
    );
  };

  const handleStrategyStop = (strategyName: string) => {
    setActiveStrategies(
      activeStrategies.map((strategy) =>
        strategy.name === strategyName
          ? { ...strategy, active: false }
          : strategy,
      ),
    );
    strategyExecutor.stopStrategy(strategyName);
  };

  const handleSubmit = () => {
    // Implement order submission logic
    console.log("Submitting order:", {
      ...orderForm,
      conditions: conditions,
      algorithmic: selectedTab === "algorithmic",
    });
  };

  return (
    <Card variant="glass" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium">Advanced Order Entry</h3>
        <div className="flex space-x-2">
          <Button
            variant={selectedTab === "basic" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setSelectedTab("basic")}
          >
            Basic
          </Button>
          <Button
            variant={selectedTab === "conditional" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setSelectedTab("conditional")}
          >
            Conditional
          </Button>
          <Button
            variant={selectedTab === "algorithmic" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setSelectedTab("algorithmic")}
          >
            Algorithmic
          </Button>
        </div>
      </div>

      {/* Basic Order Form */}
      {selectedTab === "basic" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Order Type
              </label>
              <select
                className="w-full rounded-lg bg-gray-50/5 border border-gray-200/20 px-4 py-2.5"
                value={orderForm.type}
                onChange={(e) =>
                  setOrderForm({ ...orderForm, type: e.target.value })
                }
              >
                <option value="market">Market</option>
                <option value="limit">Limit</option>
                <option value="stop">Stop</option>
                <option value="stopLimit">Stop Limit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Side</label>
              <div className="flex space-x-2">
                <Button
                  variant={orderForm.side === "buy" ? "success" : "ghost"}
                  fullWidth
                  onClick={() => setOrderForm({ ...orderForm, side: "buy" })}
                >
                  Buy
                </Button>
                <Button
                  variant={orderForm.side === "sell" ? "danger" : "ghost"}
                  fullWidth
                  onClick={() => setOrderForm({ ...orderForm, side: "sell" })}
                >
                  Sell
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Size</label>
              <input
                type="number"
                className="w-full rounded-lg bg-gray-50/5 border border-gray-200/20 px-4 py-2.5"
                value={orderForm.size}
                onChange={(e) =>
                  setOrderForm({ ...orderForm, size: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
            {orderForm.type !== "market" && (
              <div>
                <label className="block text-sm font-medium mb-2">Price</label>
                <input
                  type="number"
                  className="w-full rounded-lg bg-gray-50/5 border border-gray-200/20 px-4 py-2.5"
                  value={orderForm.price}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, price: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Time in Force
              </label>
              <select
                className="w-full rounded-lg bg-gray-50/5 border border-gray-200/20 px-4 py-2.5"
                value={orderForm.timeInForce}
                onChange={(e) =>
                  setOrderForm({ ...orderForm, timeInForce: e.target.value })
                }
              >
                <option value="GTC">Good Till Cancel</option>
                <option value="IOC">Immediate or Cancel</option>
                <option value="FOK">Fill or Kill</option>
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={orderForm.postOnly}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, postOnly: e.target.checked })
                  }
                  className="rounded border-gray-200/20 bg-gray-50/5"
                />
                <span className="text-sm">Post Only</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={orderForm.reduceOnly}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, reduceOnly: e.target.checked })
                  }
                  className="rounded border-gray-200/20 bg-gray-50/5"
                />
                <span className="text-sm">Reduce Only</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Conditional Orders */}
      {selectedTab === "conditional" && (
        <div className="space-y-4">
          {conditions.map((condition, index) => (
            <Card key={index} variant="glass" className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <select
                    className="rounded-lg bg-gray-50/5 border border-gray-200/20 px-3 py-1.5"
                    value={condition.type}
                    onChange={(e) => {
                      const newConditions = [...conditions];
                      newConditions[index].type = e.target.value as any;
                      setConditions(newConditions);
                    }}
                  >
                    <option value="price">Price</option>
                    <option value="volume">Volume</option>
                    <option value="indicator">Indicator</option>
                    <option value="time">Time</option>
                  </select>
                  <select
                    className="rounded-lg bg-gray-50/5 border border-gray-200/20 px-3 py-1.5"
                    value={condition.operator}
                    onChange={(e) => {
                      const newConditions = [...conditions];
                      newConditions[index].operator = e.target.value as any;
                      setConditions(newConditions);
                    }}
                  >
                    <option value=">">Greater than</option>
                    <option value="<">Less than</option>
                    <option value="==">Equals</option>
                    <option value=">=<">Between</option>
                    <option value="crosses">Crosses</option>
                  </select>
                  <input
                    type="text"
                    className="rounded-lg bg-gray-50/5 border border-gray-200/20 px-3 py-1.5"
                    value={condition.value}
                    onChange={(e) => {
                      const newConditions = [...conditions];
                      newConditions[index].value = e.target.value;
                      setConditions(newConditions);
                    }}
                    placeholder="Value"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newConditions = [...conditions];
                    newConditions.splice(index, 1);
                    setConditions(newConditions);
                  }}
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))}
          <Button
            variant="ghost"
            onClick={() =>
              setConditions([
                ...conditions,
                {
                  type: "price",
                  operator: ">",
                  value: "",
                },
              ])
            }
          >
            Add Condition
          </Button>
        </div>
      )}

      {/* Algorithmic Trading */}
      {selectedTab === "algorithmic" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Available Strategies</h4>
              <div className="space-y-2">
                {strategyExecutor.getAvailableStrategies().map((strategy) => (
                  <Card
                    key={strategy.name}
                    variant="glass"
                    hover
                    className={`p-4 cursor-pointer ${
                      selectedStrategy?.name === strategy.name
                        ? "border-blue-500"
                        : ""
                    }`}
                    onClick={() => handleStrategySelect(strategy)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-medium flex items-center">
                          <CodeBracketIcon className="h-5 w-5 mr-2 text-blue-500" />
                          {strategy.name}
                        </h5>
                        <p className="text-sm text-gray-500 mt-1">
                          {strategy.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">
                Strategy Configuration
              </h4>
              {selectedStrategy && (
                <Card variant="glass" className="p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Symbol
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg bg-gray-50/5 border border-gray-200/20 px-4 py-2.5"
                        value={strategyConfig.symbol || ""}
                        onChange={(e) =>
                          setStrategyConfig({
                            ...strategyConfig,
                            symbol: e.target.value,
                          })
                        }
                        placeholder="BTCUSDT"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Timeframe
                      </label>
                      <select
                        className="w-full rounded-lg bg-gray-50/5 border border-gray-200/20 px-4 py-2.5"
                        value={strategyConfig.timeframe || "15m"}
                        onChange={(e) =>
                          setStrategyConfig({
                            ...strategyConfig,
                            timeframe: e.target
                              .value as StrategyConfig["timeframe"],
                          })
                        }
                      >
                        <option value="1m">1 minute</option>
                        <option value="5m">5 minutes</option>
                        <option value="15m">15 minutes</option>
                        <option value="1h">1 hour</option>
                        <option value="4h">4 hours</option>
                        <option value="1d">1 day</option>
                      </select>
                    </div>
                    {selectedStrategy.getParameterDefinitions().map((param) => (
                      <div key={param.name}>
                        <label className="block text-sm font-medium mb-2">
                          {param.name}
                          <span className="text-gray-500 ml-2">
                            ({param.description})
                          </span>
                        </label>
                        <input
                          type={param.type === "number" ? "number" : "text"}
                          className="w-full rounded-lg bg-gray-50/5 border border-gray-200/20 px-4 py-2.5"
                          value={
                            typeof strategyConfig.parameters?.[param.name] !==
                            "undefined"
                              ? String(strategyConfig.parameters[param.name])
                              : String(param.default)
                          }
                          onChange={(e) =>
                            setStrategyConfig({
                              ...strategyConfig,
                              parameters: {
                                ...strategyConfig.parameters,
                                [param.name]:
                                  param.type === "number"
                                    ? parseFloat(e.target.value)
                                    : e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    ))}
                    <Button
                      variant="gradient"
                      size="lg"
                      fullWidth
                      onClick={handleStrategyStart}
                      leftIcon={<PlayIcon className="h-5 w-5" />}
                    >
                      Start Strategy
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">Active Strategies</h4>
            <div className="space-y-2">
              {activeStrategies.map((strategy) => (
                <Card key={strategy.name} variant="glass" className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium">{strategy.name}</h5>
                      <p className="text-sm text-gray-500">
                        {strategy.config.symbol} - {strategy.config.timeframe}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={strategy.active ? "success" : "default"}>
                        {strategy.active ? "Active" : "Stopped"}
                      </Badge>
                      {strategy.active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStrategyStop(strategy.name)}
                          leftIcon={<StopIcon className="h-5 w-5" />}
                        >
                          Stop
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button
          variant="gradient"
          size="lg"
          onClick={handleSubmit}
          leftIcon={<AdjustmentsHorizontalIcon className="h-5 w-5" />}
        >
          Place Advanced Order
        </Button>
      </div>
    </Card>
  );
}

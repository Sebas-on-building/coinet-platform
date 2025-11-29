import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  Calendar, 
  DollarSign,
  Target,
  Shield,
  Activity,
  BarChart3,
  Download
} from "lucide-react";
import { BacktestResult } from "@/types/agents";
import { PerformanceChart } from "./PerformanceChart";
import { PerformanceMetrics } from "./PerformanceMetrics";

interface BacktestConfig {
  startDate: string;
  endDate: string;
  initialCapital: number;
  symbol: string;
  timeframe: string;
}

const MOCK_BACKTEST_RESULT: BacktestResult = {
  id: "bt-1",
  agentId: "agent-1",
  startDate: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
  endDate: Date.now(),
  initialCapital: 10000,
  finalCapital: 13500,
  totalReturn: 35.0,
  totalTrades: 47,
  winningTrades: 29,
  losingTrades: 18,
  winRate: 61.7,
  averageWin: 245.30,
  averageLoss: -127.50,
  maxDrawdown: -8.5,
  sharpeRatio: 1.42,
  calmarRatio: 4.12,
  trades: [
    {
      timestamp: Date.now() - 300 * 24 * 60 * 60 * 1000,
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 0.5,
      price: 42000,
      pnl: 1250,
      reason: "RSI oversold + price support"
    },
    {
      timestamp: Date.now() - 250 * 24 * 60 * 60 * 1000,
      symbol: "BTCUSDT",
      side: "sell",
      quantity: 0.5,
      price: 45500,
      pnl: 1750,
      reason: "Profit target reached"
    }
  ],
  performanceMetrics: {
    totalReturn: 35.0,
    annualizedReturn: 28.5,
    volatility: 18.2,
    maxDrawdown: -8.5,
    sharpeRatio: 1.42,
    calmarRatio: 4.12,
    winRate: 61.7,
    profitFactor: 2.15
  },
  createdAt: Date.now()
};

interface BacktestingEngineProps {
  agentId?: string;
  onBacktestComplete?: (result: BacktestResult) => void;
}

export function BacktestingEngine({ agentId, onBacktestComplete }: BacktestingEngineProps) {
  const [config, setConfig] = useState<BacktestConfig>({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    initialCapital: 10000,
    symbol: "BTCUSDT",
    timeframe: "1h"
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [progress, setProgress] = useState(0);

  const runBacktest = async () => {
    setIsRunning(true);
    setProgress(0);
    
    // Simulate backtest progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setResult(MOCK_BACKTEST_RESULT);
    setIsRunning(false);
    setProgress(100);
    
    if (onBacktestComplete) {
      onBacktestComplete(MOCK_BACKTEST_RESULT);
    }
  };

  const getReturnColor = (value: number) => {
    return value >= 0 ? "text-green-600" : "text-red-600";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Backtesting Engine
          </h2>
          <p className="text-muted-foreground">
            Test your agent's performance on historical data
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Backtest Configuration
            </CardTitle>
            <CardDescription>
              Set up your historical test parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Trading Pair</Label>
              <Select value={config.symbol} onValueChange={(value) => setConfig(prev => ({ ...prev, symbol: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                  <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                  <SelectItem value="ADAUSDT">ADA/USDT</SelectItem>
                  <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select value={config.timeframe} onValueChange={(value) => setConfig(prev => ({ ...prev, timeframe: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5m">5 Minutes</SelectItem>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="4h">4 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={config.startDate}
                  onChange={(e) => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={config.endDate}
                  onChange={(e) => setConfig(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capital">Initial Capital (USDT)</Label>
              <Input
                id="capital"
                type="number"
                value={config.initialCapital}
                onChange={(e) => setConfig(prev => ({ ...prev, initialCapital: Number(e.target.value) }))}
              />
            </div>

            {isRunning && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <Button 
              onClick={runBacktest} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  Running Backtest...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Backtest
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="trades">Trades</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Financial Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Initial Capital</span>
                        <span className="font-semibold">${result.initialCapital.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Final Capital</span>
                        <span className="font-semibold">${result.finalCapital.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Return</span>
                        <span className={`font-semibold ${getReturnColor(result.totalReturn)}`}>
                          {result.totalReturn > 0 ? '+' : ''}{result.totalReturn}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Max Drawdown</span>
                        <span className={`font-semibold ${getReturnColor(result.maxDrawdown)}`}>
                          {result.maxDrawdown}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Trading Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Trades</span>
                        <span className="font-semibold">{result.totalTrades}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Win Rate</span>
                        <span className="font-semibold text-green-600">{result.winRate}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg Win</span>
                        <span className="font-semibold text-green-600">+${result.averageWin}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg Loss</span>
                        <span className="font-semibold text-red-600">${result.averageLoss}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Risk Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{result.sharpeRatio}</div>
                        <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{result.calmarRatio}</div>
                        <div className="text-sm text-muted-foreground">Calmar Ratio</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{result.performanceMetrics.profitFactor}</div>
                        <div className="text-sm text-muted-foreground">Profit Factor</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Chart</CardTitle>
                    <CardDescription>Portfolio value over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PerformanceChart type="backtest" />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trades">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Trade History</CardTitle>
                      <CardDescription>Detailed list of all executed trades</CardDescription>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.trades.map((trade, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant={trade.side === 'buy' ? 'default' : 'secondary'}>
                              {trade.side.toUpperCase()}
                            </Badge>
                            <div>
                              <div className="font-medium">{trade.symbol}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(trade.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${trade.price.toLocaleString()}</div>
                            <div className={`text-sm ${getReturnColor(trade.pnl)}`}>
                              {trade.pnl > 0 ? '+' : ''}${trade.pnl}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analysis">
                <Card>
                  <CardHeader>
                    <CardTitle>Strategy Analysis</CardTitle>
                    <CardDescription>Detailed performance breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PerformanceMetrics results={[result]} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Backtest Results</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure your backtest parameters and click "Run Backtest" to see results
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  BarChart3,
  PieChart,
  Activity,
  Target,
  Lightbulb,
  Zap,
  Shield,
  DollarSign,
  Clock,
  Users,
  Globe
} from "lucide-react";
import { NLPResponse } from "@/types/naturalLanguage";
import { PerformanceChart } from "./PerformanceChart";
import { HistoricalPriceChart } from "./HistoricalPriceChart";
import { ConfidenceBreakdown } from "./ConfidenceBreakdown";
import { createMockPerformanceData, createMockOutcomeProjections, createMockValidationPlan, createMockImplementationSteps } from "@/data/mockAgentData";

interface EnhancedRefineAndTestTabProps {
  parsedAgent: NLPResponse;
}

export function EnhancedRefineAndTestTab({ parsedAgent }: EnhancedRefineAndTestTabProps) {
  const [activeSubTab, setActiveSubTab] = useState("performance");
  const [selectedScenario, setSelectedScenario] = useState<"best" | "expected" | "worst">("expected");
  const [selectedCoin, setSelectedCoin] = useState("BTC");
  
  // Get mock data based on agent type (extracted from tags or name)
  const agentType = parsedAgent.agent.tags.includes("conservative") ? "conservative" : 
                   parsedAgent.agent.tags.includes("aggressive") ? "aggressive" : "balanced";
  
  const performanceData = createMockPerformanceData(agentType);
  const outcomeProjections = createMockOutcomeProjections(agentType);
  const validationPlan = createMockValidationPlan();
  const implementationSteps = createMockImplementationSteps();

  // Available cryptocurrencies for testing
  const availableCoins = [
    { value: "BTC", label: "Bitcoin (BTC)", icon: "₿" },
    { value: "ETH", label: "Ethereum (ETH)", icon: "Ξ" },
    { value: "BNB", label: "Binance Coin (BNB)", icon: "⚡" },
    { value: "ADA", label: "Cardano (ADA)", icon: "₳" },
    { value: "DOT", label: "Polkadot (DOT)", icon: "●" },
    { value: "SOL", label: "Solana (SOL)", icon: "◎" },
  ];

  // Generate historical data with entry/exit signals
  const generateHistoricalData = (coin: string) => {
    const basePrice = coin === "BTC" ? 45000 : coin === "ETH" ? 3000 : coin === "BNB" ? 300 : 50;
    const data = [];
    let currentPrice = basePrice;
    
    for (let i = 365; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Simulate price movement
      const change = (Math.random() - 0.5) * 0.1;
      currentPrice *= (1 + change);
      
      // Simulate agent signals based on agent type
      const shouldSignal = Math.random() < (agentType === "aggressive" ? 0.15 : agentType === "conservative" ? 0.05 : 0.1);
      const isEntry = Math.random() > 0.5;
      
      data.push({
        date: date.toISOString().split('T')[0],
        price: currentPrice,
        volume: Math.random() * 1000000,
        signal: shouldSignal ? (isEntry ? "entry" : "exit") : null,
        entryPrice: isEntry && shouldSignal ? currentPrice : null,
        exitPrice: !isEntry && shouldSignal ? currentPrice : null,
      });
    }
    
    return data;
  };

  const historicalData = generateHistoricalData(selectedCoin);
  
  // Calculate performance metrics for selected coin
  const calculateCoinMetrics = () => {
    const entries = historicalData.filter(d => d.signal === "entry");
    const exits = historicalData.filter(d => d.signal === "exit");
    const totalTrades = Math.min(entries.length, exits.length);
    
    let totalReturn = 0;
    let wins = 0;
    
    for (let i = 0; i < totalTrades; i++) {
      if (entries[i] && exits[i] && entries[i].entryPrice && exits[i].exitPrice) {
        const returnPct = (exits[i].exitPrice! - entries[i].entryPrice!) / entries[i].entryPrice!;
        totalReturn += returnPct;
        if (returnPct > 0) wins++;
      }
    }
    
    return {
      totalTrades,
      winRate: totalTrades > 0 ? wins / totalTrades : 0,
      totalReturn: totalReturn,
      avgReturn: totalTrades > 0 ? totalReturn / totalTrades : 0,
    };
  };

  const coinMetrics = calculateCoinMetrics();

  const renderPerformanceOverview = () => (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <PerformanceChart type="returns" className="h-full" />
        <PerformanceChart type="risk" className="h-full" />
      </div>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Key Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {(performanceData.projectedReturns.monthly * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-green-600">Monthly Return</div>
              </div>
              
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {performanceData.riskMetrics.sharpeRatio.toFixed(1)}
                </div>
                <div className="text-sm text-blue-600">Sharpe Ratio</div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {(performanceData.riskMetrics.winRate * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-purple-600">Win Rate</div>
              </div>
              
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {(performanceData.riskMetrics.maxDrawdown * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-orange-600">Max Drawdown</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Risk Assessment
              </span>
              <Badge variant={parsedAgent.confidence > 80 ? "default" : "secondary"}>
                {parsedAgent.confidence}% Confidence
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {parsedAgent.explanation.riskFactors.map((risk, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderCoinSpecificChart = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Historical Performance Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Test Cryptocurrency:</label>
            <Select value={selectedCoin} onValueChange={setSelectedCoin}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select cryptocurrency" />
              </SelectTrigger>
              <SelectContent>
                {availableCoins.map((coin) => (
                  <SelectItem key={coin.value} value={coin.value}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{coin.icon}</span>
                      {coin.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="h-80 border rounded-lg">
            <HistoricalPriceChart 
              data={historicalData} 
              coin={selectedCoin}
              className="h-full p-4"
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-xl font-bold text-green-600">
                {coinMetrics.totalTrades}
              </div>
              <div className="text-sm text-green-600">Total Trades</div>
            </div>
            
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-xl font-bold text-blue-600">
                {(coinMetrics.winRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-blue-600">Win Rate</div>
            </div>
            
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <div className="text-xl font-bold text-purple-600">
                {coinMetrics.totalReturn > 0 ? '+' : ''}{(coinMetrics.totalReturn * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-purple-600">Total Return</div>
            </div>
            
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <div className="text-xl font-bold text-orange-600">
                {coinMetrics.avgReturn > 0 ? '+' : ''}{(coinMetrics.avgReturn * 100).toFixed(2)}%
              </div>
              <div className="text-sm text-orange-600">Avg Per Trade</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderBacktestResults = () => (
    <div className="space-y-6">
      {renderCoinSpecificChart()}
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PerformanceChart type="backtest" className="h-full" />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" />
              Backtest Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="font-medium">Period</div>
                  <div className="text-muted-foreground">{performanceData.backtestResults.period}</div>
                </div>
                <div>
                  <div className="font-medium">Total Trades</div>
                  <div className="text-muted-foreground">{performanceData.backtestResults.totalTrades}</div>
                </div>
                <div>
                  <div className="font-medium">Profitable</div>
                  <div className="text-green-600">{performanceData.backtestResults.profitableTrades}</div>
                </div>
                <div>
                  <div className="font-medium">Max Losses</div>
                  <div className="text-red-600">{performanceData.backtestResults.maxConsecutiveLosses}</div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="font-medium mb-2">Total Return</div>
                <div className="text-2xl font-bold text-green-600">
                  +{(performanceData.backtestResults.totalReturn * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Validation Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-3">Success Metrics</h4>
              <div className="space-y-2">
                {validationPlan.successMetrics.map((metric, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    {metric}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Failure Conditions</h4>
              <div className="space-y-2">
                {validationPlan.failureConditions.map((condition, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    {condition}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderScenarioAnalysis = () => (
    <div className="space-y-6">
      <ConfidenceBreakdown 
        agentType={agentType}
        selectedCoin={selectedCoin}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Scenario Projections</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedScenario} onValueChange={(value: any) => setSelectedScenario(value)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="best" className="text-green-600">Best Case</TabsTrigger>
              <TabsTrigger value="expected" className="text-blue-600">Expected</TabsTrigger>
              <TabsTrigger value="worst" className="text-red-600">Worst Case</TabsTrigger>
            </TabsList>
            
            {outcomeProjections.map((projection) => (
              <TabsContent key={projection.scenario} value={projection.scenario}>
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      <strong>Probability: {(projection.probability * 100).toFixed(0)}%</strong> - {projection.description}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold">
                        {projection.metrics.monthlyReturn > 0 ? '+' : ''}
                        {(projection.metrics.monthlyReturn * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Monthly Return</div>
                    </div>
                    
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold">
                        {(projection.metrics.winRate * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Win Rate</div>
                    </div>
                    
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold">
                        {(projection.metrics.maxDrawdown * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Max Drawdown</div>
                    </div>
                    
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold">
                        {projection.metrics.sharpeRatio.toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      
      <PerformanceChart type="confidence" />
    </div>
  );

  const renderOptimizationSuggestions = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            AI-Powered Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {parsedAgent.suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm">{suggestion}</div>
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      Impact: {["Low", "Medium", "High"][index % 3]}
                    </Badge>
                    <Badge variant="outline" className="text-xs ml-2">
                      Effort: {["Easy", "Moderate", "Complex"][index % 3]}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Implementation Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {implementationSteps.map((step, index) => (
              <div key={step.order} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  {step.order}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{step.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {step.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {step.estimatedTime}
                    </div>
                    {step.dependencies.length > 0 && (
                      <div>
                        Depends on: {step.dependencies.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Refine & Test Agent</h3>
          <p className="text-muted-foreground">
            Analyze performance projections, run simulations, and optimize your agent
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={agentType === "conservative" ? "default" : agentType === "aggressive" ? "destructive" : "secondary"}>
            {agentType.charAt(0).toUpperCase() + agentType.slice(1)} Strategy
          </Badge>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="backtest">Coin Testing</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="optimize">Optimize</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          {renderPerformanceOverview()}
        </TabsContent>

        <TabsContent value="backtest" className="space-y-6">
          {renderBacktestResults()}
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-6">
          {renderScenarioAnalysis()}
        </TabsContent>

        <TabsContent value="optimize" className="space-y-6">
          {renderOptimizationSuggestions()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
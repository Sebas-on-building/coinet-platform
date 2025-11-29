import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Zap,
  Target,
  Activity,
  Shield,
  Eye,
  RefreshCw
} from "lucide-react";

interface AIInsight {
  id: string;
  type: "sentiment" | "catalyst" | "risk" | "opportunity" | "pattern";
  title: string;
  description: string;
  confidence: number;
  severity: "low" | "medium" | "high";
  timestamp: number;
  metadata: Record<string, any>;
}

interface MarketIndicator {
  name: string;
  value: number;
  change: number;
  trend: "up" | "down" | "neutral";
  description: string;
}

const MOCK_INSIGHTS: AIInsight[] = [
  {
    id: "1",
    type: "sentiment",
    title: "Bullish Sentiment Shift Detected",
    description: "Social media sentiment for Bitcoin has shifted from bearish to bullish over the last 24 hours, with a 65% increase in positive mentions.",
    confidence: 87,
    severity: "medium",
    timestamp: Date.now() - 3600000,
    metadata: { asset: "BTC", sentiment_score: 0.73, mention_volume: 12450 }
  },
  {
    id: "2",
    type: "catalyst",
    title: "Major Exchange Announcement",
    description: "Large cryptocurrency exchange announced new staking rewards program, potentially affecting token demand.",
    confidence: 92,
    severity: "high",
    timestamp: Date.now() - 7200000,
    metadata: { affected_tokens: ["ETH", "ADA", "DOT"], impact_estimate: "positive" }
  },
  {
    id: "3",
    type: "risk",
    title: "Elevated Volatility Warning",
    description: "Market volatility indicators suggest increased price swings in the next 24-48 hours due to upcoming Federal Reserve announcement.",
    confidence: 78,
    severity: "high",
    timestamp: Date.now() - 1800000,
    metadata: { volatility_score: 0.82, affected_markets: ["BTC", "ETH", "traditional"] }
  },
  {
    id: "4",
    type: "opportunity",
    title: "Arbitrage Opportunity Identified",
    description: "Price discrepancy detected between exchanges for SOL token, potential 2.3% profit margin available.",
    confidence: 94,
    severity: "medium",
    timestamp: Date.now() - 900000,
    metadata: { token: "SOL", profit_margin: 2.3, exchanges: ["Binance", "Coinbase"] }
  }
];

const MARKET_INDICATORS: MarketIndicator[] = [
  {
    name: "Fear & Greed Index",
    value: 67,
    change: 8,
    trend: "up",
    description: "Market sentiment is moving toward greed"
  },
  {
    name: "Bitcoin Dominance",
    value: 52.4,
    change: -1.2,
    trend: "down",
    description: "Altcoins gaining market share"
  },
  {
    name: "DeFi TVL",
    value: 45.8,
    change: 3.5,
    trend: "up",
    description: "Total Value Locked increasing"
  },
  {
    name: "Whale Activity",
    value: 73,
    change: 15,
    trend: "up",
    description: "Large transactions above baseline"
  }
];

export function ConetAIInsightsPanel() {
  const [insights] = useState<AIInsight[]>(MOCK_INSIGHTS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const refreshInsights = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "sentiment": return <TrendingUp className="w-4 h-4" />;
      case "catalyst": return <Zap className="w-4 h-4" />;
      case "risk": return <AlertTriangle className="w-4 h-4" />;
      case "opportunity": return <Target className="w-4 h-4" />;
      case "pattern": return <Activity className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-red-600 bg-red-50 border-red-200";
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low": return "text-green-600 bg-green-50 border-green-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-600";
    if (confidence >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "down": return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <div className="w-4 h-4 rounded-full bg-gray-400" />;
    }
  };

  const filteredInsights = selectedFilter === "all" 
    ? insights 
    : insights.filter(insight => insight.type === selectedFilter);

  const insightTypes = Array.from(new Set(insights.map(i => i.type)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600" />
            Conet AI Insights
          </h2>
          <p className="text-muted-foreground">
            Real-time AI analysis and market intelligence
          </p>
        </div>
        <Button 
          onClick={refreshInsights} 
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Market Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Market Overview
          </CardTitle>
          <CardDescription>
            Key market indicators and sentiment analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            {MARKET_INDICATORS.map((indicator, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{indicator.name}</span>
                  {getTrendIcon(indicator.trend)}
                </div>
                <div className="text-2xl font-bold mb-1">{indicator.value}</div>
                <div className="flex items-center gap-1 text-sm">
                  <span className={indicator.change >= 0 ? "text-green-600" : "text-red-600"}>
                    {indicator.change > 0 ? "+" : ""}{indicator.change}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{indicator.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                AI Insights
              </CardTitle>
              <CardDescription>
                Real-time analysis and opportunity detection
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={selectedFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFilter("all")}
              >
                All
              </Button>
              {insightTypes.map((type) => (
                <Button
                  key={type}
                  variant={selectedFilter === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFilter(type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInsights.map((insight) => (
              <div key={insight.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold">{insight.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getSeverityColor(insight.severity)}`}
                        >
                          {insight.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(insight.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-sm font-medium ${getConfidenceColor(insight.confidence)}`}>
                      {insight.confidence}% confidence
                    </div>
                    <Progress value={insight.confidence} className="w-20 h-2 mt-1" />
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {insight.description}
                </p>
                
                {insight.metadata && Object.keys(insight.metadata).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(insight.metadata).map(([key, value]) => (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {key}: {Array.isArray(value) ? value.join(", ") : String(value)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            AI Configuration
          </CardTitle>
          <CardDescription>
            Customize AI analysis sensitivity and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Insight Types</h4>
              {insightTypes.map((type) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getInsightIcon(type)}
                    <span className="capitalize">{type}</span>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
              ))}
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Sensitivity Settings</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Minimum Confidence</span>
                    <span>75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Alert Frequency</span>
                    <span>Medium</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Risk Sensitivity</span>
                    <span>High</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, 
  TrendingUp, 
  Brain, 
  Newspaper, 
  DollarSign,
  Activity,
  Zap,
  Settings2,
  CheckCircle,
  AlertTriangle,
  Clock,
  BarChart3,
  Globe,
  Coins
} from "lucide-react";

interface DataSource {
  id: string;
  name: string;
  type: "market" | "sentiment" | "onchain" | "news" | "ai-insights";
  status: "connected" | "connecting" | "disconnected" | "error";
  reliability: "high" | "medium" | "low";
  latency: number; // ms
  lastUpdate: Date;
  dataPoints: string[];
  cost: "free" | "low" | "medium" | "high";
  description: string;
}

export function DataSourceManager() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [dataSources] = useState<DataSource[]>([
    {
      id: "binance-market",
      name: "Binance Market Data",
      type: "market",
      status: "connected",
      reliability: "high",
      latency: 50,
      lastUpdate: new Date(),
      dataPoints: ["Price", "Volume", "Order Book", "24h Change", "Trading Pairs"],
      cost: "low",
      description: "Real-time market data from Binance exchange including price, volume, and order book data"
    },
    {
      id: "coingecko-data",
      name: "CoinGecko API",
      type: "market",
      status: "connected",
      reliability: "high",
      latency: 120,
      lastUpdate: new Date(),
      dataPoints: ["Market Cap", "Supply", "Development Activity", "Community Stats"],
      cost: "free",
      description: "Comprehensive cryptocurrency market data and metrics from CoinGecko"
    },
    {
      id: "twitter-sentiment",
      name: "Twitter Sentiment",
      type: "sentiment",
      status: "connecting",
      reliability: "medium",
      latency: 500,
      lastUpdate: new Date(Date.now() - 300000),
      dataPoints: ["Mention Volume", "Sentiment Score", "Influencer Activity", "Trending Hashtags"],
      cost: "medium",
      description: "Real-time sentiment analysis from Twitter mentions and discussions"
    },
    {
      id: "whale-alert",
      name: "Whale Alert",
      type: "onchain",
      status: "connected",
      reliability: "high",
      latency: 200,
      lastUpdate: new Date(),
      dataPoints: ["Large Transfers", "Exchange Flows", "Wallet Activity", "Transaction Volume"],
      cost: "medium",
      description: "Track large cryptocurrency transactions and whale movements"
    },
    {
      id: "cryptopanic-news",
      name: "CryptoPanic News",
      type: "news",
      status: "connected",
      reliability: "medium",
      latency: 1000,
      lastUpdate: new Date(),
      dataPoints: ["Breaking News", "Market Analysis", "Regulatory Updates", "Project Announcements"],
      cost: "low",
      description: "Aggregated cryptocurrency news from multiple sources with impact ratings"
    },
    {
      id: "coinet-ai",
      name: "Coinet AI Insights",
      type: "ai-insights",
      status: "connected",
      reliability: "high",
      latency: 300,
      lastUpdate: new Date(),
      dataPoints: ["Sentiment Analysis", "Catalyst Detection", "Risk Assessment", "Trend Prediction"],
      cost: "free",
      description: "Native Coinet AI-powered insights and analysis engine"
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected": return "text-green-500";
      case "connecting": return "text-yellow-500";
      case "disconnected": return "text-gray-500";
      case "error": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  const getReliabilityBadge = (reliability: string) => {
    const variants = {
      high: "default",
      medium: "secondary",
      low: "outline"
    } as const;
    return variants[reliability as keyof typeof variants] || "outline";
  };

  const getCostBadge = (cost: string) => {
    const variants = {
      free: "default",
      low: "secondary",
      medium: "destructive",
      high: "destructive"
    } as const;
    return variants[cost as keyof typeof variants] || "outline";
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "market": return <BarChart3 className="h-5 w-5" />;
      case "sentiment": return <Brain className="h-5 w-5" />;
      case "onchain": return <Coins className="h-5 w-5" />;
      case "news": return <Newspaper className="h-5 w-5" />;
      case "ai-insights": return <Zap className="h-5 w-5" />;
      default: return <Database className="h-5 w-5" />;
    }
  };

  const connectedSources = dataSources.filter(ds => ds.status === "connected").length;
  const averageLatency = Math.round(dataSources.reduce((acc, ds) => acc + ds.latency, 0) / dataSources.length);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Data Integration Hub</h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor your multi-source data pipeline for intelligent trading triggers
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{connectedSources}</div>
            <div className="text-xs text-muted-foreground">Connected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{averageLatency}ms</div>
            <div className="text-xs text-muted-foreground">Avg Latency</div>
          </div>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="market">Market Data</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
          <TabsTrigger value="correlations">Correlations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {dataSources.map((source) => (
              <Card key={source.id} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {getTypeIcon(source.type)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{source.name}</CardTitle>
                        <div className={`flex items-center gap-1 text-sm ${getStatusColor(source.status)}`}>
                          <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                          {source.status}
                        </div>
                      </div>
                    </div>
                    <Switch checked={source.status === "connected"} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{source.description}</p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Reliability</span>
                    <Badge variant={getReliabilityBadge(source.reliability)}>
                      {source.reliability}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Cost</span>
                    <Badge variant={getCostBadge(source.cost)}>
                      {source.cost}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Latency</span>
                    <span className="font-mono">{source.latency}ms</span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm font-medium">Data Points</span>
                    <div className="flex flex-wrap gap-1">
                      {source.dataPoints.slice(0, 3).map((point, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {point}
                        </Badge>
                      ))}
                      {source.dataPoints.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{source.dataPoints.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Last Update</span>
                      <span>{source.lastUpdate.toLocaleTimeString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Market Data Streams
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dataSources.filter(ds => ds.type === "market").map((source) => (
                  <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${source.status === "connected" ? "bg-green-500" : "bg-gray-400"}`} />
                      <div>
                        <div className="font-medium">{source.name}</div>
                        <div className="text-sm text-muted-foreground">{source.latency}ms latency</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Real-Time Data Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Price Updates/sec</span>
                    <div className="flex items-center gap-2">
                      <Progress value={85} className="w-20" />
                      <span className="text-sm font-mono">1,247</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Volume Data/sec</span>
                    <div className="flex items-center gap-2">
                      <Progress value={72} className="w-20" />
                      <span className="text-sm font-mono">892</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Order Book Updates/sec</span>
                    <div className="flex items-center gap-2">
                      <Progress value={93} className="w-20" />
                      <span className="text-sm font-mono">2,156</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Insights Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="font-medium">Sentiment Analysis</div>
                        <div className="text-sm text-muted-foreground">Processing 2.3K mentions/hour</div>
                      </div>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="font-medium">Catalyst Detection</div>
                        <div className="text-sm text-muted-foreground">Monitoring 847 events</div>
                      </div>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <div>
                        <div className="font-medium">Risk Assessment</div>
                        <div className="text-sm text-muted-foreground">3 high-risk alerts pending</div>
                      </div>
                    </div>
                    <Badge variant="secondary">Needs Review</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Newspaper className="h-5 w-5" />
                  News & Social Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dataSources.filter(ds => ds.type === "sentiment" || ds.type === "news").map((source) => (
                  <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${source.status === "connected" ? "bg-green-500" : "bg-yellow-500"}`} />
                      <div>
                        <div className="font-medium">{source.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {source.type === "sentiment" ? "Sentiment tracking" : "News monitoring"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">{source.latency}ms</div>
                      <div className="text-xs text-muted-foreground">latency</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="correlations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Cross-Source Correlation Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-500">0.84</div>
                    <div className="text-sm text-muted-foreground">Price → Volume</div>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-500">0.67</div>
                    <div className="text-sm text-muted-foreground">Sentiment → Price</div>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-500">0.72</div>
                    <div className="text-sm text-muted-foreground">News → Sentiment</div>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-500">0.58</div>
                    <div className="text-sm text-muted-foreground">Whale → Price</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Active Correlation Triggers</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="font-medium">Positive News + High Volume</div>
                          <div className="text-sm text-muted-foreground">Triggers when positive news correlates with 20%+ volume increase</div>
                        </div>
                      </div>
                      <Switch checked />
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="h-4 w-4 text-purple-500" />
                        <div>
                          <div className="font-medium">Whale Activity + Sentiment Shift</div>
                          <div className="text-sm text-muted-foreground">Activates on large transfers + sentiment change &gt;15%</div>
                        </div>
                      </div>
                      <Switch checked />
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="font-medium">AI Risk + Market Volatility</div>
                          <div className="text-sm text-muted-foreground">Triggers on high AI risk score + volatility &gt;5%</div>
                        </div>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Database, 
  TrendingUp, 
  MessageSquare, 
  Activity, 
  Globe, 
  Zap,
  Settings,
  Plus,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { DataSource } from "@/types/agents";

interface DataSourceConfig {
  id: string;
  name: string;
  type: "realtime" | "batch" | "webhook";
  category: "market" | "social" | "onchain" | "news" | "technical";
  status: "connected" | "disconnected" | "error";
  lastUpdate?: number;
  config: Record<string, any>;
}

const DEFAULT_DATA_SOURCES: DataSourceConfig[] = [
  {
    id: "binance-spot",
    name: "Binance Spot Prices",
    type: "realtime",
    category: "market",
    status: "connected",
    lastUpdate: Date.now() - 30000,
    config: { symbols: ["BTCUSDT", "ETHUSDT"], interval: "1s" }
  },
  {
    id: "coingecko",
    name: "CoinGecko Market Data",
    type: "batch",
    category: "market",
    status: "connected",
    lastUpdate: Date.now() - 300000,
    config: { refreshInterval: 300, coins: ["bitcoin", "ethereum"] }
  },
  {
    id: "twitter-sentiment",
    name: "Twitter Sentiment Analysis",
    type: "realtime",
    category: "social",
    status: "disconnected",
    config: { keywords: ["#Bitcoin", "#Crypto"], languages: ["en"] }
  },
  {
    id: "whale-alerts",
    name: "Whale Transaction Alerts",
    type: "webhook",
    category: "onchain",
    status: "connected",
    lastUpdate: Date.now() - 120000,
    config: { minAmount: 1000000, chains: ["ethereum", "bitcoin"] }
  },
  {
    id: "fear-greed",
    name: "Fear & Greed Index",
    type: "batch",
    category: "market",
    status: "connected",
    lastUpdate: Date.now() - 3600000,
    config: { refreshInterval: 3600 }
  }
];

interface AdvancedDataIntegrationProps {
  onDataSourcesChange: (sources: DataSource[]) => void;
}

export function AdvancedDataIntegration({ onDataSourcesChange }: AdvancedDataIntegrationProps) {
  const [dataSources, setDataSources] = useState<DataSourceConfig[]>(DEFAULT_DATA_SOURCES);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "market": return <TrendingUp className="w-4 h-4" />;
      case "social": return <MessageSquare className="w-4 h-4" />;
      case "onchain": return <Activity className="w-4 h-4" />;
      case "news": return <Globe className="w-4 h-4" />;
      case "technical": return <Database className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected": return "text-green-600 bg-green-50";
      case "disconnected": return "text-gray-600 bg-gray-50";
      case "error": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected": return <CheckCircle className="w-3 h-3" />;
      case "error": return <AlertTriangle className="w-3 h-3" />;
      default: return <div className="w-3 h-3 rounded-full bg-gray-400" />;
    }
  };

  const toggleDataSource = (id: string) => {
    setDataSources(prev => prev.map(source => 
      source.id === id 
        ? { ...source, status: source.status === "connected" ? "disconnected" : "connected" }
        : source
    ));
  };

  const filteredSources = dataSources.filter(source => 
    selectedCategory === "all" || source.category === selectedCategory
  );

  const connectedCount = dataSources.filter(s => s.status === "connected").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6" />
            Advanced Data Integration
          </h2>
          <p className="text-muted-foreground">
            Connect multiple data sources for intelligent triggers
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {connectedCount} of {dataSources.length} sources active
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Source
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sources" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
          <TabsTrigger value="correlations">Cross-Source Correlations</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="market">Market Data</SelectItem>
                <SelectItem value="social">Social Sentiment</SelectItem>
                <SelectItem value="onchain">On-Chain Data</SelectItem>
                <SelectItem value="news">News & Events</SelectItem>
                <SelectItem value="technical">Technical Analysis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {filteredSources.map((source) => (
              <Card key={source.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(source.category)}
                      <div>
                        <h3 className="font-semibold">{source.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {source.type}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getStatusColor(source.status)}`}
                          >
                            <span className="flex items-center gap-1">
                              {getStatusIcon(source.status)}
                              {source.status}
                            </span>
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {source.lastUpdate && (
                        <div className="text-xs text-muted-foreground">
                          Updated {Math.floor((Date.now() - source.lastUpdate) / 60000)}m ago
                        </div>
                      )}
                      <Switch 
                        checked={source.status === "connected"} 
                        onCheckedChange={() => toggleDataSource(source.id)}
                      />
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {source.status === "connected" && source.config && (
                    <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Configuration</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(source.config).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-mono">
                              {Array.isArray(value) ? value.join(", ") : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="correlations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Source Correlation Builder</CardTitle>
              <CardDescription>
                Create intelligent triggers that combine multiple data sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Example Correlation</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Trigger when Bitcoin price drops 5% AND whale transactions increase 200% AND social sentiment becomes negative
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Price Movement</Badge>
                    <Badge variant="secondary">On-Chain Activity</Badge>
                    <Badge variant="secondary">Social Sentiment</Badge>
                  </div>
                </div>
                
                <Button className="w-full" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Correlation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Coinet AI Insights Integration
              </CardTitle>
              <CardDescription>
                Leverage AI-powered market analysis for smarter triggers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      Sentiment Shift Detection
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      AI identifies when market sentiment is changing before major price movements
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      Catalyst Identification
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Automatically detect news, events, and announcements that could impact prices
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      Risk Flag Monitoring
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Real-time alerts for unusual market conditions and potential risks
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Settings className="w-4 h-4 text-purple-600" />
                      Custom Thresholds
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Define personalized sensitivity levels for all AI-powered triggers
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Button className="w-full">
                    Enable AI Insights Integration
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
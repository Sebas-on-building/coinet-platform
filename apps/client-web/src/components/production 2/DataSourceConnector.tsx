import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, 
  Database, 
  TrendingUp, 
  Globe, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Activity,
  Wifi,
  WifiOff
} from "lucide-react";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { toast } from "sonner";

interface DataSourceStatus {
  id: string;
  name: string;
  type: 'market' | 'news' | 'social' | 'onchain' | 'technical';
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  latency: number;
  lastUpdate: string;
  dataPoints: number;
  errorRate: number;
}

export function DataSourceConnector() {
  const [activeTab, setActiveTab] = useState("overview");
  const [dataSources, setDataSources] = useState<DataSourceStatus[]>([
    {
      id: "coingecko",
      name: "CoinGecko API",
      type: "market",
      status: "connected",
      latency: 45,
      lastUpdate: "2 seconds ago",
      dataPoints: 15420,
      errorRate: 0.1
    },
    {
      id: "binance",
      name: "Binance WebSocket",
      type: "market", 
      status: "connected",
      latency: 12,
      lastUpdate: "1 second ago",
      dataPoints: 89400,
      errorRate: 0.0
    },
    {
      id: "newsapi",
      name: "News API",
      type: "news",
      status: "connected",
      latency: 340,
      lastUpdate: "5 minutes ago", 
      dataPoints: 2340,
      errorRate: 0.3
    },
    {
      id: "twitter",
      name: "Twitter/X API",
      type: "social",
      status: "error",
      latency: 0,
      lastUpdate: "12 minutes ago",
      dataPoints: 0,
      errorRate: 100
    }
  ]);

  const { isConnected, lastUpdate } = useRealtimeData(['BTC', 'ETH'], {
    onMarketUpdate: (data) => {
      // Update data source metrics when new data arrives
      setDataSources(prev => prev.map(source => 
        source.type === 'market' 
          ? { ...source, lastUpdate: "just now", dataPoints: source.dataPoints + 1 }
          : source
      ));
    },
    onError: (error) => {
      toast.error("Data source error", { description: error.message });
    }
  });

  const getStatusColor = (status: DataSourceStatus['status']) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: DataSourceStatus['status']) => {
    switch (status) {
      case 'connected': return <Wifi className="w-4 h-4" />;
      case 'connecting': return <Activity className="w-4 h-4 animate-pulse" />;
      case 'error': return <WifiOff className="w-4 h-4" />;
      default: return <WifiOff className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: DataSourceStatus['type']) => {
    switch (type) {
      case 'market': return <TrendingUp className="w-4 h-4" />;
      case 'news': return <Globe className="w-4 h-4" />;
      case 'social': return <Activity className="w-4 h-4" />;
      case 'onchain': return <Database className="w-4 h-4" />;
      case 'technical': return <Zap className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  const handleToggleSource = async (sourceId: string) => {
    setDataSources(prev => prev.map(source => 
      source.id === sourceId 
        ? { 
            ...source, 
            status: source.status === 'connected' ? 'disconnected' : 'connecting'
          }
        : source
    ));

    // Simulate connection attempt
    setTimeout(() => {
      setDataSources(prev => prev.map(source => 
        source.id === sourceId && source.status === 'connecting'
          ? { ...source, status: 'connected' }
          : source
      ));
      toast.success("Data source updated");
    }, 1500);
  };

  const connectedSources = dataSources.filter(s => s.status === 'connected').length;
  const avgLatency = Math.round(
    dataSources
      .filter(s => s.status === 'connected')
      .reduce((sum, s) => sum + s.latency, 0) / connectedSources
  );

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Sources</p>
                <p className="text-2xl font-bold">{connectedSources}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Latency</p>
                <p className="text-2xl font-bold">{avgLatency}ms</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data Points</p>
                <p className="text-2xl font-bold">
                  {(dataSources.reduce((sum, s) => sum + s.dataPoints, 0) / 1000).toFixed(1)}k
                </p>
              </div>
              <Database className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Status</p>
                <p className="text-2xl font-bold">
                  {isConnected.supabase ? 'Online' : 'Offline'}
                </p>
              </div>
              {isConnected.supabase ? (
                <Wifi className="w-8 h-8 text-green-600" />
              ) : (
                <WifiOff className="w-8 h-8 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="market">Market Data</TabsTrigger>
          <TabsTrigger value="intelligence">AI Intelligence</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            {dataSources.map(source => (
              <Card key={source.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(source.type)}
                        <div>
                          <h3 className="font-semibold">{source.name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {source.type} data source
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {source.dataPoints.toLocaleString()} data points
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last update: {source.lastUpdate}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {source.latency}ms latency
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {source.errorRate}% error rate
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className={`flex items-center space-x-1 ${getStatusColor(source.status)}`}>
                          {getStatusIcon(source.status)}
                          <span className="text-sm font-medium capitalize">
                            {source.status}
                          </span>
                        </div>
                        <Switch
                          checked={source.status === 'connected'}
                          onCheckedChange={() => handleToggleSource(source.id)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="market" className="space-y-4">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Real-time Price Feeds
                </CardTitle>
                <CardDescription>
                  Configure cryptocurrency price data sources and update frequencies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {dataSources.filter(s => s.type === 'market').map(source => (
                    <div key={source.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{source.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {source.dataPoints.toLocaleString()} price updates
                        </p>
                      </div>
                      <Badge variant={source.status === 'connected' ? 'default' : 'destructive'}>
                        {source.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-4">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  AI Data Pipeline
                </CardTitle>
                <CardDescription>
                  Monitor AI processing pipeline and sentiment analysis sources
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">News Sentiment Analysis</h4>
                      <Badge variant="outline">Processing</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Real-time analysis of crypto news sentiment using NLP
                    </p>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Social Media Monitoring</h4>
                      <Badge variant="destructive">Error</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Twitter/X and Reddit sentiment tracking
                    </p>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Source Configuration</CardTitle>
                <CardDescription>
                  Configure API keys, update intervals, and data source parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>CoinGecko API Key</Label>
                    <Input placeholder="Enter API key..." type="password" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Update Frequency</Label>
                    <select className="w-full p-2 border rounded-md">
                      <option>Real-time (WebSocket)</option>
                      <option>5 seconds</option>
                      <option>30 seconds</option>
                      <option>1 minute</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Symbols to Track</Label>
                    <Input 
                      placeholder="BTC, ETH, ADA, SOL..." 
                      defaultValue="BTC, ETH, ADA, SOL, MATIC, DOT"
                    />
                  </div>
                </div>
                
                <Button className="w-full">Save Configuration</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
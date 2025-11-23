import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Target, 
  Activity,
  ArrowUpDown,
  Plus,
  Minus
} from "lucide-react";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie } from "recharts";

interface PortfolioPosition {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercentage: number;
  allocation: number;
}

interface PortfolioStats {
  totalValue: number;
  totalPnL: number;
  totalPnLPercentage: number;
  dayChange: number;
  dayChangePercentage: number;
}

export function PortfolioTracker() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  
  // Mock portfolio data - in production this would come from database
  const [positions, setPositions] = useState<PortfolioPosition[]>([
    {
      symbol: "BTC",
      name: "Bitcoin", 
      quantity: 0.5,
      avgPrice: 45000,
      currentPrice: 52000,
      value: 26000,
      pnl: 3500,
      pnlPercentage: 15.56,
      allocation: 65
    },
    {
      symbol: "ETH",
      name: "Ethereum",
      quantity: 8,
      avgPrice: 2800,
      currentPrice: 3200,
      value: 25600,
      pnl: 3200,
      pnlPercentage: 14.29,
      allocation: 25
    },
    {
      symbol: "ADA",
      name: "Cardano",
      quantity: 10000,
      avgPrice: 0.35,
      currentPrice: 0.42,
      value: 4200,
      pnl: 700,
      pnlPercentage: 20.00,
      allocation: 10
    }
  ]);

  const { marketData, getPrice } = useRealtimeData(['BTC', 'ETH', 'ADA'], {
    onMarketUpdate: (data) => {
      // Update positions with real-time prices
      setPositions(prev => prev.map(pos => {
        if (pos.symbol === data.symbol) {
          const newPrice = data.price;
          const newValue = pos.quantity * newPrice;
          const newPnL = newValue - (pos.quantity * pos.avgPrice);
          const newPnLPercentage = (newPnL / (pos.quantity * pos.avgPrice)) * 100;
          
          return {
            ...pos,
            currentPrice: newPrice,
            value: newValue,
            pnl: newPnL,
            pnlPercentage: newPnLPercentage
          };
        }
        return pos;
      }));
    }
  });

  // Calculate portfolio stats
  const portfolioStats: PortfolioStats = {
    totalValue: positions.reduce((sum, pos) => sum + pos.value, 0),
    totalPnL: positions.reduce((sum, pos) => sum + pos.pnl, 0),
    totalPnLPercentage: 0, // Will be calculated
    dayChange: 2340, // Mock data
    dayChangePercentage: 4.12 // Mock data
  };

  portfolioStats.totalPnLPercentage = 
    (portfolioStats.totalPnL / (portfolioStats.totalValue - portfolioStats.totalPnL)) * 100;

  // Portfolio performance chart data (mock)
  const performanceData = [
    { date: '2024-01-01', value: 40000 },
    { date: '2024-01-15', value: 42000 },
    { date: '2024-02-01', value: 45000 },
    { date: '2024-02-15', value: 43000 },
    { date: '2024-03-01', value: 48000 },
    { date: '2024-03-15', value: 52000 },
    { date: '2024-04-01', value: 55800 }
  ];

  // Allocation chart data
  const allocationData = positions.map(pos => ({
    name: pos.symbol,
    value: pos.allocation,
    color: pos.symbol === 'BTC' ? '#F7931A' : pos.symbol === 'ETH' ? '#627EEA' : '#0033AD'
  }));

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  ${portfolioStats.totalValue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total P&L</p>
                <p className={`text-2xl font-bold ${portfolioStats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${portfolioStats.totalPnL.toLocaleString()}
                </p>
                <p className={`text-xs ${portfolioStats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioStats.totalPnLPercentage >= 0 ? '+' : ''}
                  {portfolioStats.totalPnLPercentage.toFixed(2)}%
                </p>
              </div>
              {portfolioStats.totalPnL >= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-600" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">24h Change</p>
                <p className={`text-2xl font-bold ${portfolioStats.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${portfolioStats.dayChange.toLocaleString()}
                </p>
                <p className={`text-xs ${portfolioStats.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioStats.dayChangePercentage >= 0 ? '+' : ''}
                  {portfolioStats.dayChangePercentage.toFixed(2)}%
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Positions</p>
                <p className="text-2xl font-bold">{positions.length}</p>
                <p className="text-xs text-muted-foreground">Assets held</p>
              </div>
              <PieChart className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Performance</CardTitle>
                <CardDescription>Total value over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Portfolio Value']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Allocation Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
                <CardDescription>Portfolio distribution by asset</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, 'Allocation']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Positions</CardTitle>
              <CardDescription>
                Your active cryptocurrency holdings and their performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {positions.map(position => (
                  <div key={position.symbol} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="font-bold text-primary">{position.symbol}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">{position.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {position.quantity} {position.symbol}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold">${position.value.toLocaleString()}</p>
                      <p className={`text-sm ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {position.pnl >= 0 ? '+' : ''}${position.pnl.toLocaleString()} 
                        ({position.pnlPercentage >= 0 ? '+' : ''}{position.pnlPercentage.toFixed(2)}%)
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <ArrowUpDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Detailed performance analysis and risk metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Sharpe Ratio</span>
                        <span className="text-sm">2.34</span>
                      </div>
                      <Progress value={78} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Max Drawdown</span>
                        <span className="text-sm text-red-600">-12.4%</span>
                      </div>
                      <Progress value={12.4} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Volatility</span>
                        <span className="text-sm">31.2%</span>
                      </div>
                      <Progress value={31.2} className="h-2" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Total Return</span>
                      <span className="text-sm font-bold text-green-600">+39.5%</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Annualized Return</span>
                      <span className="text-sm font-bold">+28.7%</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Win Rate</span>
                      <span className="text-sm font-bold">67.3%</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Best Month</span>
                      <span className="text-sm font-bold text-green-600">+18.2%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Asset Allocation Analysis</CardTitle>
                <CardDescription>
                  Current allocation vs. target allocation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {positions.map(position => (
                    <div key={position.symbol} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{position.name} ({position.symbol})</span>
                        <span className="text-sm text-muted-foreground">
                          {position.allocation}% current
                        </span>
                      </div>
                      <Progress value={position.allocation} className="h-3" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Current: ${position.value.toLocaleString()}</span>
                        <span>Target: 33.3%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
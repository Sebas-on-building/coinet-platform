import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Award,
  AlertCircle,
  Clock,
  DollarSign,
  BarChart3,
  Zap,
  Download,
  Share,
  Calendar,
} from 'lucide-react';
import { CustomAgent } from '@/types/agents';

interface AgentPerformanceAnalyticsProps {
  agent: CustomAgent;
  className?: string;
}

// Mock performance data
const mockPerformanceData = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }),
  profit: Math.random() * 1000 - 300,
  executions: Math.floor(Math.random() * 50) + 10,
  successRate: 60 + Math.random() * 30,
  volume: Math.random() * 50000 + 10000,
}));

const mockTrades = Array.from({ length: 20 }, (_, i) => ({
  id: `trade-${i}`,
  timestamp: Date.now() - i * 3600000,
  symbol: ['BTC/USD', 'ETH/USD', 'SOL/USD'][Math.floor(Math.random() * 3)],
  side: Math.random() > 0.5 ? 'buy' : 'sell',
  quantity: (Math.random() * 2 + 0.1).toFixed(4),
  price: Math.floor(Math.random() * 50000) + 20000,
  pnl: (Math.random() * 500 - 200).toFixed(2),
  status: ['completed', 'pending', 'failed'][Math.floor(Math.random() * 3)],
}));

export function AgentPerformanceAnalytics({ agent, className }: AgentPerformanceAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'profit' | 'executions' | 'successRate'>('profit');

  const performance = agent.performance;
  const totalProfit = mockPerformanceData.reduce((sum, d) => sum + d.profit, 0);
  const avgDailyProfit = totalProfit / mockPerformanceData.length;
  const bestDay = Math.max(...mockPerformanceData.map((d) => d.profit));
  const worstDay = Math.min(...mockPerformanceData.map((d) => d.profit));

  const metrics = [
    {
      label: 'Total Return',
      value: `$${totalProfit.toFixed(2)}`,
      change: totalProfit > 0 ? '+12.5%' : '-3.2%',
      positive: totalProfit > 0,
      icon: DollarSign,
    },
    {
      label: 'Win Rate',
      value: `${performance.successRate.toFixed(1)}%`,
      change: '+2.1%',
      positive: true,
      icon: Target,
    },
    {
      label: 'Total Executions',
      value: performance.totalExecutions.toString(),
      change: '+45',
      positive: true,
      icon: Activity,
    },
    {
      label: 'Avg. Execution Time',
      value: `${performance.averageExecutionTime.toFixed(2)}s`,
      change: '-0.3s',
      positive: true,
      icon: Clock,
    },
    {
      label: 'Sharpe Ratio',
      value: (performance.sharpeRatio || 1.5).toFixed(2),
      change: '+0.2',
      positive: true,
      icon: Award,
    },
    {
      label: 'Max Drawdown',
      value: `${((performance.maxDrawdown || 0.15) * 100).toFixed(1)}%`,
      change: '-2.1%',
      positive: true,
      icon: AlertCircle,
    },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Analytics</h2>
          <p className="text-muted-foreground">Detailed performance metrics for {agent.name}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range === 'all' ? 'All Time' : range.toUpperCase()}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', 'bg-primary/10')}>
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  {metric.change && (
                    <Badge variant={metric.positive ? 'default' : 'destructive'} className="text-xs">
                      {metric.change}
                    </Badge>
                  )}
                </div>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="text-xs text-muted-foreground">{metric.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Charts */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Main Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Profit Over Time</CardTitle>
                <div className="flex gap-2">
                  {(['profit', 'executions', 'successRate'] as const).map((metric) => (
                    <Button
                      key={metric}
                      variant={selectedMetric === metric ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedMetric(metric)}
                    >
                      {metric === 'profit'
                        ? 'Profit'
                        : metric === 'executions'
                        ? 'Executions'
                        : 'Success Rate'}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockPerformanceData}>
                    <defs>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey={selectedMetric}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#colorProfit)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Secondary Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Executions</CardTitle>
                <CardDescription>Number of trades executed per day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockPerformanceData.slice(-14)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="executions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Success Rate Trend</CardTitle>
                <CardDescription>Execution success rate over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockPerformanceData.slice(-14)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="successRate"
                        stroke="hsl(var(--success))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trades Tab */}
        <TabsContent value="trades">
          <Card>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
              <CardDescription>Latest execution history</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {mockTrades.map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            trade.side === 'buy' ? 'bg-success/10' : 'bg-destructive/10'
                          )}
                        >
                          {trade.side === 'buy' ? (
                            <TrendingUp className="w-5 h-5 text-success" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-destructive" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{trade.symbol}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(trade.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-medium">
                          {trade.side === 'buy' ? '+' : '-'}
                          {trade.quantity}
                        </div>
                        <div className="text-sm text-muted-foreground">${trade.price.toLocaleString()}</div>
                      </div>

                      <div className="text-right">
                        <div
                          className={cn(
                            'font-medium',
                            parseFloat(trade.pnl) >= 0 ? 'text-success' : 'text-destructive'
                          )}
                        >
                          {parseFloat(trade.pnl) >= 0 ? '+' : ''}${trade.pnl}
                        </div>
                        <Badge
                          variant={trade.status === 'completed' ? 'default' : trade.status === 'pending' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {trade.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profit Distribution</CardTitle>
                <CardDescription>Distribution of profits across trades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { range: '<-$200', count: 5 },
                        { range: '-$200-0', count: 12 },
                        { range: '$0-200', count: 25 },
                        { range: '$200-500', count: 18 },
                        { range: '>$500', count: 8 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Best Day</span>
                    <span className="font-medium text-success">+${bestDay.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Worst Day</span>
                    <span className="font-medium text-destructive">-${Math.abs(worstDay).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Avg. Daily Profit</span>
                    <span className="font-medium">${avgDailyProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Profit Factor</span>
                    <span className="font-medium">{(totalProfit / Math.abs(worstDay * 10)).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Benchmark Comparison</CardTitle>
              <CardDescription>Compare against market benchmarks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={mockPerformanceData.map((d) => ({
                      ...d,
                      benchmark: d.profit * 0.7 + Math.random() * 100,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      name="Your Agent"
                    />
                    <Line
                      type="monotone"
                      dataKey="benchmark"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Market Average"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

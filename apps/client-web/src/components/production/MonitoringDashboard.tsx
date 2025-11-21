import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Zap, 
  Database, 
  Server, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  MessageSquare,
  TrendingUp,
  Cpu,
  HardDrive,
  Wifi
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface SystemMetrics {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  uptime: string;
  requests: number;
  errors: number;
  latency: number;
}

interface PerformanceData {
  timestamp: string;
  requests: number;
  latency: number;
  errors: number;
  cpu: number;
}

export function MonitoringDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 45,
    memory: 67,
    storage: 23,
    network: 89,
    uptime: "99.8%",
    requests: 24567,
    errors: 23,
    latency: 145
  });

  // Mock performance data
  const performanceData: PerformanceData[] = [
    { timestamp: "00:00", requests: 1200, latency: 120, errors: 2, cpu: 45 },
    { timestamp: "04:00", requests: 800, latency: 110, errors: 1, cpu: 32 },
    { timestamp: "08:00", requests: 2400, latency: 150, errors: 5, cpu: 67 },
    { timestamp: "12:00", requests: 3200, latency: 180, errors: 8, cpu: 78 },
    { timestamp: "16:00", requests: 2800, latency: 165, errors: 4, cpu: 65 },
    { timestamp: "20:00", requests: 1800, latency: 135, errors: 3, cpu: 52 },
    { timestamp: "24:00", requests: 1400, latency: 125, errors: 2, cpu: 41 }
  ];

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        cpu: Math.max(20, Math.min(90, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(30, Math.min(85, prev.memory + (Math.random() - 0.5) * 5)),
        requests: prev.requests + Math.floor(Math.random() * 100),
        latency: Math.max(80, Math.min(300, prev.latency + (Math.random() - 0.5) * 20))
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return "text-red-600";
    if (value >= thresholds.warning) return "text-yellow-600";
    return "text-green-600";
  };

  const getStatusBadge = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return <Badge variant="destructive">Critical</Badge>;
    if (value >= thresholds.warning) return <Badge variant="secondary">Warning</Badge>;
    return <Badge variant="default">Healthy</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Status</p>
                <p className="text-2xl font-bold text-green-600">Online</p>
                <p className="text-xs text-muted-foreground">Uptime: {metrics.uptime}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">1,234</p>
                <p className="text-xs text-green-600">+12% today</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Requests/Hour</p>
                <p className="text-2xl font-bold">{metrics.requests.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Avg: {metrics.latency}ms</p>
              </div>
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-bold">0.1%</p>
                <p className="text-xs text-muted-foreground">{metrics.errors} errors</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Monitoring Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="agents">AI Agents</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Request Volume Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Request Volume</CardTitle>
                <CardDescription>API requests over the last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="requests" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* System Resources */}
            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
                <CardDescription>Current resource utilization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      CPU Usage
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${getStatusColor(metrics.cpu, { warning: 70, critical: 90 })}`}>
                        {metrics.cpu.toFixed(1)}%
                      </span>
                      {getStatusBadge(metrics.cpu, { warning: 70, critical: 90 })}
                    </div>
                  </div>
                  <Progress value={metrics.cpu} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Memory Usage
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${getStatusColor(metrics.memory, { warning: 80, critical: 95 })}`}>
                        {metrics.memory}%
                      </span>
                      {getStatusBadge(metrics.memory, { warning: 80, critical: 95 })}
                    </div>
                  </div>
                  <Progress value={metrics.memory} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      Storage Usage
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${getStatusColor(metrics.storage, { warning: 85, critical: 95 })}`}>
                        {metrics.storage}%
                      </span>
                      {getStatusBadge(metrics.storage, { warning: 85, critical: 95 })}
                    </div>
                  </div>
                  <Progress value={metrics.storage} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Wifi className="w-4 h-4" />
                      Network I/O
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-600">{metrics.network}%</span>
                      <Badge variant="default">Healthy</Badge>
                    </div>
                  </div>
                  <Progress value={metrics.network} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Response times and error rates over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="latency" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        name="Latency (ms)"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="errors" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        name="Errors"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-4">
          <div className="grid gap-4">
            {/* Supabase Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Database Status
                </CardTitle>
                <CardDescription>Supabase infrastructure monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-semibold">Database</h4>
                    <p className="text-sm text-green-600">Operational</p>
                    <p className="text-xs text-muted-foreground">Response: 23ms</p>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-semibold">Auth</h4>
                    <p className="text-sm text-green-600">Operational</p>
                    <p className="text-xs text-muted-foreground">Response: 45ms</p>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-semibold">Edge Functions</h4>
                    <p className="text-sm text-green-600">Operational</p>
                    <p className="text-xs text-muted-foreground">Response: 67ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* External APIs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="w-5 h-5" />
                  External API Status
                </CardTitle>
                <CardDescription>Third-party service monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">CoinGecko API</span>
                    </div>
                    <div className="text-right">
                      <Badge variant="default">Connected</Badge>
                      <p className="text-xs text-muted-foreground">34ms avg</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">OpenAI API</span>
                    </div>
                    <div className="text-right">
                      <Badge variant="default">Connected</Badge>
                      <p className="text-xs text-muted-foreground">1.2s avg</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="font-medium">News API</span>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">Degraded</Badge>
                      <p className="text-xs text-muted-foreground">2.1s avg</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  AI Agent Performance
                </CardTitle>
                <CardDescription>Real-time agent execution monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Active Agents</span>
                      <Badge variant="default">42 Running</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Executions Today</span>
                      <span className="font-bold">2,847</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Success Rate</span>
                      <span className="font-bold text-green-600">94.2%</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Avg Processing Time</span>
                      <span className="font-bold">1.8s</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Chat Processing</span>
                        <Badge variant="default">Online</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">1,245 messages processed</p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Alert Engine</span>
                        <Badge variant="default">Online</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">89 alerts evaluated</p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Market Analysis</span>
                        <Badge variant="default">Online</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Real-time monitoring active</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  System Alerts
                </CardTitle>
                <CardDescription>Recent alerts and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium">High Memory Usage</h4>
                      <p className="text-sm text-muted-foreground">Memory usage exceeded 80% threshold</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                    <Badge variant="secondary">Warning</Badge>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium">Database Backup Completed</h4>
                      <p className="text-sm text-muted-foreground">Scheduled backup completed successfully</p>
                      <p className="text-xs text-muted-foreground">1 hour ago</p>
                    </div>
                    <Badge variant="default">Success</Badge>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium">Traffic Spike Detected</h4>
                      <p className="text-sm text-muted-foreground">40% increase in API requests</p>
                      <p className="text-xs text-muted-foreground">3 hours ago</p>
                    </div>
                    <Badge variant="outline">Info</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
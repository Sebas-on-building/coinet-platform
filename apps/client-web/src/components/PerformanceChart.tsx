import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Activity, Target, DollarSign, Shield } from "lucide-react";

interface PerformanceChartProps {
  data?: any;
  type: "returns" | "risk" | "confidence" | "backtest";
  className?: string;
}

// Mock chart data generators
const generateReturnsData = () => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return months.map((month, index) => ({
    month,
    returns: Math.random() * 20 - 5, // -5% to 15%
    benchmark: Math.random() * 10 - 2, // -2% to 8%
    cumulative: (index + 1) * 3 + Math.random() * 5
  }));
};

const generateRiskData = () => [
  { name: "Low Risk", value: 35, color: "#10B981" },
  { name: "Medium Risk", value: 45, color: "#F59E0B" },
  { name: "High Risk", value: 20, color: "#EF4444" }
];

const generateConfidenceData = () => [
  { metric: "Technical Analysis", confidence: 92, color: "#192CFC" },
  { metric: "Sentiment Analysis", confidence: 85, color: "#8B5CF6" },
  { metric: "Risk Management", confidence: 88, color: "#10B981" },
  { metric: "Data Quality", confidence: 91, color: "#F59E0B" }
];

const generateBacktestData = () => {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  let cumulative = 0;
  return days.map(day => {
    const dailyReturn = (Math.random() - 0.48) * 2; // Slight positive bias
    cumulative += dailyReturn;
    return {
      day: `Day ${day}`,
      profit: dailyReturn,
      cumulative,
      trades: Math.floor(Math.random() * 5) + 1
    };
  });
};

export function PerformanceChart({ data, type, className = "" }: PerformanceChartProps) {
  const renderReturnsChart = () => {
    const chartData = data || generateReturnsData();
    
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Projected Returns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">+15.2%</div>
              <div className="text-sm text-muted-foreground">6M Projected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">1.8</div>
              <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">-8.5%</div>
              <div className="text-sm text-muted-foreground">Max Drawdown</div>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.2)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="benchmark"
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                strokeWidth={1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderRiskChart = () => {
    const chartData = data || generateRiskData();
    
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3">
              {chartData.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <Badge variant="outline">{item.value}%</Badge>
                </div>
              ))}
              
              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Risk Score</span>
                    <Badge variant="secondary">Medium</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>VaR (95%)</span>
                    <span className="font-medium">-$2,450</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderConfidenceChart = () => {
    const chartData = data || generateConfidenceData();
    
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            Confidence Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="metric" width={120} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="confidence" 
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium">Overall Confidence</div>
              <div className="text-2xl font-bold text-primary">89%</div>
            </div>
            <div>
              <div className="font-medium">Reliability Index</div>
              <div className="text-2xl font-bold text-green-500">A+</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderBacktestChart = () => {
    const chartData = data || generateBacktestData();
    
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-500" />
            Backtest Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-500">156</div>
              <div className="text-xs text-muted-foreground">Total Trades</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-500">62%</div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-500">1.4</div>
              <div className="text-xs text-muted-foreground">Profit Factor</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-500">5</div>
              <div className="text-xs text-muted-foreground">Max Losses</div>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  switch (type) {
    case "returns":
      return renderReturnsChart();
    case "risk":
      return renderRiskChart();
    case "confidence":
      return renderConfidenceChart();
    case "backtest":
      return renderBacktestChart();
    default:
      return renderReturnsChart();
  }
}
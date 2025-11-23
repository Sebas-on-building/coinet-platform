import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  DollarSign,
  BarChart3,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { BacktestResult } from '../types/agents';

interface PerformanceMetricsProps {
  results: BacktestResult[];
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ results }) => {
  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">No performance data available. Run a backtest first.</p>
        </CardContent>
      </Card>
    );
  }

  const latestResult = results[0];
  
  const performanceScore = Math.min(100, Math.max(0, 
    (latestResult.winRate + (latestResult.totalReturn > 0 ? 50 : 0) + (latestResult.sharpeRatio * 10)) / 1.5
  ));

  const metrics = [
    {
      label: 'Total Return',
      value: `${latestResult.totalReturn.toFixed(2)}%`,
      icon: latestResult.totalReturn > 0 ? TrendingUp : TrendingDown,
      color: latestResult.totalReturn > 0 ? 'text-green-600' : 'text-red-600',
      bgColor: latestResult.totalReturn > 0 ? 'bg-green-50' : 'bg-red-50'
    },
    {
      label: 'Win Rate',
      value: `${latestResult.winRate.toFixed(1)}%`,
      icon: Target,
      color: latestResult.winRate > 60 ? 'text-green-600' : latestResult.winRate > 40 ? 'text-yellow-600' : 'text-red-600',
      bgColor: latestResult.winRate > 60 ? 'bg-green-50' : latestResult.winRate > 40 ? 'bg-yellow-50' : 'bg-red-50'
    },
    {
      label: 'Sharpe Ratio',
      value: latestResult.sharpeRatio.toFixed(2),
      icon: Shield,
      color: latestResult.sharpeRatio > 1 ? 'text-green-600' : latestResult.sharpeRatio > 0.5 ? 'text-yellow-600' : 'text-red-600',
      bgColor: latestResult.sharpeRatio > 1 ? 'bg-green-50' : latestResult.sharpeRatio > 0.5 ? 'bg-yellow-50' : 'bg-red-50'
    },
    {
      label: 'Max Drawdown',
      value: `${latestResult.maxDrawdown.toFixed(2)}%`,
      icon: AlertTriangle,
      color: latestResult.maxDrawdown > -10 ? 'text-green-600' : latestResult.maxDrawdown > -20 ? 'text-yellow-600' : 'text-red-600',
      bgColor: latestResult.maxDrawdown > -10 ? 'bg-green-50' : latestResult.maxDrawdown > -20 ? 'bg-yellow-50' : 'bg-red-50'
    }
  ];

  const tradingStats = [
    { label: 'Total Trades', value: latestResult.totalTrades },
    { label: 'Winning Trades', value: latestResult.winningTrades },
    { label: 'Losing Trades', value: latestResult.losingTrades },
    { label: 'Average Win', value: `${latestResult.averageWin.toFixed(2)}%` },
    { label: 'Average Loss', value: `${latestResult.averageLoss.toFixed(2)}%` },
    { label: 'Calmar Ratio', value: latestResult.calmarRatio.toFixed(2) }
  ];

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overall Performance Score</span>
              <Badge variant={performanceScore > 70 ? "default" : performanceScore > 40 ? "secondary" : "destructive"}>
                {performanceScore > 70 ? 'Excellent' : performanceScore > 40 ? 'Good' : 'Needs Improvement'}
              </Badge>
            </div>
            <Progress value={performanceScore} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Score based on win rate, returns, and risk-adjusted performance
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className={`rounded-lg p-3 ${metric.bgColor}`}>
                <div className="flex items-center justify-between">
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                  <span className={`text-lg font-bold ${metric.color}`}>
                    {metric.value}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{metric.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Trading Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Trading Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tradingStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <span className="font-semibold">{stat.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Capital Evolution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Capital Evolution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Initial Capital</span>
              <span className="font-semibold">${latestResult.initialCapital.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Final Capital</span>
              <span className={`font-semibold ${
                latestResult.finalCapital > latestResult.initialCapital ? 'text-green-600' : 'text-red-600'
              }`}>
                ${latestResult.finalCapital.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Net Profit/Loss</span>
              <span className={`font-semibold ${
                latestResult.finalCapital > latestResult.initialCapital ? 'text-green-600' : 'text-red-600'
              }`}>
                ${(latestResult.finalCapital - latestResult.initialCapital).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Risk-Adjusted Returns</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                  <span className="font-medium">{latestResult.sharpeRatio.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Calmar Ratio</span>
                  <span className="font-medium">{latestResult.calmarRatio.toFixed(3)}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Drawdown Analysis</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Maximum Drawdown</span>
                  <span className="font-medium text-red-600">{latestResult.maxDrawdown.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Recovery Factor</span>
                  <span className="font-medium">
                    {(latestResult.totalReturn / Math.abs(latestResult.maxDrawdown)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
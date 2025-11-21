import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield,
  Zap,
  Users,
  Award
} from 'lucide-react';
import { BacktestResult, CustomAgent } from '../types/agents';

interface StrategyComparisonProps {
  results: BacktestResult[];
  agents: CustomAgent[];
}

export const StrategyComparison: React.FC<StrategyComparisonProps> = ({ results, agents }) => {
  const [selectedMetric, setSelectedMetric] = useState<string>('totalReturn');
  
  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">No strategies to compare. Run multiple backtests first.</p>
        </CardContent>
      </Card>
    );
  }

  const getAgentName = (agentId: string) => {
    return agents.find(a => a.id === agentId)?.name || 'Unknown Agent';
  };

  const metrics = [
    { key: 'totalReturn', label: 'Total Return (%)', icon: TrendingUp },
    { key: 'winRate', label: 'Win Rate (%)', icon: Target },
    { key: 'sharpeRatio', label: 'Sharpe Ratio', icon: Shield },
    { key: 'maxDrawdown', label: 'Max Drawdown (%)', icon: TrendingDown },
    { key: 'totalTrades', label: 'Total Trades', icon: Zap }
  ];

  const sortedResults = [...results].sort((a, b) => {
    const aValue = a[selectedMetric as keyof BacktestResult] as number;
    const bValue = b[selectedMetric as keyof BacktestResult] as number;
    
    // For drawdown, smaller (less negative) is better
    if (selectedMetric === 'maxDrawdown') {
      return bValue - aValue;
    }
    return bValue - aValue;
  });

  const getBadgeVariant = (index: number) => {
    if (index === 0) return 'default';
    if (index === 1) return 'secondary';
    return 'outline';
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Award className="h-4 w-4 text-yellow-500" />;
    if (index === 1) return <Award className="h-4 w-4 text-gray-400" />;
    if (index === 2) return <Award className="h-4 w-4 text-amber-600" />;
    return null;
  };

  const getPerformanceColor = (value: number, metric: string) => {
    switch (metric) {
      case 'totalReturn':
        return value > 0 ? 'text-green-600' : 'text-red-600';
      case 'winRate':
        return value > 60 ? 'text-green-600' : value > 40 ? 'text-yellow-600' : 'text-red-600';
      case 'sharpeRatio':
        return value > 1 ? 'text-green-600' : value > 0.5 ? 'text-yellow-600' : 'text-red-600';
      case 'maxDrawdown':
        return value > -10 ? 'text-green-600' : value > -20 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-foreground';
    }
  };

  const formatValue = (value: number, metric: string) => {
    switch (metric) {
      case 'totalReturn':
      case 'winRate':
      case 'maxDrawdown':
        return `${value.toFixed(2)}%`;
      case 'sharpeRatio':
        return value.toFixed(3);
      default:
        return value.toString();
    }
  };

  return (
    <div className="space-y-6">
      {/* Comparison Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Strategy Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Compare by Metric</label>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {metrics.map(metric => (
                    <SelectItem key={metric.key} value={metric.key}>
                      <div className="flex items-center gap-2">
                        <metric.icon className="h-4 w-4" />
                        {metric.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className="mt-6">
              {results.length} strategies
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedResults.map((result, index) => (
              <div 
                key={result.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getRankIcon(index)}
                    <span className="font-bold text-lg">#{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-medium">{getAgentName(result.agentId)}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(result.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getPerformanceColor(
                      result[selectedMetric as keyof BacktestResult] as number, 
                      selectedMetric
                    )}`}>
                      {formatValue(result[selectedMetric as keyof BacktestResult] as number, selectedMetric)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {metrics.find(m => m.key === selectedMetric)?.label}
                    </div>
                  </div>
                  <Badge variant={getBadgeVariant(index)}>
                    {index === 0 ? 'Best' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}th`}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Metrics Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Strategy</th>
                  <th className="text-right p-2">Total Return</th>
                  <th className="text-right p-2">Win Rate</th>
                  <th className="text-right p-2">Sharpe Ratio</th>
                  <th className="text-right p-2">Max Drawdown</th>
                  <th className="text-right p-2">Total Trades</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((result, index) => (
                  <tr key={result.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {getRankIcon(index)}
                        <span className="font-medium">{getAgentName(result.agentId)}</span>
                      </div>
                    </td>
                    <td className={`p-2 text-right font-medium ${getPerformanceColor(result.totalReturn, 'totalReturn')}`}>
                      {formatValue(result.totalReturn, 'totalReturn')}
                    </td>
                    <td className={`p-2 text-right font-medium ${getPerformanceColor(result.winRate, 'winRate')}`}>
                      {formatValue(result.winRate, 'winRate')}
                    </td>
                    <td className={`p-2 text-right font-medium ${getPerformanceColor(result.sharpeRatio, 'sharpeRatio')}`}>
                      {formatValue(result.sharpeRatio, 'sharpeRatio')}
                    </td>
                    <td className={`p-2 text-right font-medium ${getPerformanceColor(result.maxDrawdown, 'maxDrawdown')}`}>
                      {formatValue(result.maxDrawdown, 'maxDrawdown')}
                    </td>
                    <td className="p-2 text-right font-medium">
                      {result.totalTrades}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Best Performer</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">{getAgentName(sortedResults[0].agentId)}</h4>
                <div className="text-2xl font-bold text-green-600">
                  {formatValue(sortedResults[0][selectedMetric as keyof BacktestResult] as number, selectedMetric)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {metrics.find(m => m.key === selectedMetric)?.label}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Average Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {(() => {
                  const avg = results.reduce((sum, r) => sum + (r[selectedMetric as keyof BacktestResult] as number), 0) / results.length;
                  return formatValue(avg, selectedMetric);
                })()}
              </div>
              <p className="text-sm text-muted-foreground">
                Across {results.length} strategies
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Performance Spread</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {(() => {
                  const values = results.map(r => r[selectedMetric as keyof BacktestResult] as number);
                  const spread = Math.max(...values) - Math.min(...values);
                  return formatValue(spread, selectedMetric);
                })()}
              </div>
              <p className="text-sm text-muted-foreground">
                Range between best and worst
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  TrendingDown, 
  Activity,
  Zap,
  Target,
  BarChart3,
  Info
} from 'lucide-react';
import { BacktestResult } from '../types/agents';

interface RiskAssessmentReportProps {
  results: BacktestResult[];
}

export const RiskAssessmentReport: React.FC<RiskAssessmentReportProps> = ({ results }) => {
  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">No risk assessment data available. Run a backtest first.</p>
        </CardContent>
      </Card>
    );
  }

  const latestResult = results[0];
  
  // Calculate risk scores (0-100)
  const calculateRiskScore = (result: BacktestResult) => {
    const drawdownScore = Math.max(0, 100 - Math.abs(result.maxDrawdown) * 5);
    const volatilityScore = Math.min(100, result.sharpeRatio * 30);
    const consistencyScore = Math.min(100, result.winRate);
    
    return (drawdownScore + volatilityScore + consistencyScore) / 3;
  };

  const riskScore = calculateRiskScore(latestResult);
  
  const getRiskLevel = (score: number) => {
    if (score >= 70) return { level: 'Low Risk', color: 'text-green-600', variant: 'default' as const };
    if (score >= 40) return { level: 'Medium Risk', color: 'text-yellow-600', variant: 'secondary' as const };
    return { level: 'High Risk', color: 'text-red-600', variant: 'destructive' as const };
  };

  const riskAssessment = getRiskLevel(riskScore);

  const riskFactors = [
    {
      factor: 'Maximum Drawdown',
      value: `${latestResult.maxDrawdown.toFixed(2)}%`,
      score: Math.max(0, 100 - Math.abs(latestResult.maxDrawdown) * 5),
      description: 'Largest peak-to-trough decline',
      threshold: -20,
      current: latestResult.maxDrawdown,
      icon: TrendingDown
    },
    {
      factor: 'Win Rate Consistency',
      value: `${latestResult.winRate.toFixed(1)}%`,
      score: Math.min(100, latestResult.winRate),
      description: 'Percentage of profitable trades',
      threshold: 50,
      current: latestResult.winRate,
      icon: Target
    },
    {
      factor: 'Risk-Adjusted Returns',
      value: latestResult.sharpeRatio.toFixed(3),
      score: Math.min(100, latestResult.sharpeRatio * 30),
      description: 'Return per unit of risk (Sharpe Ratio)',
      threshold: 1.0,
      current: latestResult.sharpeRatio,
      icon: Shield
    },
    {
      factor: 'Trade Frequency',
      value: latestResult.totalTrades.toString(),
      score: latestResult.totalTrades > 100 ? 70 : latestResult.totalTrades > 50 ? 85 : 95,
      description: 'Total number of trades executed',
      threshold: 50,
      current: latestResult.totalTrades,
      icon: Activity
    }
  ];

  const riskRecommendations = [
    {
      type: 'warning',
      title: 'High Drawdown Risk',
      description: 'Consider implementing tighter stop-loss levels to reduce maximum drawdown.',
      show: latestResult.maxDrawdown < -15
    },
    {
      type: 'info',
      title: 'Low Win Rate',
      description: 'Strategy shows low win rate. Consider adjusting entry criteria or profit targets.',
      show: latestResult.winRate < 40
    },
    {
      type: 'warning',
      title: 'Poor Risk-Adjusted Returns',
      description: 'Sharpe ratio indicates poor risk-adjusted performance. Review risk management.',
      show: latestResult.sharpeRatio < 0.5
    },
    {
      type: 'info',
      title: 'Overtrading Risk',
      description: 'High trade frequency may indicate overtrading. Consider longer timeframes.',
      show: latestResult.totalTrades > 200
    }
  ];

  const activeRecommendations = riskRecommendations.filter(rec => rec.show);

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Assessment Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Overall Risk Level</h3>
                <p className="text-sm text-muted-foreground">Based on drawdown, volatility, and consistency</p>
              </div>
              <Badge variant={riskAssessment.variant} className="text-sm">
                {riskAssessment.level}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Risk Score</span>
                <span className={`font-semibold ${riskAssessment.color}`}>
                  {riskScore.toFixed(0)}/100
                </span>
              </div>
              <Progress value={riskScore} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Factors Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Risk Factors Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riskFactors.map((factor, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <factor.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{factor.factor}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{factor.value}</div>
                    <div className="text-xs text-muted-foreground">
                      Score: {factor.score.toFixed(0)}/100
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Progress value={factor.score} className="h-2" />
                  <p className="text-xs text-muted-foreground">{factor.description}</p>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Threshold: {typeof factor.threshold === 'number' && factor.threshold < 0 ? '' : '≥'}{factor.threshold}
                  </span>
                  <Badge 
                    variant={
                      (factor.factor === 'Maximum Drawdown' && factor.current > factor.threshold) ||
                      (factor.factor !== 'Maximum Drawdown' && factor.current >= factor.threshold)
                        ? 'default' : 'outline'
                    }
                    className="text-xs"
                  >
                    {(factor.factor === 'Maximum Drawdown' && factor.current > factor.threshold) ||
                     (factor.factor !== 'Maximum Drawdown' && factor.current >= factor.threshold)
                      ? 'Acceptable' : 'Needs Attention'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Recommendations */}
      {activeRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Risk Management Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeRecommendations.map((rec, index) => (
              <Alert key={index} variant={rec.type === 'warning' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">{rec.title}</div>
                    <div className="text-sm">{rec.description}</div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Risk Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Drawdown Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Maximum Drawdown</span>
              <span className="font-semibold text-red-600">
                {latestResult.maxDrawdown.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Recovery Factor</span>
              <span className="font-semibold">
                {(latestResult.totalReturn / Math.abs(latestResult.maxDrawdown)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Calmar Ratio</span>
              <span className="font-semibold">
                {latestResult.calmarRatio.toFixed(3)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Volatility Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
              <span className="font-semibold">
                {latestResult.sharpeRatio.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Win/Loss Ratio</span>
              <span className="font-semibold">
                {(latestResult.averageWin / Math.abs(latestResult.averageLoss)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Profit Factor</span>
              <span className="font-semibold">
                {((latestResult.winningTrades * latestResult.averageWin) / 
                  (latestResult.losingTrades * Math.abs(latestResult.averageLoss))).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Risk Assessment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Key Risk Insights</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Strategy shows {riskAssessment.level.toLowerCase()} based on historical performance</li>
                <li>• Maximum drawdown of {Math.abs(latestResult.maxDrawdown).toFixed(1)}% indicates 
                  {Math.abs(latestResult.maxDrawdown) > 20 ? ' high' : Math.abs(latestResult.maxDrawdown) > 10 ? ' moderate' : ' low'} downside risk
                </li>
                <li>• Win rate of {latestResult.winRate.toFixed(1)}% suggests 
                  {latestResult.winRate > 60 ? ' strong' : latestResult.winRate > 40 ? ' moderate' : ' weak'} consistency
                </li>
                <li>• Sharpe ratio of {latestResult.sharpeRatio.toFixed(2)} indicates 
                  {latestResult.sharpeRatio > 1 ? ' excellent' : latestResult.sharpeRatio > 0.5 ? ' acceptable' : ' poor'} risk-adjusted returns
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
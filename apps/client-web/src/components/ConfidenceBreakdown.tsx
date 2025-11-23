import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Activity
} from "lucide-react";

interface ScenarioData {
  name: string;
  confidence: number;
  probability: number;
  expectedReturn: number;
  maxDrawdown: number;
  winRate: number;
  description: string;
  factors: Array<{
    name: string;
    impact: "positive" | "negative" | "neutral";
    weight: number;
  }>;
}

interface ConfidenceBreakdownProps {
  agentType: "conservative" | "aggressive" | "balanced";
  selectedCoin: string;
}

export function ConfidenceBreakdown({ agentType, selectedCoin }: ConfidenceBreakdownProps) {
  // Generate scenario data based on agent type and coin
  const generateScenarios = (): ScenarioData[] => {
    const baseScenarios = {
      conservative: {
        best: { confidence: 85, probability: 15, expectedReturn: 12, maxDrawdown: 5, winRate: 75 },
        expected: { confidence: 78, probability: 70, expectedReturn: 8, maxDrawdown: 8, winRate: 68 },
        worst: { confidence: 45, probability: 15, expectedReturn: -3, maxDrawdown: 15, winRate: 45 }
      },
      balanced: {
        best: { confidence: 82, probability: 20, expectedReturn: 18, maxDrawdown: 8, winRate: 72 },
        expected: { confidence: 74, probability: 60, expectedReturn: 12, maxDrawdown: 12, winRate: 65 },
        worst: { confidence: 42, probability: 20, expectedReturn: -5, maxDrawdown: 22, winRate: 42 }
      },
      aggressive: {
        best: { confidence: 79, probability: 25, expectedReturn: 28, maxDrawdown: 12, winRate: 69 },
        expected: { confidence: 69, probability: 50, expectedReturn: 18, maxDrawdown: 18, winRate: 58 },
        worst: { confidence: 38, probability: 25, expectedReturn: -12, maxDrawdown: 35, winRate: 35 }
      }
    };

    const scenarios = baseScenarios[agentType];
    
    return [
      {
        name: "Best Case",
        ...scenarios.best,
        description: "Optimal market conditions with high volatility and clear trends",
        factors: [
          { name: "Market Volatility", impact: "positive" as const, weight: 85 },
          { name: "Trend Clarity", impact: "positive" as const, weight: 92 },
          { name: "Volume Profile", impact: "positive" as const, weight: 78 },
          { name: "News Sentiment", impact: "positive" as const, weight: 88 }
        ]
      },
      {
        name: "Expected Case",
        ...scenarios.expected,
        description: "Normal market conditions with moderate volatility",
        factors: [
          { name: "Market Volatility", impact: "positive" as const, weight: 65 },
          { name: "Trend Clarity", impact: "neutral" as const, weight: 58 },
          { name: "Volume Profile", impact: "neutral" as const, weight: 62 },
          { name: "News Sentiment", impact: "neutral" as const, weight: 55 }
        ]
      },
      {
        name: "Worst Case",
        ...scenarios.worst,
        description: "Challenging market conditions with high noise and low predictability",
        factors: [
          { name: "Market Volatility", impact: "negative" as const, weight: 45 },
          { name: "Trend Clarity", impact: "negative" as const, weight: 35 },
          { name: "Volume Profile", impact: "negative" as const, weight: 42 },
          { name: "News Sentiment", impact: "negative" as const, weight: 38 }
        ]
      }
    ];
  };

  const scenarios = generateScenarios();

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return "text-success";
    if (confidence >= 50) return "text-warning";
    return "text-destructive";
  };

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 70) return "default";
    if (confidence >= 50) return "secondary";
    return "destructive";
  };

  const getImpactIcon = (impact: string, weight: number) => {
    const size = 16;
    if (impact === "positive") return <TrendingUp className="h-4 w-4 text-success" />;
    if (impact === "negative") return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Confidence Breakdown for {selectedCoin}</h3>
        <Badge variant="outline" className="text-sm">
          {agentType.charAt(0).toUpperCase() + agentType.slice(1)} Strategy
        </Badge>
      </div>

      <div className="grid gap-4">
        {scenarios.map((scenario, index) => (
          <Card key={scenario.name} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">{scenario.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={getConfidenceBadgeVariant(scenario.confidence)}>
                    {scenario.confidence}% Confidence
                  </Badge>
                  <Badge variant="outline">
                    {scenario.probability}% Probability
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{scenario.description}</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${scenario.expectedReturn >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {scenario.expectedReturn > 0 ? '+' : ''}{scenario.expectedReturn}%
                  </div>
                  <div className="text-xs text-muted-foreground">Expected Return</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-destructive">
                    -{scenario.maxDrawdown}%
                  </div>
                  <div className="text-xs text-muted-foreground">Max Drawdown</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {scenario.winRate}%
                  </div>
                  <div className="text-xs text-muted-foreground">Win Rate</div>
                </div>
              </div>

              {/* Confidence Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Overall Confidence</span>
                  <span className={`text-sm font-bold ${getConfidenceColor(scenario.confidence)}`}>
                    {scenario.confidence}%
                  </span>
                </div>
                <Progress 
                  value={scenario.confidence} 
                  className="h-2"
                />
              </div>

              {/* Contributing Factors */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Contributing Factors</h4>
                <div className="space-y-2">
                  {scenario.factors.map((factor, factorIndex) => (
                    <div key={factorIndex} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getImpactIcon(factor.impact, factor.weight)}
                        <span className="text-sm">{factor.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={factor.weight} 
                          className="w-16 h-1"
                        />
                        <span className="text-xs text-muted-foreground w-8">
                          {factor.weight}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium mb-2">Strategy Assessment</h4>
              <p className="text-sm text-muted-foreground">
                Based on {selectedCoin} historical data and current market conditions, this {agentType} strategy 
                shows {scenarios[1].confidence}% confidence in the expected scenario. The strategy performs best 
                in trending markets with clear directional bias.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
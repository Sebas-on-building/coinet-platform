import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Link2, 
  Activity, 
  TrendingUp, 
  Brain, 
  Newspaper, 
  DollarSign,
  Settings2,
  Trash2,
  Copy,
  Play,
  Pause
} from "lucide-react";

interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  sources: string[];
  conditions: CorrelationCondition[];
  logicalOperator: "AND" | "OR";
  enabled: boolean;
  confidence: number;
  triggeredCount: number;
  lastTriggered?: Date;
}

interface CorrelationCondition {
  sourceA: string;
  sourceB: string;
  relationship: "positive" | "negative" | "threshold" | "divergence";
  strength: number; // correlation strength 0-1
  timeWindow: string; // "1m", "5m", "1h", etc.
}

export function CrossSourceCorrelationBuilder() {
  const [activeTab, setActiveTab] = useState("rules");
  const [correlationRules, setCorrelationRules] = useState<CorrelationRule[]>([
    {
      id: "rule-1",
      name: "Positive News + Volume Spike",
      description: "Triggers when positive news sentiment correlates with high trading volume",
      sources: ["cryptopanic-news", "binance-market"],
      conditions: [
        {
          sourceA: "cryptopanic-news",
          sourceB: "binance-market",
          relationship: "positive",
          strength: 0.7,
          timeWindow: "15m"
        }
      ],
      logicalOperator: "AND",
      enabled: true,
      confidence: 87,
      triggeredCount: 23,
      lastTriggered: new Date(Date.now() - 3600000)
    },
    {
      id: "rule-2",
      name: "Whale Activity + Sentiment Shift",
      description: "Activates when large transfers correlate with sentiment changes",
      sources: ["whale-alert", "twitter-sentiment"],
      conditions: [
        {
          sourceA: "whale-alert",
          sourceB: "twitter-sentiment",
          relationship: "threshold",
          strength: 0.6,
          timeWindow: "30m"
        }
      ],
      logicalOperator: "AND",
      enabled: true,
      confidence: 92,
      triggeredCount: 17,
      lastTriggered: new Date(Date.now() - 7200000)
    },
    {
      id: "rule-3",
      name: "AI Risk + Market Volatility",
      description: "Monitors correlation between AI risk flags and market volatility",
      sources: ["coinet-ai", "binance-market"],
      conditions: [
        {
          sourceA: "coinet-ai",
          sourceB: "binance-market",
          relationship: "positive",
          strength: 0.8,
          timeWindow: "1h"
        }
      ],
      logicalOperator: "AND",
      enabled: false,
      confidence: 78,
      triggeredCount: 8
    }
  ]);

  const availableDataSources = [
    { id: "binance-market", name: "Binance Market Data", type: "market" },
    { id: "coingecko-data", name: "CoinGecko API", type: "market" },
    { id: "twitter-sentiment", name: "Twitter Sentiment", type: "sentiment" },
    { id: "whale-alert", name: "Whale Alert", type: "onchain" },
    { id: "cryptopanic-news", name: "CryptoPanic News", type: "news" },
    { id: "coinet-ai", name: "Coinet AI Insights", type: "ai-insights" }
  ];

  const toggleRule = (id: string) => {
    setCorrelationRules(prev => prev.map(rule => 
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const duplicateRule = (id: string) => {
    const rule = correlationRules.find(r => r.id === id);
    if (!rule) return;
    
    const newRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      name: `${rule.name} (Copy)`,
      enabled: false,
      triggeredCount: 0,
      lastTriggered: undefined
    };
    
    setCorrelationRules(prev => [...prev, newRule]);
  };

  const deleteRule = (id: string) => {
    setCorrelationRules(prev => prev.filter(rule => rule.id !== id));
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "market": return <TrendingUp className="h-4 w-4" />;
      case "sentiment": return <Brain className="h-4 w-4" />;
      case "news": return <Newspaper className="h-4 w-4" />;
      case "ai-insights": return <Activity className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getRelationshipBadge = (relationship: string) => {
    const variants = {
      positive: "default",
      negative: "destructive",
      threshold: "secondary",
      divergence: "outline"
    } as const;
    
    return variants[relationship as keyof typeof variants] || "outline";
  };

  const mockCorrelationMatrix = [
    { sourceA: "Price", sourceB: "Volume", correlation: 0.84, trend: "stable" },
    { sourceA: "Sentiment", sourceB: "Price", correlation: 0.67, trend: "increasing" },
    { sourceA: "News", sourceB: "Sentiment", correlation: 0.72, trend: "stable" },
    { sourceA: "Whale Activity", sourceB: "Price", correlation: 0.58, trend: "decreasing" },
    { sourceA: "AI Risk", sourceB: "Volatility", correlation: 0.75, trend: "increasing" },
    { sourceA: "Social Volume", sourceB: "Price", correlation: 0.43, trend: "stable" }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Cross-Source Correlations</h1>
          <p className="text-muted-foreground mt-2">
            Build intelligent triggers based on data source correlations and relationships
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{correlationRules.filter(r => r.enabled).length}</div>
            <div className="text-xs text-muted-foreground">Active Rules</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {correlationRules.reduce((sum, rule) => sum + rule.triggeredCount, 0)}
            </div>
            <div className="text-xs text-muted-foreground">Total Triggers</div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules">Correlation Rules</TabsTrigger>
          <TabsTrigger value="matrix">Correlation Matrix</TabsTrigger>
          <TabsTrigger value="builder">Rule Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          <div className="grid gap-6">
            {correlationRules.map((rule) => (
              <Card key={rule.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Link2 className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{rule.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={rule.enabled ? "default" : "secondary"}>
                            {rule.enabled ? "Active" : "Disabled"}
                          </Badge>
                          <Badge variant="outline">{rule.confidence}% confidence</Badge>
                          <Badge variant="outline">{rule.triggeredCount} triggers</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => duplicateRule(rule.id)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toggleRule(rule.id)}>
                        {rule.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteRule(rule.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium">Data Sources</h4>
                    <div className="flex gap-2">
                      {rule.sources.map((sourceId, index) => {
                        const source = availableDataSources.find(s => s.id === sourceId);
                        return source ? (
                          <div key={sourceId} className="flex items-center gap-2 p-2 border rounded-lg">
                            {getSourceIcon(source.type)}
                            <span className="text-sm">{source.name}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Correlation Conditions</h4>
                    <div className="space-y-2">
                      {rule.conditions.map((condition, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm">
                            <span className="font-medium">{condition.sourceA}</span>
                            <span className="mx-2">↔</span>
                            <span className="font-medium">{condition.sourceB}</span>
                          </div>
                          <Badge variant={getRelationshipBadge(condition.relationship)}>
                            {condition.relationship}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            {(condition.strength * 100).toFixed(0)}% strength
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {condition.timeWindow} window
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {rule.lastTriggered && (
                    <div className="text-sm text-muted-foreground">
                      Last triggered: {rule.lastTriggered.toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="matrix" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Real-Time Correlation Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {mockCorrelationMatrix.map((correlation, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">
                          {correlation.sourceA} ↔ {correlation.sourceB}
                        </div>
                        <Badge variant={correlation.trend === "increasing" ? "default" : correlation.trend === "decreasing" ? "destructive" : "secondary"}>
                          {correlation.trend}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`text-2xl font-bold ${
                          correlation.correlation >= 0.7 ? 'text-green-500' : 
                          correlation.correlation >= 0.5 ? 'text-blue-500' : 
                          correlation.correlation >= 0.3 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {correlation.correlation.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">correlation</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Correlation Strength Guide</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-green-500"></div>
                      <span>Strong (0.7+)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-blue-500"></div>
                      <span>Moderate (0.5-0.7)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-yellow-500"></div>
                      <span>Weak (0.3-0.5)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-red-500"></div>
                      <span>None (0-0.3)</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builder" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Build New Correlation Rule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input 
                    id="rule-name" 
                    placeholder="Enter rule name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="logical-operator">Logic Operator</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select operator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND (All conditions must be true)</SelectItem>
                      <SelectItem value="OR">OR (Any condition can be true)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  placeholder="Describe what this correlation rule does..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Data Source Correlation</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Source A</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select first data source" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDataSources.map((source) => (
                          <SelectItem key={source.id} value={source.id}>
                            <div className="flex items-center gap-2">
                              {getSourceIcon(source.type)}
                              {source.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Source B</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select second data source" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDataSources.map((source) => (
                          <SelectItem key={source.id} value={source.id}>
                            <div className="flex items-center gap-2">
                              {getSourceIcon(source.type)}
                              {source.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Relationship Type</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="positive">Positive Correlation</SelectItem>
                        <SelectItem value="negative">Negative Correlation</SelectItem>
                        <SelectItem value="threshold">Threshold Based</SelectItem>
                        <SelectItem value="divergence">Divergence Detection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Minimum Strength</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Correlation strength" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.3">Weak (30%)</SelectItem>
                        <SelectItem value="0.5">Moderate (50%)</SelectItem>
                        <SelectItem value="0.7">Strong (70%)</SelectItem>
                        <SelectItem value="0.9">Very Strong (90%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Time Window</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Time frame" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1m">1 minute</SelectItem>
                        <SelectItem value="5m">5 minutes</SelectItem>
                        <SelectItem value="15m">15 minutes</SelectItem>
                        <SelectItem value="30m">30 minutes</SelectItem>
                        <SelectItem value="1h">1 hour</SelectItem>
                        <SelectItem value="4h">4 hours</SelectItem>
                        <SelectItem value="1d">1 day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Switch id="auto-enable" />
                  <Label htmlFor="auto-enable">Enable rule automatically after creation</Label>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Correlation Rule
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
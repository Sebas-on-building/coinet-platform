import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ArrowRight, Settings, TrendingUp, BarChart3, Zap, Timer } from 'lucide-react';
import type { AdvancedAlert, AlertSignal, SignalType, SignalOperator } from '@/types/advancedAlerts';
import { useAdvancedAlerts } from '@/hooks/useAdvancedAlerts';

interface VisualAlertStudioProps {
  onSave?: (alert: AdvancedAlert) => void;
  initialAlert?: Partial<AdvancedAlert>;
}

export function VisualAlertStudio({ onSave, initialAlert }: VisualAlertStudioProps) {
  const { createAlert, templates } = useAdvancedAlerts();
  const [currentAlert, setCurrentAlert] = useState<Partial<AdvancedAlert>>({
    name: '',
    description: '',
    priority: 'medium',
    status: 'active',
    signals: [],
    sequence_config: null,
    filters: {
      assets: [],
      exchanges: [],
      market_cap_min: null,
      market_cap_max: null
    },
    routing: {
      tier: 'important',
      channels: ['in_app']
    },
    cooldown_minutes: 20,
    confidence_threshold: 0.7,
    ...initialAlert
  });

  const [activeStep, setActiveStep] = useState<'signals' | 'sequence' | 'filters' | 'routing'>('signals');
  const [showPreview, setShowPreview] = useState(false);

  // Signal Types with descriptions
  const signalTypes: Array<{type: SignalType, label: string, category: string, icon: React.ReactNode}> = [
    // Market Microstructure
    { type: 'spread_shock', label: 'Spread Shock', category: 'microstructure', icon: <BarChart3 className="w-4 h-4" /> },
    { type: 'depth_imbalance', label: 'Depth Imbalance', category: 'microstructure', icon: <TrendingUp className="w-4 h-4" /> },
    { type: 'funding_flip', label: 'Funding Rate Flip', category: 'microstructure', icon: <Zap className="w-4 h-4" /> },
    { type: 'oi_spike', label: 'Open Interest Spike', category: 'microstructure', icon: <BarChart3 className="w-4 h-4" /> },
    
    // On-chain
    { type: 'whale_accumulation', label: 'Whale Accumulation', category: 'onchain', icon: <TrendingUp className="w-4 h-4" /> },
    { type: 'smart_money_flow', label: 'Smart Money Flow', category: 'onchain', icon: <Zap className="w-4 h-4" /> },
    { type: 'exchange_inflow', label: 'Exchange Inflow', category: 'onchain', icon: <BarChart3 className="w-4 h-4" /> },
    { type: 'bridge_flow', label: 'Bridge Flow', category: 'onchain', icon: <TrendingUp className="w-4 h-4" /> },
    
    // Risk & Security
    { type: 'oracle_deviation', label: 'Oracle Deviation', category: 'risk', icon: <Zap className="w-4 h-4" /> },
    { type: 'depeg_risk', label: 'Depeg Risk', category: 'risk', icon: <BarChart3 className="w-4 h-4" /> },
    
    // Social & Sentiment
    { type: 'mention_velocity', label: 'Mention Velocity', category: 'social', icon: <TrendingUp className="w-4 h-4" /> },
    { type: 'sentiment_inflection', label: 'Sentiment Inflection', category: 'social', icon: <Zap className="w-4 h-4" /> }
  ];

  const operators: Array<{value: SignalOperator, label: string}> = [
    { value: 'gt', label: 'Greater Than' },
    { value: 'lt', label: 'Less Than' },
    { value: 'z_score_gt', label: 'Z-Score Above' },
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'rate_change_gt', label: 'Rate Change >' }
  ];

  const addSignal = useCallback(() => {
    const newSignal: AlertSignal = {
      id: `signal_${Date.now()}`,
      type: 'whale_accumulation',
      source_name: 'blockchain_scanner',
      asset_symbol: 'BTC',
      operator: 'gt',
      value: 1000000,
      weight: 1.0,
      min_confidence: 0.7
    };

    setCurrentAlert(prev => ({
      ...prev,
      signals: [...(prev.signals || []), newSignal]
    }));
  }, []);

  const updateSignal = useCallback((index: number, updates: Partial<AlertSignal>) => {
    setCurrentAlert(prev => ({
      ...prev,
      signals: prev.signals?.map((signal, i) => 
        i === index ? { ...signal, ...updates } : signal
      ) || []
    }));
  }, []);

  const removeSignal = useCallback((index: number) => {
    setCurrentAlert(prev => ({
      ...prev,
      signals: prev.signals?.filter((_, i) => i !== index) || []
    }));
  }, []);

  const handleSave = async () => {
    try {
      if (!currentAlert.name) {
        alert('Please enter an alert name');
        return;
      }

      const newAlert = await createAlert(currentAlert as any);
      if (newAlert && onSave) {
        onSave(newAlert);
      }
    } catch (error) {
      console.error('Failed to save alert:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'microstructure': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'onchain': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'risk': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'social': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Visual Alert Studio</h2>
          <p className="text-muted-foreground">Build sophisticated multi-signal alerts with drag-and-drop simplicity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground">
            Save Alert
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Builder */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Alert Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Alert Name</Label>
                  <Input
                    id="name"
                    value={currentAlert.name}
                    onChange={(e) => setCurrentAlert(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Whale Accumulation Alert"
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={currentAlert.priority} 
                    onValueChange={(value) => setCurrentAlert(prev => ({ ...prev, priority: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={currentAlert.description}
                  onChange={(e) => setCurrentAlert(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of what this alert monitors"
                />
              </div>
            </CardContent>
          </Card>

          {/* Signal Builder */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Signal Configuration</CardTitle>
                <Button onClick={addSignal} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Signal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentAlert.signals?.map((signal, index) => (
                  <Card key={signal.id} className="relative">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Signal Type</Label>
                          <Select
                            value={signal.type}
                            onValueChange={(value) => updateSignal(index, { type: value as SignalType })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {signalTypes.map((type) => (
                                <SelectItem key={type.type} value={type.type}>
                                  <div className="flex items-center gap-2">
                                    {type.icon}
                                    {type.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Badge className={`mt-1 ${getCategoryColor(signalTypes.find(t => t.type === signal.type)?.category || '')}`}>
                            {signalTypes.find(t => t.type === signal.type)?.category}
                          </Badge>
                        </div>

                        <div>
                          <Label>Operator</Label>
                          <Select
                            value={signal.operator}
                            onValueChange={(value) => updateSignal(index, { operator: value as SignalOperator })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {operators.map((op) => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Threshold Value</Label>
                          <Input
                            type="number"
                            value={signal.value}
                            onChange={(e) => updateSignal(index, { value: parseFloat(e.target.value) || 0 })}
                          />
                        </div>

                        <div>
                          <Label>Weight</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={signal.weight}
                            onChange={(e) => updateSignal(index, { weight: parseFloat(e.target.value) || 1 })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <Label>Asset Symbol</Label>
                          <Input
                            value={signal.asset_symbol}
                            onChange={(e) => updateSignal(index, { asset_symbol: e.target.value })}
                            placeholder="BTC, ETH, etc."
                          />
                        </div>
                        <div>
                          <Label>Window (minutes)</Label>
                          <Input
                            type="number"
                            value={60}
                            onChange={(e) => {/* Handle window change */}}
                            placeholder="60"
                          />
                        </div>
                        <div>
                          <Label>Min Confidence</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={signal.min_confidence}
                            onChange={(e) => updateSignal(index, { min_confidence: parseFloat(e.target.value) || 0.7 })}
                          />
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSignal(index)}
                        className="absolute top-2 right-2 text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                {(!currentAlert.signals || currentAlert.signals.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No signals configured yet.</p>
                    <p className="text-sm">Click "Add Signal" to start building your alert.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sequence & Timing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5" />
                Sequence & Timing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Cooldown (minutes)</Label>
                  <Input
                    type="number"
                    value={currentAlert.cooldown_minutes}
                    onChange={(e) => setCurrentAlert(prev => ({ 
                      ...prev, 
                      cooldown_minutes: parseInt(e.target.value) || 20 
                    }))}
                  />
                </div>
                <div>
                  <Label>Confidence Threshold</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={currentAlert.confidence_threshold}
                    onChange={(e) => setCurrentAlert(prev => ({ 
                      ...prev, 
                      confidence_threshold: parseFloat(e.target.value) || 0.7 
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alert Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Badge variant="outline" className="mb-2">
                  {currentAlert.priority?.toUpperCase()} Priority
                </Badge>
                <h3 className="font-semibold">{currentAlert.name || 'Unnamed Alert'}</h3>
                <p className="text-sm text-muted-foreground">
                  {currentAlert.description || 'No description provided'}
                </p>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Signals ({currentAlert.signals?.length || 0})</h4>
                <div className="space-y-1">
                  {currentAlert.signals?.map((signal, index) => (
                    <div key={signal.id} className="text-xs flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {signalTypes.find(t => t.type === signal.type)?.label || signal.type}
                      </Badge>
                      <ArrowRight className="w-3 h-3" />
                      <span>{signal.operator} {signal.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Configuration</h4>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div>Cooldown: {currentAlert.cooldown_minutes}m</div>
                  <div>Confidence: {((currentAlert.confidence_threshold || 0.7) * 100).toFixed(0)}%</div>
                  <div>Channels: {currentAlert.routing?.channels?.join(', ') || 'in-app'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Whale Accumulation Template
                    setCurrentAlert({
                      name: 'Whale Accumulation Alert',
                      description: 'Detects large accumulation by smart money',
                      priority: 'high',
                      signals: [{
                        id: 'whale_signal',
                        type: 'whale_accumulation',
                        source_name: 'blockchain_scanner',
                        asset_symbol: 'BTC',
                        operator: 'gt',
                        value: 1000000,
                        weight: 1.0,
                        min_confidence: 0.8
                      }],
                      confidence_threshold: 0.75,
                      cooldown_minutes: 30,
                      routing: { tier: 'important', channels: ['in_app', 'push'] }
                    });
                  }}
                  className="w-full justify-start"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Whale Alert
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Depeg Risk Template
                    setCurrentAlert({
                      name: 'Depeg Risk Alert',
                      description: 'Early warning for stablecoin depegging',
                      priority: 'critical',
                      signals: [{
                        id: 'depeg_signal',
                        type: 'depeg_risk',
                        source_name: 'price_oracle',
                        asset_symbol: 'USDC',
                        operator: 'gt',
                        value: 0.005,
                        weight: 1.0,
                        min_confidence: 0.9
                      }],
                      confidence_threshold: 0.85,
                      cooldown_minutes: 10,
                      routing: { tier: 'critical', channels: ['in_app', 'push', 'email'] }
                    });
                  }}
                  className="w-full justify-start"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Depeg Risk
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
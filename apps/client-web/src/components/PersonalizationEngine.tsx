import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, TrendingUp, Target, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { useAdvancedAlerts } from '@/hooks/useAdvancedAlerts';
import { supabase } from '@/integrations/supabase/client';
import type { NotificationPreferences, SignalType } from '@/types/advancedAlerts';

interface PersonalizationEngineProps {
  userId: string;
  onPreferencesUpdate?: (preferences: Partial<NotificationPreferences>) => void;
}

export function PersonalizationEngine({ userId, onPreferencesUpdate }: PersonalizationEngineProps) {
  const { triggers, alerts } = useAdvancedAlerts();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null);
  const [adaptiveSettings, setAdaptiveSettings] = useState<AdaptiveSettings>({
    confidenceAdjustment: 0,
    signalWeights: {} as Record<SignalType, number>,
    personalizedThresholds: {},
    learningRate: 0.1
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserPreferences();
    calculateLearningStats();
  }, [userId, triggers]);

  const fetchUserPreferences = async () => {
    try {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data) {
        setPreferences(data as NotificationPreferences);
        setAdaptiveSettings(prev => ({
          ...prev,
          learningRate: data.learning_rate || 0.1
        }));
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const calculateLearningStats = async () => {
    if (!triggers.length) return;

    // Calculate user engagement metrics
    const totalTriggers = triggers.length;
    const viewedTriggers = triggers.filter(t => t.viewed_at).length;
    const actionTaken = triggers.filter(t => t.action_taken && t.action_taken !== 'dismissed').length;
    const positiveFeeback = triggers.filter(t => 
      t.user_feedback?.useful === true
    ).length;

    // Calculate signal performance
    const signalPerformance: Partial<Record<SignalType, number>> = {};
    const signalCounts: Record<SignalType, number> = {} as any;

    alerts.forEach(alert => {
      alert.signals.forEach(signal => {
        if (!signalPerformance[signal.type]) {
          signalPerformance[signal.type] = 0;
          signalCounts[signal.type] = 0;
        }
        
        const alertTriggers = triggers.filter(t => t.alert_id === alert.id);
        const positiveRate = alertTriggers.filter(t => t.user_feedback?.useful).length / 
                            Math.max(1, alertTriggers.length);
        
        signalPerformance[signal.type] += positiveRate;
        signalCounts[signal.type]++;
      });
    });

    // Normalize signal performance
    Object.keys(signalPerformance).forEach(signalType => {
      const type = signalType as SignalType;
      signalPerformance[type] = signalPerformance[type] / Math.max(1, signalCounts[type]);
    });

    setLearningStats({
      engagementRate: totalTriggers > 0 ? viewedTriggers / totalTriggers : 0,
      actionRate: totalTriggers > 0 ? actionTaken / totalTriggers : 0,
      satisfactionRate: totalTriggers > 0 ? positiveFeeback / totalTriggers : 0,
      totalInteractions: totalTriggers,
      signalPerformance,
      adaptationScore: calculateAdaptationScore(viewedTriggers, actionTaken, positiveFeeback, totalTriggers)
    });
  };

  const calculateAdaptationScore = (viewed: number, actions: number, positive: number, total: number): number => {
    if (total === 0) return 0;
    
    const engagementWeight = 0.3;
    const actionWeight = 0.4;
    const satisfactionWeight = 0.3;
    
    const engagementScore = viewed / total;
    const actionScore = actions / total;
    const satisfactionScore = positive / total;
    
    return (engagementScore * engagementWeight + 
            actionScore * actionWeight + 
            satisfactionScore * satisfactionWeight) * 100;
  };

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return;

    setLoading(true);
    try {
      const updatedPreferences = { 
        ...preferences, 
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('notification_preferences')
        .upsert([updatedPreferences]);

      if (error) throw error;

      setPreferences(updatedPreferences);
      onPreferencesUpdate?.(updates);
    } catch (error) {
      console.error('Error updating preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyAdaptiveAdjustments = async () => {
    if (!learningStats || !preferences) return;

    // Calculate automatic adjustments based on user behavior
    const adjustments: Partial<NotificationPreferences> = {};

    // Adjust daily limits based on engagement
    if (learningStats.engagementRate < 0.3) {
      // Low engagement - reduce alerts
      adjustments.max_daily_alerts = Math.max(10, preferences.max_daily_alerts * 0.8);
    } else if (learningStats.engagementRate > 0.8) {
      // High engagement - can handle more alerts
      adjustments.max_daily_alerts = Math.min(100, preferences.max_daily_alerts * 1.2);
    }

    // Adjust learning rate based on feedback patterns
    if (learningStats.satisfactionRate > 0.7) {
      adjustments.learning_rate = Math.min(0.3, preferences.learning_rate * 1.1);
    } else if (learningStats.satisfactionRate < 0.3) {
      adjustments.learning_rate = Math.max(0.05, preferences.learning_rate * 0.9);
    }

    await updatePreferences(adjustments);
  };

  const resetPersonalization = async () => {
    const defaultSettings = {
      max_daily_alerts: 50,
      learning_rate: 0.1,
      auto_pause_threshold: 10,
      grouping_enabled: true
    };

    await updatePreferences(defaultSettings);
    setAdaptiveSettings({
      confidenceAdjustment: 0,
      signalWeights: {} as Record<SignalType, number>,
      personalizedThresholds: {},
      learningRate: 0.1
    });
  };

  if (!preferences || !learningStats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 animate-pulse" />
            <span>Loading personalization data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Learning Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <span>AI Learning Status</span>
            <Badge variant={learningStats.adaptationScore > 70 ? "default" : "secondary"}>
              {Math.round(learningStats.adaptationScore)}% Adapted
            </Badge>
          </CardTitle>
          <CardDescription>
            Your alert system learns from your interactions to improve relevance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Engagement Rate</span>
                <span className="font-medium">{Math.round(learningStats.engagementRate * 100)}%</span>
              </div>
              <Progress value={learningStats.engagementRate * 100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Action Rate</span>
                <span className="font-medium">{Math.round(learningStats.actionRate * 100)}%</span>
              </div>
              <Progress value={learningStats.actionRate * 100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Satisfaction</span>
                <span className="font-medium">{Math.round(learningStats.satisfactionRate * 100)}%</span>
              </div>
              <Progress value={learningStats.satisfactionRate * 100} className="h-2" />
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-muted-foreground">
              Based on {learningStats.totalInteractions} interactions
            </div>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={applyAdaptiveAdjustments}
                disabled={loading}
              >
                <Target className="w-4 h-4 mr-2" />
                Auto-Optimize
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetPersonalization}
                disabled={loading}
              >
                Reset Learning
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personalization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Adaptive Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="limits" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="limits">Alert Limits</TabsTrigger>
              <TabsTrigger value="learning">Learning</TabsTrigger>
              <TabsTrigger value="signals">Signal Tuning</TabsTrigger>
            </TabsList>
            
            <TabsContent value="limits" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Daily Alert Limit</Label>
                  <Slider
                    value={[preferences.max_daily_alerts]}
                    onValueChange={([value]) => 
                      updatePreferences({ max_daily_alerts: value })
                    }
                    max={200}
                    min={5}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>5 alerts</span>
                    <span className="font-medium">{preferences.max_daily_alerts} alerts</span>
                    <span>200 alerts</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Auto-Pause Threshold</Label>
                  <Slider
                    value={[preferences.auto_pause_threshold]}
                    onValueChange={([value]) => 
                      updatePreferences({ auto_pause_threshold: value })
                    }
                    max={50}
                    min={3}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-sm text-muted-foreground">
                    Pause alerts after {preferences.auto_pause_threshold} consecutive dismissals
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="grouping">Group Similar Alerts</Label>
                  <Switch
                    id="grouping"
                    checked={preferences.grouping_enabled}
                    onCheckedChange={(checked) => 
                      updatePreferences({ grouping_enabled: checked })
                    }
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="learning" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Learning Rate</Label>
                  <Slider
                    value={[preferences.learning_rate * 100]}
                    onValueChange={([value]) => 
                      updatePreferences({ learning_rate: value / 100 })
                    }
                    max={50}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-sm text-muted-foreground">
                    How quickly the system adapts to your feedback ({Math.round(preferences.learning_rate * 100)}%)
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Adaptation Progress</h4>
                  <div className="space-y-2">
                    {Object.entries(learningStats.signalPerformance).slice(0, 5).map(([signal, performance]) => (
                      <div key={signal} className="flex justify-between items-center">
                        <span className="text-sm capitalize">
                          {signal.replace('_', ' ')}
                        </span>
                        <div className="flex items-center space-x-2">
                          <Progress value={performance * 100} className="w-16 h-2" />
                          <span className="text-xs w-8">
                            {Math.round(performance * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="signals" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(learningStats.signalPerformance).map(([signal, performance]) => (
                    <div key={signal} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium capitalize">
                          {signal.replace('_', ' ')}
                        </span>
                        {performance > 0.7 ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : performance < 0.3 ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-orange-500" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <Progress value={performance * 100} className="h-1" />
                        <div className="text-xs text-muted-foreground">
                          {performance > 0.7 ? 'Performing well' : 
                           performance < 0.3 ? 'Needs improvement' : 'Average performance'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// ====== INTERFACES ======

interface LearningStats {
  engagementRate: number;
  actionRate: number;
  satisfactionRate: number;
  totalInteractions: number;
  signalPerformance: Partial<Record<SignalType, number>>;
  adaptationScore: number;
}

interface AdaptiveSettings {
  confidenceAdjustment: number;
  signalWeights: Record<SignalType, number>;
  personalizedThresholds: Record<string, number>;
  learningRate: number;
}
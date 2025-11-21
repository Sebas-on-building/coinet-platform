import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AdvancedAlert, AlertTrigger, SignalSource, AlertTemplate, MarketContext, ContextPack, SignalType } from '@/types/advancedAlerts';
import { 
  dbAlertToAdvancedAlert, 
  advancedAlertToDbInsert, 
  advancedAlertToDbUpdate,
  dbTriggerToAlertTrigger,
  dbSignalSourceToSignalSource,
  dbTemplateToAlertTemplate
} from '@/lib/typeAdapters';

export function useAdvancedAlerts() {
  const [alerts, setAlerts] = useState<AdvancedAlert[]>([]);
  const [triggers, setTriggers] = useState<AlertTrigger[]>([]);
  const [signalSources, setSignalSources] = useState<SignalSource[]>([]);
  const [templates, setTemplates] = useState<AlertTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ====== ALERT MANAGEMENT ======

  const fetchAlerts = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (!data.user || error) {
      setError('User not authenticated');
      return;
    }

    const { data: alertsData, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', data.user.id);

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError);
      return;
    }

    const convertedAlerts = (alertsData || []).map(dbAlertToAdvancedAlert);
    setAlerts(convertedAlerts);
  };

  const createAlert = async (alertData: Omit<AdvancedAlert, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'trigger_count' | 'success_rate' | 'false_positive_count'>) => {
    const { data, error } = await supabase.auth.getUser();
    if (!data.user || error) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const fullAlertData = {
        ...alertData,
        user_id: data.user.id,
        trigger_count: 0,
        success_rate: 0.0,
        false_positive_count: 0
      };

      const dbData = advancedAlertToDbInsert(fullAlertData);

      const { data: insertData, error: insertError } = await supabase
        .from('alerts')
        .insert([dbData])
        .select()
        .single();

      if (insertError) throw insertError;

      const newAlert = dbAlertToAdvancedAlert(insertData);
      setAlerts(prev => [...prev, newAlert]);
      return newAlert;
    } catch (err) {
      console.error('Error creating alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to create alert');
    } finally {
      setLoading(false);
    }
  };

  const updateAlert = async (id: string, updates: Partial<AdvancedAlert>) => {
    setLoading(true);
    try {
      const dbUpdates = advancedAlertToDbUpdate(updates);
      
      const { data, error } = await supabase
        .from('alerts')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedAlert = dbAlertToAdvancedAlert(data);
      setAlerts(prev => prev.map(alert => 
        alert.id === id ? updatedAlert : alert
      ));
      return updatedAlert;
    } catch (err) {
      console.error('Error updating alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to update alert');
    } finally {
      setLoading(false);
    }
  };

  const deleteAlert = async (id: string) => {
    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting alert:', error);
      return;
    }

    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const pauseAlert = async (id: string) => {
    const { error } = await supabase
      .from('alerts')
      .update({ status: 'paused' })
      .eq('id', id);

    if (error) {
      console.error('Error pausing alert:', error);
      return;
    }

    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, status: 'paused' as const } : alert
    ));
  };

  const resumeAlert = async (id: string) => {
    const { error } = await supabase
      .from('alerts')
      .update({ status: 'active' })
      .eq('id', id);

    if (error) {
      console.error('Error resuming alert:', error);
      return;
    }

    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, status: 'active' as const } : alert
    ));
  };

  // ====== SIGNAL PROCESSING ======

  const fetchSignalSources = async () => {
    const { data, error } = await supabase
      .from('signal_sources')
      .select('*');

    if (error) {
      console.error('Error fetching signal sources:', error);
      return;
    }

    const convertedSources = (data || []).map(dbSignalSourceToSignalSource);
    setSignalSources(convertedSources);
  };

  const evaluateSignals = async (marketData: Record<string, any>) => {
    try {
      const activeAlerts = alerts.filter(alert => alert.status === 'active');
      
      for (const alert of activeAlerts) {
        const signalResults = await evaluateAlertSignals(alert, marketData);
        
        if (signalResults.triggered) {
          const triggerData = {
            alert_id: alert.id,
            user_id: alert.user_id,
            confidence_score: 0.85,
            signal_values: signalResults.values as any,
            market_context: marketData as any,
            context_pack: generateContextPack(alert, marketData) as any,
            action_taken: null,
            viewed_at: null,
            user_feedback: null,
            price_change_1h: null,
            price_change_24h: null,
            accuracy_score: null
          };

          const { data, error } = await supabase
            .from('alert_triggers')
            .insert([triggerData])
            .select()
            .single();

          if (!error && data) {
            const newTrigger = dbTriggerToAlertTrigger(data);
            setTriggers(prev => [...prev, newTrigger]);
          }
        }
      }
    } catch (err) {
      console.error('Error evaluating signals:', err);
    }
  };

  const evaluateAlertSignals = async (alert: AdvancedAlert, marketData: Record<string, any>) => {
    // Simplified evaluation logic
    let totalScore = 0;
    let totalWeight = 0;
    const values: Record<string, number> = {};

    for (const signal of alert.signals) {
      const signalSource = signalSources.find(
        s => s.source_name === signal.source_name && 
             s.asset_symbol === signal.asset_symbol
      );

      if (!signalSource || (signalSource.confidence || 0) < (signal.min_confidence || 0)) continue;

      let signalValue = signalSource.current_value || 0;
      let triggered = false;

      switch (signal.operator) {
        case 'gt':
          triggered = signalValue > signal.value;
          break;
        case 'lt':
          triggered = signalValue < signal.value;
          break;
        case 'z_score_gt':
          triggered = (signalSource.z_score || 0) > signal.value;
          signalValue = signalSource.z_score || 0;
          break;
        case 'crosses_above':
          triggered = (signalSource.previous_value || 0) <= signal.value && signalValue > signal.value;
          break;
        case 'rate_change_gt':
          triggered = Math.abs(signalSource.change_rate || 0) > signal.value;
          signalValue = signalSource.change_rate || 0;
          break;
      }

      values[signal.id] = signalValue;

      if (triggered) {
        totalScore += signal.weight * (signalSource.confidence || 0.5);
      }
      totalWeight += signal.weight;
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
      triggered: finalScore >= (alert.confidence_threshold || 0.7),
      confidence: finalScore,
      values,
      context: marketData
    };
  };

  const generateContextPack = (alert: AdvancedAlert, marketData: Record<string, any>): ContextPack => {
    return {
      summary: `Alert triggered for ${alert.name}`,
      key_metrics: {
        price: marketData.price || 0,
        volume: marketData.volume || 0,
        volatility: marketData.volatility || 0
      },
      whale_activity: [],
      recent_news: [],
      technical_levels: [],
      risk_factors: [],
      opportunity_score: 0.7,
      edge_decay_minutes: 60
    };
  };

  // ====== TEMPLATES ======

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('alert_templates')
      .select('*')
      .eq('is_public', true);

    if (error) {
      console.error('Error fetching templates:', error);
      return;
    }

    const convertedTemplates = (data || []).map(dbTemplateToAlertTemplate);
    setTemplates(convertedTemplates);
  };

  const createFromTemplate = async (templateId: string, customizations?: Partial<AdvancedAlert>) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      setError('Template not found');
      return;
    }

    const alertData = {
      ...template.template_config,
      ...customizations,
      name: customizations?.name || `${template.name} - ${new Date().toLocaleDateString()}`,
    };

    return createAlert(alertData);
  };

  // ====== ANALYTICS ======

  const getAnalytics = async (period: { start: string; end: string }) => {
    try {
      const { data: triggerData, error } = await supabase
        .from('alert_triggers')
        .select('*')
        .gte('triggered_at', period.start)
        .lte('triggered_at', period.end);

      if (error) throw error;

      const totalAlerts = alerts.length;
      const triggeredAlerts = triggerData?.length || 0;
      const successfulAlerts = triggerData?.filter(t => 
        (t.user_feedback as any)?.useful || false
      ).length || 0;

      const signalCoverage: Record<SignalType, number> = {
        'spread_shock': 0, 'depth_imbalance': 0, 'funding_flip': 0, 'oi_spike': 0, 
        'liquidation_cluster': 0, 'cross_venue_divergence': 0, 'basis_dislocation': 0,
        'whale_accumulation': 0, 'smart_money_flow': 0, 'exchange_inflow': 0, 
        'exchange_outflow': 0, 'liquidity_pull': 0, 'bridge_flow': 0,
        'unlock_proximity': 0, 'emissions_change': 0, 'governance_activity': 0,
        'oracle_deviation': 0, 'depeg_risk': 0, 'exploit_risk': 0,
        'mention_velocity': 0, 'sentiment_inflection': 0, 'dev_activity': 0,
        'news_catalyst': 0, 'rumor_clustering': 0
      };

      return {
        user_id: '',
        period,
        total_alerts: totalAlerts,
        triggered_alerts: triggeredAlerts,
        successful_alerts: successfulAlerts,
        false_positives: triggeredAlerts - successfulAlerts,
        average_confidence: 0.75,
        average_response_time_minutes: 15,
        signal_accuracy: signalCoverage,
        best_performing_signals: [],
        worst_performing_signals: [],
        preferred_channels: ['in_app' as const, 'push' as const],
        peak_alert_hours: [9, 10, 14, 15],
        dismissal_patterns: {},
        suggested_improvements: ['Increase confidence threshold', 'Add whale activity signals'],
        recommended_templates: [],
        optimization_score: 0.8
      };
    } catch (err) {
      console.error('Error getting analytics:', err);
      throw err;
    }
  };

  // ====== EFFECTS ======

  useEffect(() => {
    fetchAlerts();
    fetchSignalSources();
    fetchTemplates();
  }, []);

  // ====== REAL-TIME SUBSCRIPTIONS ======

  useEffect(() => {
    const alertsChannel = supabase
      .channel('alerts-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'alerts' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAlert = dbAlertToAdvancedAlert(payload.new);
            setAlerts(prev => [newAlert, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedAlert = dbAlertToAdvancedAlert(payload.new);
            setAlerts(prev => prev.map(alert => 
              alert.id === updatedAlert.id ? updatedAlert : alert
            ));
          } else if (payload.eventType === 'DELETE') {
            setAlerts(prev => prev.filter(alert => alert.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    const triggersChannel = supabase
      .channel('triggers-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alert_triggers' },
        (payload) => {
          const newTrigger = dbTriggerToAlertTrigger(payload.new);
          setTriggers(prev => [newTrigger, ...prev]);
        }
      )
      .subscribe();

    return () => {
      alertsChannel.unsubscribe();
      triggersChannel.unsubscribe();
    };
  }, []);

  return {
    // State
    alerts,
    triggers,
    signalSources,
    templates,
    loading,
    error,

    // Alert management
    fetchAlerts,
    createAlert,
    updateAlert,
    deleteAlert,
    pauseAlert,
    resumeAlert,

    // Signal processing
    fetchSignalSources,
    evaluateSignals,

    // Templates
    fetchTemplates,
    createFromTemplate,

    // Analytics
    getAnalytics
  };
}
import type { Json } from '@/integrations/supabase/types';
import type { 
  AdvancedAlert, 
  AlertSignal, 
  AlertFilters, 
  AlertRouting, 
  MarketContext, 
  ContextPack,
  AlertTrigger,
  SignalSource,
  AlertTemplate
} from '@/types/advancedAlerts';

// Type guards
export function isAlertSignal(obj: any): obj is AlertSignal {
  return obj && typeof obj === 'object' && 'id' in obj && 'type' in obj;
}

export function isAlertFilters(obj: any): obj is AlertFilters {
  return obj && typeof obj === 'object';
}

export function isAlertRouting(obj: any): obj is AlertRouting {
  return obj && typeof obj === 'object' && 'tier' in obj && 'channels' in obj;
}

// Safe JSON parsing utilities
export function safeParseJson<T>(json: Json, fallback: T): T {
  if (json === null || json === undefined) return fallback;
  if (typeof json === 'object') return json as T;
  return fallback;
}

export function safeParseJsonArray<T>(json: Json, fallback: T[]): T[] {
  if (Array.isArray(json)) return json as T[];
  return fallback;
}

// Database to TypeScript conversions
export function dbAlertToAdvancedAlert(dbAlert: any): AdvancedAlert {
  return {
    id: dbAlert.id,
    user_id: dbAlert.user_id,
    name: dbAlert.name,
    description: dbAlert.description || '',
    status: dbAlert.status,
    priority: dbAlert.priority,
    version: dbAlert.version,
    signals: safeParseJsonArray<AlertSignal>(dbAlert.signals, []),
    sequence_config: safeParseJson(dbAlert.sequence_config, undefined),
    filters: safeParseJson<AlertFilters>(dbAlert.filters, {}),
    routing: safeParseJson<AlertRouting>(dbAlert.routing, { tier: 'important', channels: ['in_app'] }),
    cooldown_minutes: dbAlert.cooldown_minutes,
    ai_context: safeParseJson(dbAlert.ai_context, undefined),
    confidence_threshold: dbAlert.confidence_threshold,
    learning_enabled: dbAlert.learning_enabled,
    adaptive_baselines: dbAlert.adaptive_baselines,
    trigger_count: dbAlert.trigger_count,
    success_rate: dbAlert.success_rate,
    false_positive_count: dbAlert.false_positive_count,
    user_feedback_score: dbAlert.user_feedback_score,
    created_at: dbAlert.created_at,
    updated_at: dbAlert.updated_at,
    last_triggered_at: dbAlert.last_triggered_at,
    expires_at: dbAlert.expires_at,
    tags: dbAlert.tags || []
  };
}

export function advancedAlertToDbInsert(alert: Omit<AdvancedAlert, 'id' | 'created_at' | 'updated_at'>) {
  return {
    user_id: alert.user_id,
    name: alert.name,
    description: alert.description,
    status: alert.status,
    priority: alert.priority,
    version: alert.version,
    signals: JSON.parse(JSON.stringify(alert.signals)) as Json,
    sequence_config: alert.sequence_config ? JSON.parse(JSON.stringify(alert.sequence_config)) as Json : null,
    filters: JSON.parse(JSON.stringify(alert.filters)) as Json,
    routing: JSON.parse(JSON.stringify(alert.routing)) as Json,
    cooldown_minutes: alert.cooldown_minutes,
    ai_context: alert.ai_context as Json,
    confidence_threshold: alert.confidence_threshold,
    learning_enabled: alert.learning_enabled,
    adaptive_baselines: alert.adaptive_baselines,
    trigger_count: alert.trigger_count,
    success_rate: alert.success_rate,
    false_positive_count: alert.false_positive_count,
    user_feedback_score: alert.user_feedback_score,
    last_triggered_at: alert.last_triggered_at,
    expires_at: alert.expires_at,
    tags: alert.tags
  };
}

export function advancedAlertToDbUpdate(alert: Partial<AdvancedAlert>) {
  const update: any = {};
  
  Object.keys(alert).forEach(key => {
    const value = (alert as any)[key];
    if (value !== undefined) {
      if (key === 'signals' || key === 'sequence_config' || key === 'filters' || key === 'routing' || key === 'ai_context') {
        update[key] = value as Json;
      } else {
        update[key] = value;
      }
    }
  });
  
  return update;
}

export function dbTriggerToAlertTrigger(dbTrigger: any): AlertTrigger {
  return {
    id: dbTrigger.id,
    alert_id: dbTrigger.alert_id,
    user_id: dbTrigger.user_id,
    triggered_at: dbTrigger.triggered_at,
    confidence_score: dbTrigger.confidence_score,
    signal_values: safeParseJson(dbTrigger.signal_values, {}),
    market_context: safeParseJson<MarketContext>(dbTrigger.market_context, {} as MarketContext),
    context_pack: safeParseJson<ContextPack>(dbTrigger.context_pack, {} as ContextPack),
    action_taken: dbTrigger.action_taken,
    viewed_at: dbTrigger.viewed_at,
    user_feedback: safeParseJson(dbTrigger.user_feedback, undefined),
    price_change_1h: dbTrigger.price_change_1h,
    price_change_24h: dbTrigger.price_change_24h,
    accuracy_score: dbTrigger.accuracy_score
  };
}

export function dbSignalSourceToSignalSource(dbSource: any): SignalSource {
  return {
    id: dbSource.id,
    source_type: dbSource.source_type,
    source_name: dbSource.source_name,
    asset_symbol: dbSource.asset_symbol,
    current_value: dbSource.current_value,
    previous_value: dbSource.previous_value,
    change_rate: dbSource.change_rate,
    z_score: dbSource.z_score,
    last_updated: dbSource.last_updated,
    confidence: dbSource.confidence,
    data_quality: dbSource.data_quality,
    raw_data: safeParseJson(dbSource.raw_data, {})
  };
}

export function dbTemplateToAlertTemplate(dbTemplate: any): AlertTemplate {
  return {
    id: dbTemplate.id,
    name: dbTemplate.name,
    description: dbTemplate.description,
    category: dbTemplate.category,
    tags: dbTemplate.tags || [],
    template_config: safeParseJson(dbTemplate.template_config, {
      name: dbTemplate.name,
      description: dbTemplate.description || '',
      version: 1,
      status: 'active' as const,
      priority: 'medium' as const,
      signals: [],
      filters: {},
      routing: { tier: 'important' as const, channels: ['in_app' as const] },
      cooldown_minutes: 20,
      confidence_threshold: 0.7,
      learning_enabled: true,
      adaptive_baselines: true,
      tags: []
    }),
    default_filters: safeParseJson<AlertFilters>(dbTemplate.default_filters, {}),
    popularity_score: dbTemplate.popularity_score,
    success_rate: dbTemplate.success_rate,
    usage_count: dbTemplate.usage_count,
    created_by: dbTemplate.created_by,
    is_public: dbTemplate.is_public,
    is_featured: dbTemplate.is_featured,
    created_at: dbTemplate.created_at,
    updated_at: dbTemplate.updated_at
  };
}
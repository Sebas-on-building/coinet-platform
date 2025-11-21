-- Phase 1: Advanced Alert System Database Schema

-- Enhanced alerts table with multi-signal support
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'triggered')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Multi-signal configuration
  signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  sequence_config JSONB,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Routing and delivery
  routing JSONB NOT NULL DEFAULT '{"tier": "medium", "channels": ["in_app"]}'::jsonb,
  cooldown_minutes INTEGER DEFAULT 20,
  
  -- AI and learning features
  ai_context JSONB,
  confidence_threshold REAL DEFAULT 0.7,
  learning_enabled BOOLEAN DEFAULT true,
  adaptive_baselines BOOLEAN DEFAULT true,
  
  -- Analytics and feedback
  trigger_count INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0.0,
  false_positive_count INTEGER DEFAULT 0,
  user_feedback_score REAL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT '{}'::text[]
);

-- Alert triggers history with rich context
CREATE TABLE public.alert_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Trigger details
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_score REAL NOT NULL,
  signal_values JSONB NOT NULL,
  market_context JSONB NOT NULL,
  
  -- User interaction
  viewed_at TIMESTAMP WITH TIME ZONE,
  action_taken TEXT, -- 'viewed', 'dismissed', 'acted', 'modified_alert'
  user_feedback JSONB, -- {useful: boolean, rating: 1-5, reason: string}
  
  -- Outcome tracking
  price_change_1h REAL,
  price_change_24h REAL,
  accuracy_score REAL,
  
  -- Context pack data
  context_pack JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Signal sources and their current states
CREATE TABLE public.signal_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL, -- 'market', 'onchain', 'social', 'tokenomics', 'risk'
  source_name TEXT NOT NULL,
  asset_symbol TEXT,
  
  -- Current values
  current_value REAL,
  previous_value REAL,
  change_rate REAL,
  z_score REAL,
  
  -- Metadata
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence REAL DEFAULT 1.0,
  data_quality TEXT DEFAULT 'good' CHECK (data_quality IN ('excellent', 'good', 'fair', 'poor')),
  
  -- Raw data
  raw_data JSONB,
  
  UNIQUE(source_type, source_name, asset_symbol)
);

-- Market context snapshots
CREATE TABLE public.market_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_symbol TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Price and volume data
  price REAL NOT NULL,
  volume_24h REAL,
  market_cap REAL,
  
  -- Market microstructure
  bid_ask_spread REAL,
  depth_imbalance REAL,
  funding_rate REAL,
  open_interest REAL,
  
  -- Sentiment and social
  social_sentiment REAL,
  fear_greed_index INTEGER,
  news_sentiment REAL,
  
  -- On-chain metrics
  whale_activity_score REAL,
  exchange_inflows REAL,
  exchange_outflows REAL,
  
  -- Risk metrics
  volatility REAL,
  liquidation_risk REAL,
  correlation_breaks INTEGER DEFAULT 0
);

-- Smart money and whale tracking
CREATE TABLE public.whale_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT NOT NULL UNIQUE,
  label TEXT,
  confidence_score REAL NOT NULL DEFAULT 0.5,
  
  -- Classification
  category TEXT NOT NULL, -- 'whale', 'smart_money', 'institution', 'team', 'exchange'
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  
  -- Activity tracking
  last_activity TIMESTAMP WITH TIME ZONE,
  total_volume REAL DEFAULT 0,
  success_rate REAL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Additional data
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Whale activity tracking
CREATE TABLE public.whale_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whale_address_id UUID NOT NULL REFERENCES public.whale_addresses(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_hash TEXT NOT NULL,
  asset_symbol TEXT NOT NULL,
  action TEXT NOT NULL, -- 'buy', 'sell', 'transfer', 'stake', 'unstake'
  amount REAL NOT NULL,
  price REAL,
  
  -- Context
  exchange TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  block_number BIGINT,
  
  -- Analysis
  impact_score REAL, -- estimated market impact 0-1
  confidence REAL DEFAULT 1.0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Alert templates and presets
CREATE TABLE public.alert_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'intermediate' CHECK (category IN ('beginner', 'intermediate', 'advanced', 'ai_powered')),
  
  -- Template configuration
  template_config JSONB NOT NULL,
  default_filters JSONB DEFAULT '{}'::jsonb,
  
  -- Popularity and performance
  popularity_score REAL DEFAULT 0,
  success_rate REAL,
  usage_count INTEGER DEFAULT 0,
  
  -- Creator and permissions
  created_by UUID,
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tags TEXT[] DEFAULT '{}'::text[]
);

-- User notification preferences
CREATE TABLE public.notification_preferences (
  user_id UUID NOT NULL PRIMARY KEY,
  
  -- Channel preferences
  channels JSONB NOT NULL DEFAULT '{"in_app": true, "email": false, "push": false, "sms": false}'::jsonb,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'UTC',
  
  -- Alert management
  priority_override BOOLEAN DEFAULT true, -- Allow critical alerts during quiet hours
  max_daily_alerts INTEGER DEFAULT 50,
  grouping_enabled BOOLEAN DEFAULT true,
  
  -- Sound settings
  sound_enabled BOOLEAN DEFAULT true,
  sound_volume REAL DEFAULT 0.7,
  custom_sounds JSONB DEFAULT '{}'::jsonb,
  
  -- Advanced settings
  auto_pause_threshold INTEGER DEFAULT 10, -- Auto-pause alerts with high false positive rate
  learning_rate REAL DEFAULT 0.1,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whale_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whale_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alerts
CREATE POLICY "Users can manage their own alerts" ON public.alerts
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own alert triggers" ON public.alert_triggers
  USING (auth.uid() = user_id);

-- Signal sources are readable by all authenticated users (market data)
CREATE POLICY "Authenticated users can read signal sources" ON public.signal_sources
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage signal sources" ON public.signal_sources
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Market context is readable by all authenticated users
CREATE POLICY "Authenticated users can read market context" ON public.market_context
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage market context" ON public.market_context
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Whale data readable by authenticated users
CREATE POLICY "Authenticated users can read whale addresses" ON public.whale_addresses
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read whale activities" ON public.whale_activities
  FOR SELECT USING (auth.role() = 'authenticated');

-- Alert templates
CREATE POLICY "Users can read public alert templates" ON public.alert_templates
  FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can manage their own alert templates" ON public.alert_templates
  USING (auth.uid() = created_by);

-- Notification preferences
CREATE POLICY "Users can manage their own notification preferences" ON public.notification_preferences
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX idx_alerts_status ON public.alerts(status) WHERE status = 'active';
CREATE INDEX idx_alert_triggers_alert_id ON public.alert_triggers(alert_id);
CREATE INDEX idx_alert_triggers_triggered_at ON public.alert_triggers(triggered_at DESC);
CREATE INDEX idx_signal_sources_type_name ON public.signal_sources(source_type, source_name);
CREATE INDEX idx_signal_sources_asset ON public.signal_sources(asset_symbol);
CREATE INDEX idx_signal_sources_updated ON public.signal_sources(last_updated DESC);
CREATE INDEX idx_market_context_asset_time ON public.market_context(asset_symbol, timestamp DESC);
CREATE INDEX idx_whale_activities_timestamp ON public.whale_activities(timestamp DESC);
CREATE INDEX idx_whale_activities_asset ON public.whale_activities(asset_symbol);

-- Create triggers for updated_at
CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whale_addresses_updated_at
  BEFORE UPDATE ON public.whale_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alert_templates_updated_at
  BEFORE UPDATE ON public.alert_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
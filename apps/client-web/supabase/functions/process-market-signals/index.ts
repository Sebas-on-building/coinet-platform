import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketSignalUpdate {
  source_type: 'market' | 'onchain' | 'social' | 'tokenomics' | 'risk';
  source_name: string;
  asset_symbol?: string;
  value: number;
  raw_data?: Record<string, any>;
}

interface WhaleActivityUpdate {
  address: string;
  transaction_hash: string;
  asset_symbol: string;
  action: 'buy' | 'sell' | 'transfer' | 'stake' | 'unstake';
  amount: number;
  price?: number;
  exchange?: string;
  block_number?: number;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();

    switch (type) {
      case 'market_signal':
        return await processMarketSignal(data as MarketSignalUpdate);
      
      case 'whale_activity':
        return await processWhaleActivity(data as WhaleActivityUpdate);
      
      case 'batch_signals':
        return await processBatchSignals(data as MarketSignalUpdate[]);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown signal type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Error processing signal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

async function processMarketSignal(signalData: MarketSignalUpdate): Promise<Response> {
  console.log('Processing market signal:', signalData);

  // Get existing signal source for comparison
  const { data: existing } = await supabase
    .from('signal_sources')
    .select('*')
    .eq('source_type', signalData.source_type)
    .eq('source_name', signalData.source_name)
    .eq('asset_symbol', signalData.asset_symbol || null)
    .single();

  // Calculate metrics
  const previousValue = existing?.current_value || signalData.value;
  const changeRate = previousValue !== 0 ? (signalData.value - previousValue) / previousValue : 0;
  const zScore = calculateZScore(existing, signalData.value);
  const confidence = calculateConfidence(signalData.source_type, signalData.raw_data);
  const dataQuality = assessDataQuality(signalData.raw_data);

  // Upsert signal source
  const { data: updatedSignal, error } = await supabase
    .from('signal_sources')
    .upsert({
      source_type: signalData.source_type,
      source_name: signalData.source_name,
      asset_symbol: signalData.asset_symbol,
      current_value: signalData.value,
      previous_value: previousValue,
      change_rate: changeRate,
      z_score: zScore,
      confidence: confidence,
      data_quality: dataQuality,
      raw_data: signalData.raw_data,
      last_updated: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update signal source: ${error.message}`);
  }

  // Check for alert triggers
  await evaluateAlertsForSignal(updatedSignal);

  return new Response(
    JSON.stringify({ 
      success: true, 
      signal: updatedSignal,
      change_rate: changeRate,
      z_score: zScore
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processWhaleActivity(activityData: WhaleActivityUpdate): Promise<Response> {
  console.log('Processing whale activity:', activityData);

  // Find or create whale address
  let { data: whaleAddress } = await supabase
    .from('whale_addresses')
    .select('*')
    .eq('address', activityData.address)
    .single();

  if (!whaleAddress) {
    // Create new whale address
    const { data: newWhale, error } = await supabase
      .from('whale_addresses')
      .insert({
        address: activityData.address,
        confidence_score: 0.5,
        category: 'whale',
        risk_level: 'medium',
        total_volume: 0,
        success_rate: 0,
        metadata: {}
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create whale address: ${error.message}`);
    }
    whaleAddress = newWhale;
  }

  // Calculate impact score
  const impactScore = await calculateWhaleImpactScore(
    activityData.asset_symbol, 
    activityData.amount, 
    activityData.price
  );

  // Insert whale activity
  const { data: activity, error: activityError } = await supabase
    .from('whale_activities')
    .insert({
      whale_address_id: whaleAddress.id,
      transaction_hash: activityData.transaction_hash,
      asset_symbol: activityData.asset_symbol,
      action: activityData.action,
      amount: activityData.amount,
      price: activityData.price,
      exchange: activityData.exchange,
      block_number: activityData.block_number,
      impact_score: impactScore,
      confidence: whaleAddress.confidence_score,
      metadata: {}
    })
    .select()
    .single();

  if (activityError) {
    throw new Error(`Failed to insert whale activity: ${activityError.message}`);
  }

  // Update whale activity signal
  await supabase
    .from('signal_sources')
    .upsert({
      source_type: 'onchain',
      source_name: `whale_${activityData.action}`,
      asset_symbol: activityData.asset_symbol,
      current_value: activityData.amount,
      previous_value: 0,
      change_rate: 0,
      z_score: 0,
      confidence: whaleAddress.confidence_score,
      data_quality: 'good',
      raw_data: {
        address: activityData.address,
        impact_score: impactScore,
        transaction_hash: activityData.transaction_hash
      },
      last_updated: new Date().toISOString()
    });

  return new Response(
    JSON.stringify({ 
      success: true, 
      activity,
      impact_score: impactScore
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processBatchSignals(signals: MarketSignalUpdate[]): Promise<Response> {
  console.log(`Processing batch of ${signals.length} signals`);

  const results = [];
  for (const signal of signals) {
    try {
      const result = await processMarketSignal(signal);
      const data = await result.json();
      results.push({ success: true, data });
    } catch (error: any) {
      results.push({ success: false, error: error.message });
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      processed: results.length,
      results 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ====== UTILITY FUNCTIONS ======

function calculateZScore(existing: any, currentValue: number): number {
  if (!existing) return 0;

  // Simplified z-score calculation
  const values = [existing.current_value, currentValue, existing.previous_value || currentValue];
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return stdDev > 0 ? (currentValue - mean) / stdDev : 0;
}

function calculateConfidence(sourceType: string, rawData?: Record<string, any>): number {
  const baseConfidence: Record<string, number> = {
    'market': 0.9,
    'onchain': 0.85,
    'social': 0.6,
    'tokenomics': 0.8,
    'risk': 0.75
  };

  let confidence = baseConfidence[sourceType] || 0.5;

  if (rawData?.timestamp) {
    const age = Date.now() - new Date(rawData.timestamp).getTime();
    if (age > 300000) confidence *= 0.8; // Reduce for stale data
  }

  return Math.max(0.1, Math.min(1.0, confidence));
}

function assessDataQuality(rawData?: Record<string, any>): 'excellent' | 'good' | 'fair' | 'poor' {
  if (!rawData) return 'fair';

  let score = 0;
  
  // Freshness
  if (rawData.timestamp) {
    const age = Date.now() - new Date(rawData.timestamp).getTime();
    if (age < 60000) score += 3;
    else if (age < 300000) score += 2;
    else if (age < 900000) score += 1;
  }

  // Completeness
  const expectedFields = ['price', 'volume', 'timestamp'];
  score += expectedFields.filter(field => rawData[field] !== undefined).length;

  if (score >= 6) return 'excellent';
  if (score >= 4) return 'good';  
  if (score >= 2) return 'fair';
  return 'poor';
}

async function calculateWhaleImpactScore(assetSymbol: string, amount: number, price?: number): Promise<number> {
  // Get recent market context for volume comparison
  const { data: context } = await supabase
    .from('market_context')
    .select('volume_24h')
    .eq('asset_symbol', assetSymbol)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (!context?.volume_24h) return 0.5;

  const tradeValue = price ? amount * price : amount;
  const volumeImpact = tradeValue / context.volume_24h;

  return Math.min(1.0, Math.max(0.1, volumeImpact * 10));
}

async function evaluateAlertsForSignal(signal: any): Promise<void> {
  // Get active alerts that might use this signal
  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('status', 'active');

  if (!alerts) return;

  // Filter alerts that reference this signal
  const relevantAlerts = alerts.filter(alert => 
    alert.signals?.some((alertSignal: any) => 
      alertSignal.source_name === signal.source_name &&
      alertSignal.asset_symbol === signal.asset_symbol
    )
  );

  console.log(`Found ${relevantAlerts.length} alerts to evaluate for signal ${signal.source_name}`);

  // In a full implementation, this would evaluate each alert's conditions
  // and trigger notifications for any that meet their criteria
}

serve(handler);
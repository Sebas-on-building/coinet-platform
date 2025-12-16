/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📈 TRADER VIEW                                                            ║
 * ║                                                                               ║
 * ║   Short-term view for trading decisions.                                     ║
 * ║   Focus: OS, NRG, Momentum. Time horizon: 1-4 weeks.                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  TraderView,
  TraderSignal,
  TierLabel,
  ConfidenceLevel,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TRADER VIEW GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface TraderInput {
  qs: number;
  qsTier: TierLabel;
  os: number | null;
  osTier: TierLabel | null;
  osStatus: 'active' | 'gated';
  osGateReason?: string;
  risk: number;
  pos: number;
  posTier: TierLabel;
  confidence: ConfidenceLevel;
  momentum30d?: number;  // Price change percentage
  nrg?: number;          // Narrative-Reality Gap
}

/**
 * Generate trader view from scores
 */
export function generateTraderView(input: TraderInput): TraderView {
  const signal = getSignal(input);
  const gateReason = input.osStatus === 'gated' ? input.osGateReason : undefined;
  const rationale = generateRationale(input, signal);
  
  return {
    signal,
    timeHorizon: '1-4 weeks',
    keyMetrics: ['os', 'nrg', 'momentum'],
    gateReason,
    rationale,
  };
}

/**
 * Determine trading signal
 */
function getSignal(input: TraderInput): TraderSignal {
  const { os, qs, risk, confidence, momentum30d, nrg } = input;
  
  // OS gated = neutral (can't assess opportunity)
  if (os === null) {
    return 'neutral';
  }
  
  // Low confidence = neutral
  if (confidence === 'insufficient' || confidence === 'low') {
    return 'neutral';
  }
  
  // High risk = sell signals
  if (risk >= 70) {
    return 'strong_sell';
  }
  if (risk >= 55) {
    return 'sell';
  }
  
  // Combine OS and QS for signal
  // OS drives the signal direction, QS provides confirmation
  
  if (os >= 80 && qs >= 70) {
    // High opportunity + solid fundamentals
    return 'strong_buy';
  }
  if (os >= 70 && qs >= 60) {
    // Good opportunity + decent fundamentals
    return 'buy';
  }
  if (os >= 60 && qs >= 50) {
    // Moderate opportunity
    return 'buy';
  }
  
  if (os <= 30) {
    // Low opportunity
    return qs >= 70 ? 'neutral' : 'sell';
  }
  if (os <= 40) {
    return 'neutral';
  }
  
  // Neutral zone
  return 'neutral';
}

/**
 * Generate human-readable rationale
 */
function generateRationale(input: TraderInput, signal: TraderSignal): string {
  const { os, osStatus, qs, risk, momentum30d, nrg } = input;
  
  const parts: string[] = [];
  
  // OS assessment
  if (osStatus === 'gated') {
    parts.push('Opportunity gated (insufficient data)');
  } else if (os !== null) {
    if (os >= 80) {
      parts.push(`Strong opportunity (OS: ${os.toFixed(0)})`);
    } else if (os >= 60) {
      parts.push(`Good opportunity (OS: ${os.toFixed(0)})`);
    } else if (os >= 40) {
      parts.push(`Moderate opportunity (OS: ${os.toFixed(0)})`);
    } else {
      parts.push(`Weak opportunity (OS: ${os.toFixed(0)})`);
    }
  }
  
  // Momentum context
  if (momentum30d !== undefined) {
    if (momentum30d > 20) {
      parts.push(`strong momentum (+${momentum30d.toFixed(0)}%)`);
    } else if (momentum30d > 5) {
      parts.push(`positive momentum (+${momentum30d.toFixed(0)}%)`);
    } else if (momentum30d < -20) {
      parts.push(`severe drawdown (${momentum30d.toFixed(0)}%)`);
    } else if (momentum30d < -5) {
      parts.push(`negative momentum (${momentum30d.toFixed(0)}%)`);
    }
  }
  
  // NRG context
  if (nrg !== undefined) {
    if (nrg > 2) {
      parts.push('overhyped narrative');
    } else if (nrg < -2) {
      parts.push('underhyped (potential)');
    }
  }
  
  // Risk warning
  if (risk >= 55) {
    parts.push(`elevated risk (${risk.toFixed(0)})`);
  }
  
  // Signal context
  switch (signal) {
    case 'strong_buy':
      return `${parts.join(', ')}. Strong short-term setup.`;
    case 'buy':
      return `${parts.join(', ')}. Favorable short-term conditions.`;
    case 'neutral':
      return `${parts.join(', ')}. Wait for clearer setup.`;
    case 'sell':
      return `${parts.join(', ')}. Consider reducing position.`;
    case 'strong_sell':
      return `${parts.join(', ')}. Exit or avoid.`;
  }
}

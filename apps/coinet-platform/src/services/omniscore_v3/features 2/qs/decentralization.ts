/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔀 QS FEATURE: Decentralization                                           ║
 * ║                                                                               ║
 * ║   Measures: Validator distribution, governance participation, key control    ║
 * ║   Only computed where measurable; omit rather than estimate                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { FeatureDefinition, FeatureFunction, FeatureResult, FeatureContext } from '../types';
import {
  getDataValue,
  checkRequiredInputs,
  calculateFreshnessHours,
  calculateConfidence,
  createUnavailableResult,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export const DECENTRALIZATION_DEFINITION: FeatureDefinition = {
  id: 'qs_decentralization',
  name: 'Decentralization',
  category: 'qs',
  description: 'Measures network decentralization through validator distribution, governance, and key control',
  segment: 'GOV',
  defaultWeight: 0.15,
  requiredInputs: [], // Only compute if data available
  optionalInputs: [
    'validator_count',
    'nakamoto_coefficient',
    'top_validators_stake_percent',
    'unique_governance_voters',
    'governance_participation_rate',
    'multisig_required',
    'admin_key_holders',
    'node_geographic_distribution',
    'client_diversity_score',
  ],
  updateFrequencyHours: 168, // Weekly
  higherIsBetter: true,
  normalization: {
    method: 'custom',
    min: 0,
    max: 100,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const computeDecentralization: FeatureFunction = (ctx: FeatureContext): FeatureResult => {
  const def = DECENTRALIZATION_DEFINITION;
  const allInputs = [...def.requiredInputs, ...def.optionalInputs];
  const { present, missing } = checkRequiredInputs(ctx, allInputs);
  
  // This feature should NOT estimate - if we don't have data, skip
  if (present.length < 2) {
    return createUnavailableResult(
      def, 
      missing, 
      'Insufficient decentralization data (not estimated)'
    );
  }
  
  const warnings: string[] = [];
  const intermediates: Record<string, number> = {};
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDATOR DISTRIBUTION (0-40 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let validatorScore = 0;
  const validatorCount = getDataValue(ctx, 'validator_count');
  const nakamoto = getDataValue(ctx, 'nakamoto_coefficient');
  const topValidatorsStake = getDataValue(ctx, 'top_validators_stake_percent');
  
  if (validatorCount !== null) {
    // Number of validators (more = better, with diminishing returns)
    if (validatorCount >= 10000) validatorScore = 20;
    else if (validatorCount >= 1000) validatorScore = 16;
    else if (validatorCount >= 100) validatorScore = 12;
    else if (validatorCount >= 50) validatorScore = 8;
    else if (validatorCount >= 20) validatorScore = 4;
    else validatorScore = 2;
    
    intermediates['validator_count_score'] = validatorScore;
  }
  
  if (nakamoto !== null) {
    // Nakamoto coefficient (how many entities to collude for 51%)
    if (nakamoto >= 50) validatorScore += 20;
    else if (nakamoto >= 20) validatorScore += 15;
    else if (nakamoto >= 10) validatorScore += 10;
    else if (nakamoto >= 5) validatorScore += 5;
    else {
      validatorScore += 2;
      warnings.push(`Low Nakamoto coefficient: ${nakamoto}`);
    }
    
    intermediates['nakamoto_score'] = nakamoto >= 50 ? 20 : (nakamoto >= 20 ? 15 : (nakamoto >= 10 ? 10 : 5));
  }
  
  if (topValidatorsStake !== null) {
    // Penalize if top validators control too much
    if (topValidatorsStake > 50) {
      validatorScore -= 10;
      warnings.push(`Top validators control ${topValidatorsStake.toFixed(0)}% of stake`);
    } else if (topValidatorsStake > 33) {
      validatorScore -= 5;
    }
    
    intermediates['stake_concentration_adj'] = topValidatorsStake > 50 ? -10 : (topValidatorsStake > 33 ? -5 : 0);
  }
  
  validatorScore = Math.max(0, Math.min(40, validatorScore));
  
  // ─────────────────────────────────────────────────────────────────────────────
  // GOVERNANCE PARTICIPATION (0-30 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let govScore = 0;
  const uniqueVoters = getDataValue(ctx, 'unique_governance_voters');
  const participationRate = getDataValue(ctx, 'governance_participation_rate');
  
  if (uniqueVoters !== null) {
    // Number of governance participants
    if (uniqueVoters >= 10000) govScore = 15;
    else if (uniqueVoters >= 5000) govScore = 12;
    else if (uniqueVoters >= 1000) govScore = 9;
    else if (uniqueVoters >= 500) govScore = 6;
    else if (uniqueVoters >= 100) govScore = 3;
    else govScore = 1;
    
    intermediates['unique_voters_score'] = govScore;
  }
  
  if (participationRate !== null) {
    // Participation rate in recent votes
    if (participationRate >= 0.3) govScore += 15;
    else if (participationRate >= 0.2) govScore += 12;
    else if (participationRate >= 0.1) govScore += 8;
    else if (participationRate >= 0.05) govScore += 4;
    else govScore += 1;
    
    intermediates['participation_score'] = participationRate >= 0.3 ? 15 : (participationRate >= 0.2 ? 12 : (participationRate >= 0.1 ? 8 : 4));
  }
  
  govScore = Math.min(30, govScore);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // KEY CONTROL (0-20 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let keyScore = 20; // Start optimistic
  const multisigRequired = getDataValue(ctx, 'multisig_required');
  const adminKeyHolders = getDataValue(ctx, 'admin_key_holders');
  
  if (multisigRequired !== null) {
    if (multisigRequired >= 5) keyScore = 20;
    else if (multisigRequired >= 3) keyScore = 15;
    else if (multisigRequired >= 2) keyScore = 10;
    else {
      keyScore = 5;
      warnings.push('Single key holder for admin functions');
    }
    
    intermediates['multisig_score'] = keyScore;
  }
  
  if (adminKeyHolders !== null) {
    // Fewer known key holders is concerning
    if (adminKeyHolders <= 1) {
      keyScore -= 10;
      warnings.push('Admin keys controlled by single entity');
    } else if (adminKeyHolders <= 3) {
      keyScore -= 5;
    }
    
    intermediates['key_holder_adj'] = adminKeyHolders <= 1 ? -10 : (adminKeyHolders <= 3 ? -5 : 0);
  }
  
  keyScore = Math.max(0, Math.min(20, keyScore));
  
  // ─────────────────────────────────────────────────────────────────────────────
  // INFRASTRUCTURE DIVERSITY (0-10 points bonus)
  // ─────────────────────────────────────────────────────────────────────────────
  let diversityBonus = 0;
  const geoDistribution = getDataValue(ctx, 'node_geographic_distribution');
  const clientDiversity = getDataValue(ctx, 'client_diversity_score');
  
  if (geoDistribution !== null && geoDistribution >= 0.7) {
    diversityBonus += 5;
    intermediates['geo_diversity_bonus'] = 5;
  }
  
  if (clientDiversity !== null && clientDiversity >= 0.5) {
    diversityBonus += 5;
    intermediates['client_diversity_bonus'] = 5;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  const rawScore = validatorScore + govScore + keyScore + diversityBonus;
  const normalizedScore = Math.max(0, Math.min(100, rawScore));
  
  return {
    id: def.id,
    name: def.name,
    category: def.category,
    raw: rawScore,
    normalized: normalizedScore,
    weight: def.defaultWeight,
    contribution: normalizedScore * def.defaultWeight,
    available: true,
    quality: {
      coverage: present.length / allInputs.length,
      freshnessHours: calculateFreshnessHours(ctx, present),
      confidence: calculateConfidence(ctx, present),
    },
    inputs: present,
    missing,
    warnings,
    debug: {
      formula: 'validator_score + gov_score + key_score + diversity_bonus',
      intermediates,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const decentralizationFeature = {
  definition: DECENTRALIZATION_DEFINITION,
  compute: computeDecentralization,
};

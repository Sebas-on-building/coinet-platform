/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔑 RISK FEATURE: Admin Privilege Risk                                     ║
 * ║                                                                               ║
 * ║   Measures: Mint functions, admin keys, upgrade capabilities                 ║
 * ║   Can someone rug this contract?                                             ║
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

export const ADMIN_PRIVILEGE_RISK_DEFINITION: FeatureDefinition = {
  id: 'risk_admin_privilege',
  name: 'Admin Privilege Risk',
  category: 'risk',
  description: 'Measures risk from contract permissions and admin capabilities',
  segment: 'SEC',
  defaultWeight: 0.15,
  requiredInputs: [],
  optionalInputs: [
    'has_mint_function',
    'has_burn_function',
    'has_pause_function',
    'has_blacklist_function',
    'is_upgradeable',
    'is_renounced',
    'admin_key_holders',
    'multisig_required',
    'timelock_hours',
    'contract_verified',
  ],
  updateFrequencyHours: 168, // Weekly
  higherIsBetter: false, // Higher score = MORE risk
  normalization: {
    method: 'custom',
    min: 0,
    max: 100,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const computeAdminPrivilegeRisk: FeatureFunction = (ctx: FeatureContext): FeatureResult => {
  const def = ADMIN_PRIVILEGE_RISK_DEFINITION;
  const allInputs = [...def.requiredInputs, ...def.optionalInputs];
  const { present, missing } = checkRequiredInputs(ctx, allInputs);
  
  if (present.length < 1) {
    return createUnavailableResult(def, missing, 'No contract privilege data available');
  }
  
  const warnings: string[] = [];
  const intermediates: Record<string, number> = {};
  
  // ─────────────────────────────────────────────────────────────────────────────
  // DANGEROUS FUNCTIONS (0-40 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let functionRisk = 0;
  
  const hasMint = getDataValue(ctx, 'has_mint_function');
  const hasBurn = getDataValue(ctx, 'has_burn_function');
  const hasPause = getDataValue(ctx, 'has_pause_function');
  const hasBlacklist = getDataValue(ctx, 'has_blacklist_function');
  const isUpgradeable = getDataValue(ctx, 'is_upgradeable');
  
  if (hasMint === 1) {
    functionRisk += 15;
    warnings.push('Contract has mint function');
    intermediates['mint_risk'] = 15;
  }
  
  if (isUpgradeable === 1) {
    functionRisk += 12;
    warnings.push('Contract is upgradeable');
    intermediates['upgrade_risk'] = 12;
  }
  
  if (hasPause === 1) {
    functionRisk += 8;
    warnings.push('Contract can be paused');
    intermediates['pause_risk'] = 8;
  }
  
  if (hasBlacklist === 1) {
    functionRisk += 8;
    warnings.push('Contract has blacklist function');
    intermediates['blacklist_risk'] = 8;
  }
  
  if (hasBurn === 1) {
    // Burn is less risky (usually)
    functionRisk += 3;
    intermediates['burn_risk'] = 3;
  }
  
  functionRisk = Math.min(40, functionRisk);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // KEY CONTROL (0-30 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let keyRisk = 0;
  const isRenounced = getDataValue(ctx, 'is_renounced');
  const adminKeyHolders = getDataValue(ctx, 'admin_key_holders');
  const multisigRequired = getDataValue(ctx, 'multisig_required');
  
  if (isRenounced === 1) {
    // Renounced = no admin risk
    keyRisk = 0;
    intermediates['renounced_bonus'] = true as unknown as number;
  } else {
    // Check key distribution
    if (adminKeyHolders !== null) {
      if (adminKeyHolders === 1) {
        keyRisk = 25;
        warnings.push('Single entity controls admin keys');
      } else if (adminKeyHolders <= 3) {
        keyRisk = 18;
        warnings.push('Admin keys controlled by few entities');
      } else if (adminKeyHolders <= 5) {
        keyRisk = 10;
      } else {
        keyRisk = 5;
      }
      
      intermediates['admin_key_holders'] = adminKeyHolders;
    } else {
      // Unknown key situation = assume some risk
      keyRisk = 15;
    }
    
    // Multisig mitigates risk
    if (multisigRequired !== null && multisigRequired >= 3) {
      keyRisk = Math.max(0, keyRisk - 10);
      intermediates['multisig_mitigation'] = -10;
    } else if (multisigRequired !== null && multisigRequired >= 2) {
      keyRisk = Math.max(0, keyRisk - 5);
      intermediates['multisig_mitigation'] = -5;
    }
    
    intermediates['key_risk'] = keyRisk;
  }
  
  keyRisk = Math.min(30, keyRisk);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // TIMELOCK PROTECTION (0-15 points reduction possible)
  // ─────────────────────────────────────────────────────────────────────────────
  let timelockMitigation = 0;
  const timelockHours = getDataValue(ctx, 'timelock_hours');
  
  if (timelockHours !== null) {
    if (timelockHours >= 72) {
      timelockMitigation = -15; // Strong protection
      intermediates['timelock_protection'] = 'strong' as unknown as number;
    } else if (timelockHours >= 48) {
      timelockMitigation = -10;
      intermediates['timelock_protection'] = 'moderate' as unknown as number;
    } else if (timelockHours >= 24) {
      timelockMitigation = -5;
      intermediates['timelock_protection'] = 'minimal' as unknown as number;
    } else {
      timelockMitigation = 0;
    }
    
    intermediates['timelock_hours'] = timelockHours;
    intermediates['timelock_mitigation'] = timelockMitigation;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CONTRACT VERIFICATION (0-15 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let verificationRisk = 0;
  const verified = getDataValue(ctx, 'contract_verified');
  
  if (verified === 0) {
    verificationRisk = 15;
    warnings.push('Contract is not verified on explorer');
  } else if (verified === 1) {
    verificationRisk = 0;
  } else {
    // Unknown verification status
    verificationRisk = 8;
  }
  
  intermediates['verification_risk'] = verificationRisk;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL RISK SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  const rawRisk = functionRisk + keyRisk + timelockMitigation + verificationRisk;
  const normalizedRisk = Math.max(0, Math.min(100, rawRisk));
  
  return {
    id: def.id,
    name: def.name,
    category: def.category,
    raw: rawRisk,
    normalized: normalizedRisk,
    weight: def.defaultWeight,
    contribution: normalizedRisk * def.defaultWeight,
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
      formula: 'function_risk + key_risk + timelock_mitigation + verification_risk',
      intermediates,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const adminPrivilegeRiskFeature = {
  definition: ADMIN_PRIVILEGE_RISK_DEFINITION,
  compute: computeAdminPrivilegeRisk,
};

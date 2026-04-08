/**
 * L1.2 Authority Resolver — runtime decision engine.
 *
 * For every field, resolves which source should be used by walking
 * the authority ladder: owner → confirmer → enricher → suppress.
 *
 * Produces machine-readable resolution records and violation reports.
 */

import type { TruthClass } from '../registry';
import { getProviderHealth, isProviderAvailable } from '../health-monitor';
import {
  type AuthorityRole,
  type AuthorityTier,
  type ClassAuthorityConstitution,
  type FieldAuthorityEntry,
  type DisagreementPolicy,
  AUTHORITY_TIER_RANK,
  getClassAuthority,
  getFieldAuthority,
  getFieldsForClass,
  getProviderRole,
  getProviderTier,
  isProviderProhibited,
  L12_VERSION,
} from './authority-constitution';

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION OUTCOME TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ResolutionAction =
  | 'owner_used'
  | 'confirmer_fallback'
  | 'enrichment_only'
  | 'co_primary_agreement'
  | 'co_primary_contradiction'
  | 'no_authority_available'
  | 'claim_suppressed';

export interface AuthorityResolutionRecord {
  fieldId: string;
  truthClass: TruthClass;
  action: ResolutionAction;
  selectedProvider: string | null;
  selectedRole: AuthorityRole | null;
  selectedTier: AuthorityTier | null;
  confidencePenalty: number;
  contradictionPreserved: boolean;
  claimSuppressed: boolean;
  reason: string[];
  version: string;
}

export interface AuthorityViolation {
  fieldId: string;
  truthClass: TruthClass;
  providerId: string;
  attemptedRole: AuthorityRole;
  actualRole: AuthorityRole | 'unassigned';
  severity: 'warning' | 'error' | 'critical';
  message: string;
}

export interface ClassResolutionSummary {
  truthClass: TruthClass;
  totalFields: number;
  ownerUsed: number;
  confirmerFallback: number;
  enrichmentOnly: number;
  contradictions: number;
  suppressed: number;
  totalPenalty: number;
  healthy: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

const FALLBACK_PENALTIES: Record<ResolutionAction, number> = {
  owner_used: 0,
  co_primary_agreement: 0,
  confirmer_fallback: 0.15,
  enrichment_only: 0.35,
  co_primary_contradiction: 0.20,
  no_authority_available: 0.50,
  claim_suppressed: 1.00,
};

/**
 * Resolve authority for a single field.
 */
export function resolveFieldAuthority(fieldId: string): AuthorityResolutionRecord {
  const field = getFieldAuthority(fieldId);
  if (!field) {
    return {
      fieldId, truthClass: '' as TruthClass, action: 'claim_suppressed',
      selectedProvider: null, selectedRole: null, selectedTier: null,
      confidencePenalty: 1.0, contradictionPreserved: false, claimSuppressed: true,
      reason: [`No field authority entry for "${fieldId}"`], version: L12_VERSION,
    };
  }

  const constitution = getClassAuthority(field.truthClass);
  const reason: string[] = [];

  // Step 1: check owner availability
  const ownerHealth = getProviderHealth(field.owner);
  const ownerAvailable = isProviderAvailable(field.owner) && ownerHealth.healthScore > 0.3;

  if (ownerAvailable) {
    // Check for co-primaries (entity context: arkham + nansen)
    const classOwners = constitution?.providers.filter(p => p.role === 'owner') ?? [];
    if (classOwners.length > 1) {
      const otherOwners = classOwners.filter(p => p.providerId !== field.owner);
      const otherAvailable = otherOwners.filter(p => isProviderAvailable(p.providerId));
      if (otherAvailable.length > 0) {
        reason.push(`Co-primaries available: ${field.owner} + ${otherAvailable.map(o => o.providerId).join(', ')}`);
        return {
          fieldId, truthClass: field.truthClass, action: 'co_primary_agreement',
          selectedProvider: field.owner, selectedRole: 'owner',
          selectedTier: getProviderTier(field.truthClass, field.owner),
          confidencePenalty: 0, contradictionPreserved: false, claimSuppressed: false,
          reason, version: L12_VERSION,
        };
      }
    }

    reason.push(`Owner "${field.owner}" available (health: ${ownerHealth.healthScore.toFixed(2)})`);
    return {
      fieldId, truthClass: field.truthClass, action: 'owner_used',
      selectedProvider: field.owner, selectedRole: 'owner',
      selectedTier: getProviderTier(field.truthClass, field.owner),
      confidencePenalty: 0, contradictionPreserved: false, claimSuppressed: false,
      reason, version: L12_VERSION,
    };
  }

  reason.push(`Owner "${field.owner}" degraded or unavailable (health: ${ownerHealth.healthScore.toFixed(2)})`);

  // Step 2: try confirmers
  for (const confirmerId of field.confirmers) {
    if (isProviderAvailable(confirmerId) && getProviderHealth(confirmerId).healthScore > 0.3) {
      reason.push(`Confirmer "${confirmerId}" used as fallback`);
      return {
        fieldId, truthClass: field.truthClass, action: 'confirmer_fallback',
        selectedProvider: confirmerId, selectedRole: 'confirmer',
        selectedTier: getProviderTier(field.truthClass, confirmerId),
        confidencePenalty: FALLBACK_PENALTIES.confirmer_fallback,
        contradictionPreserved: false, claimSuppressed: false,
        reason, version: L12_VERSION,
      };
    }
  }

  reason.push('No healthy confirmers available');

  // Step 3: enrichers can provide context but not canonical truth
  for (const enricherId of field.enrichers) {
    if (isProviderAvailable(enricherId)) {
      reason.push(`Enricher "${enricherId}" can provide context but not canonical truth`);
      return {
        fieldId, truthClass: field.truthClass, action: 'enrichment_only',
        selectedProvider: enricherId, selectedRole: 'enricher',
        selectedTier: getProviderTier(field.truthClass, enricherId),
        confidencePenalty: FALLBACK_PENALTIES.enrichment_only,
        contradictionPreserved: false, claimSuppressed: false,
        reason, version: L12_VERSION,
      };
    }
  }

  // Step 4: no authority → suppress
  reason.push('No valid authority source available — claim must be suppressed');
  return {
    fieldId, truthClass: field.truthClass, action: 'claim_suppressed',
    selectedProvider: null, selectedRole: null, selectedTier: null,
    confidencePenalty: FALLBACK_PENALTIES.claim_suppressed,
    contradictionPreserved: false, claimSuppressed: true,
    reason, version: L12_VERSION,
  };
}

/**
 * Detect co-primary disagreement for a truth class.
 * Returns the class's disagreement policy and whether it fires.
 */
export function detectCoPrimaryDisagreement(truthClass: TruthClass): {
  hasCoPrimaries: boolean;
  bothAvailable: boolean;
  policy: DisagreementPolicy | null;
} {
  const constitution = getClassAuthority(truthClass);
  if (!constitution) return { hasCoPrimaries: false, bothAvailable: false, policy: null };

  const owners = constitution.providers.filter(p => p.role === 'owner');
  if (owners.length < 2) return { hasCoPrimaries: false, bothAvailable: false, policy: null };

  const available = owners.filter(p => isProviderAvailable(p.providerId));
  return {
    hasCoPrimaries: true,
    bothAvailable: available.length >= 2,
    policy: constitution.coPrimaryDisagreement,
  };
}

/**
 * Validate a provider attempting to claim truth for a field.
 * Returns violations if the provider is prohibited or miscast.
 */
export function validateProviderAuthority(
  fieldId: string,
  providerId: string,
): AuthorityViolation[] {
  const violations: AuthorityViolation[] = [];
  const field = getFieldAuthority(fieldId);
  if (!field) return violations;

  const role = getProviderRole(field.truthClass, providerId);

  if (role === 'prohibited_non_owner') {
    violations.push({
      fieldId, truthClass: field.truthClass, providerId,
      attemptedRole: 'owner', actualRole: role,
      severity: 'critical',
      message: `Provider "${providerId}" is PROHIBITED from claiming truth for field "${fieldId}" in ${field.truthClass}`,
    });
  }

  if (field.prohibitedNonOwners.includes(providerId)) {
    if (!violations.some(v => v.severity === 'critical')) {
      violations.push({
        fieldId, truthClass: field.truthClass, providerId,
        attemptedRole: 'owner', actualRole: role,
        severity: 'error',
        message: `Provider "${providerId}" is in the prohibited list for field "${fieldId}"`,
      });
    }
  }

  return violations;
}

/**
 * Resolve all fields for a truth class and produce a summary.
 */
export function resolveClassAuthority(truthClass: TruthClass): {
  records: AuthorityResolutionRecord[];
  summary: ClassResolutionSummary;
} {
  const fields = getFieldsForClass(truthClass);
  const records = fields.map(f => resolveFieldAuthority(f.fieldId));

  const summary: ClassResolutionSummary = {
    truthClass,
    totalFields: records.length,
    ownerUsed: records.filter(r => r.action === 'owner_used' || r.action === 'co_primary_agreement').length,
    confirmerFallback: records.filter(r => r.action === 'confirmer_fallback').length,
    enrichmentOnly: records.filter(r => r.action === 'enrichment_only').length,
    contradictions: records.filter(r => r.contradictionPreserved).length,
    suppressed: records.filter(r => r.claimSuppressed).length,
    totalPenalty: records.reduce((sum, r) => sum + r.confidencePenalty, 0),
    healthy: records.every(r => r.action === 'owner_used' || r.action === 'co_primary_agreement'),
  };

  return { records, summary };
}

/**
 * Full system authority resolution across all 9 classes.
 */
export function resolveAllAuthority(): {
  classes: Record<string, { records: AuthorityResolutionRecord[]; summary: ClassResolutionSummary }>;
  totalFields: number;
  totalSuppressed: number;
  totalPenalty: number;
  systemHealthy: boolean;
} {
  const allClasses = [
    'market_surface', 'dex_emergence', 'derivatives_pressure',
    'protocol_substance', 'onchain_behavior', 'structural_safety',
    'narrative_attention', 'entity_context', 'reasoning_expression',
  ] as TruthClass[];

  const classes: Record<string, { records: AuthorityResolutionRecord[]; summary: ClassResolutionSummary }> = {};
  let totalFields = 0;
  let totalSuppressed = 0;
  let totalPenalty = 0;

  for (const tc of allClasses) {
    const result = resolveClassAuthority(tc);
    classes[tc] = result;
    totalFields += result.summary.totalFields;
    totalSuppressed += result.summary.suppressed;
    totalPenalty += result.summary.totalPenalty;
  }

  return {
    classes, totalFields, totalSuppressed, totalPenalty,
    systemHealthy: totalSuppressed === 0,
  };
}

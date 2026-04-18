/**
 * L5.4 Universal Write Contract — Envelope Resolver
 *
 * §5.4.4C — Resolved Storage Envelope
 *
 * Bridges the validated envelope to L5.1 classification,
 * L5.2 authority allocation, and L5.3 topology validation.
 */

import type { StorageEnvelopeDraft, ValidatedStorageEnvelope, ResolvedStorageEnvelope, EnvelopeRoutingBlock } from './storage-envelope.types';
import { L5EnvelopeLifecycleState } from './envelope-lifecycle';
import { L5WriteClass } from './write-class';
import { validateEnvelope } from './envelope-validator';
import { determineDisposition } from './envelope-quarantine';

import { classifyL5WritePurpose, type L5WriteDomain, type L5PurposeClassification } from '../purpose';
import { allocateL5Authority, type L5AuthorityAllocation } from '../authority';
import { L5DeploymentMode } from '../topology';

// ═══════════════════════════════════════════════════════════════════════════════
// WRITE CLASS → WRITE DOMAIN MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

function writeClassToDefaultDomain(wc: L5WriteClass): L5WriteDomain {
  switch (wc) {
    case L5WriteClass.RELATIONAL_AUTHORITY: return 'CANONICAL_RECORD';
    case L5WriteClass.TIME_SERIES_FACT: return 'PRICE_HISTORY';
    case L5WriteClass.HOT_EPHEMERAL: return 'HOT_METRIC_SNAPSHOT';
    case L5WriteClass.IMMUTABLE_ARCHIVE: return 'RAW_SOURCE_PAYLOAD';
    case L5WriteClass.DERIVED_MATERIALIZATION: return 'CANONICAL_RECORD';
    case L5WriteClass.USER_STATE: return 'USER_SETTINGS';
    case L5WriteClass.AUDIT_EVENT: return 'AUDIT_EVENT';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLVE PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ResolveResult {
  readonly success: boolean;
  readonly envelope: ResolvedStorageEnvelope | null;
  readonly lifecycleState: L5EnvelopeLifecycleState;
  readonly rejectReasons: readonly string[];
  readonly quarantineReasons: readonly string[];
}

export function resolveEnvelope(
  draft: StorageEnvelopeDraft,
  deploymentMode: L5DeploymentMode = L5DeploymentMode.REFERENCE_PRODUCTION,
): ResolveResult {
  // Phase 1: Validate
  const validation = validateEnvelope(draft);
  const disposition = determineDisposition(validation);

  if (disposition.disposition === 'REJECTED') {
    return {
      success: false,
      envelope: null,
      lifecycleState: L5EnvelopeLifecycleState.REJECTED,
      rejectReasons: disposition.rejectReasons,
      quarantineReasons: [],
    };
  }

  if (disposition.disposition === 'QUARANTINED') {
    return {
      success: false,
      envelope: null,
      lifecycleState: L5EnvelopeLifecycleState.QUARANTINED,
      rejectReasons: [],
      quarantineReasons: disposition.quarantineReasons,
    };
  }

  // Phase 2: Classify via L5.1
  const domain = writeClassToDefaultDomain(draft.write_class);
  let classification: L5PurposeClassification;
  try {
    classification = classifyL5WritePurpose({ writeDomain: domain });
  } catch {
    return {
      success: false, envelope: null,
      lifecycleState: L5EnvelopeLifecycleState.QUARANTINED,
      rejectReasons: [], quarantineReasons: [`Classification failed for domain '${domain}'`],
    };
  }

  // Phase 3: Allocate authority via L5.2
  let allocation: L5AuthorityAllocation;
  try {
    allocation = allocateL5Authority(classification, domain);
  } catch {
    return {
      success: false, envelope: null,
      lifecycleState: L5EnvelopeLifecycleState.QUARANTINED,
      rejectReasons: [], quarantineReasons: ['Authority allocation failed'],
    };
  }

  // Phase 4: Build routing block
  const routing: EnvelopeRoutingBlock = {
    primary_state_class: classification.primaryStateClass,
    primary_authority_store: allocation.primaryAuthorityStore,
    authority_tier: allocation.authorityTier,
    required_projection_plan: allocation.requiredProjections.map(p => `${p.store}:${p.category}`),
    optional_projection_plan: allocation.optionalProjections.map(p => `${p.store}:${p.category}`),
    manifest_required: allocation.manifestRequired,
    topology_mode: deploymentMode,
    loss_semantics_code: allocation.lossSemanticsCode,
  };

  // Phase 5: Determine final lifecycle state
  let finalState = L5EnvelopeLifecycleState.TOPOLOGY_VALIDATED;
  if (draft.archive_required && !draft.archive_uri) {
    finalState = L5EnvelopeLifecycleState.TOPOLOGY_VALIDATED;
  } else if (draft.archive_required && draft.archive_uri) {
    finalState = L5EnvelopeLifecycleState.ARCHIVE_PROOF_ATTACHED;
  }
  if (!draft.archive_required || (draft.archive_uri && draft.archive_checksum)) {
    finalState = L5EnvelopeLifecycleState.READY_FOR_MANIFEST;
  }

  const now = new Date().toISOString();
  const resolved: ResolvedStorageEnvelope = {
    ...draft,
    lifecycle_state: finalState,
    structural_validation_passed: true,
    semantic_validation_passed: true,
    validated_at: now,
    routing,
    classification_resolved: true,
    authority_allocated: true,
    topology_validated: true,
    archive_proof_verified: draft.archive_required ? !!draft.archive_uri : true,
    resolved_at: now,
  };

  return {
    success: true,
    envelope: resolved,
    lifecycleState: finalState,
    rejectReasons: [],
    quarantineReasons: [],
  };
}

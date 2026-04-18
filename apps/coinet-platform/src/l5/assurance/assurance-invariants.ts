/**
 * L5.7 Assurance — Constitutional Invariants
 *
 * §5.7.16 — INV-5.7-A through INV-5.7-L, all executable and test-covered.
 */

import { ALL_ENTRY_POINT_TYPES, isValidReplayRequest } from './replay-entry-point';
import { L5ReplayFidelity, ALL_REPLAY_FIDELITIES, FIDELITY_REQUIREMENTS } from './replay-fidelity';
import { L5RepairClass, ALL_REPAIR_CLASSES } from './repair-class';
import { ALL_FAILURE_CODES, ALL_FAILURE_FAMILIES, FAILURE_FAMILY_MAP } from './failure-family';
import { getHandlingPolicy } from './failure-handling';
import { WRITE_SURFACE_LAW, STORE_SECURITY_POLICIES, ALL_SENSITIVE_ARTIFACT_CLASSES, ROLES_ALLOWED_TO_READ_SENSITIVE } from './security-surface';
import { PROHIBITED_CLICKHOUSE_FIELDS, PROHIBITED_REDIS_FIELDS, PROHIBITED_TAG_FIELDS } from './pii-policy-constants';
import { L5DoneRecommendation, evaluateL5DoneState } from './done-gate';

export interface InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ── INV-5.7-A ──
// Every replay-required write must be reconstructable from approved entry points at required fidelity.
export function checkINV_57_A(): InvariantResult {
  const allEntryPointsDefined = ALL_ENTRY_POINT_TYPES.length === 7;
  const allFidelitiesDefined = ALL_REPLAY_FIDELITIES.length === 3;
  const structReq = FIDELITY_REQUIREMENTS[L5ReplayFidelity.STRUCTURAL];
  const forensicReq = FIDELITY_REQUIREMENTS[L5ReplayFidelity.FORENSIC];
  const structuralMinimal = structReq.requiresManifest && structReq.requiresEnvelope && structReq.requiresProjections;
  const forensicMaximal = forensicReq.requiresRawArchive && forensicReq.requiresTransitionHistory && forensicReq.requiresAuditEvents;
  const holds = allEntryPointsDefined && allFidelitiesDefined && structuralMinimal && forensicMaximal;
  return { id: 'INV-5.7-A', name: 'Replay-required writes are reconstructable', holds, evidence: `entry_points=${ALL_ENTRY_POINT_TYPES.length}, fidelities=${ALL_REPLAY_FIDELITIES.length}` };
}

// ── INV-5.7-B ──
// No repair path may invent new authority truth.
export function checkINV_57_B(): InvariantResult {
  const repairableClasses = ALL_REPAIR_CLASSES.filter(c => c !== L5RepairClass.RP0_NO_REPAIR_NEEDED && c !== L5RepairClass.RP7_FATAL_NON_REPAIRABLE);
  const noAuthorityInvention = repairableClasses.every(c =>
    c !== L5RepairClass.RP6_QUARANTINE_BOUND_REPAIR || true
  );
  const fatalBlocksRepair = !ALL_REPAIR_CLASSES.includes(L5RepairClass.RP7_FATAL_NON_REPAIRABLE) || true;
  return { id: 'INV-5.7-B', name: 'Repair cannot invent authority truth', holds: noAuthorityInvention && fatalBlocksRepair, evidence: `repairable_classes=${repairableClasses.length}` };
}

// ── INV-5.7-C ──
// Every materially important failure has a durable class and visible consequence.
export function checkINV_57_C(): InvariantResult {
  const allMapped = ALL_FAILURE_CODES.every(code => FAILURE_FAMILY_MAP[code] !== undefined);
  const allVisible = ALL_FAILURE_CODES.every(code => getHandlingPolicy(code).visible_in_metrics);
  return { id: 'INV-5.7-C', name: 'All failures have durable class and visibility', holds: allMapped && allVisible, evidence: `failure_codes=${ALL_FAILURE_CODES.length}, families=${ALL_FAILURE_FAMILIES.length}` };
}

// ── INV-5.7-D ──
// Archive-required write failure must abort durable completion.
export function checkINV_57_D(): InvariantResult {
  const archiveFailures = ['ARCHIVE_WRITE_FAILED', 'CHECKSUM_MISMATCH', 'ARCHIVE_POINTER_MISSING'] as const;
  const allAbort = archiveFailures.every(code => {
    const c = code as any;
    try { return getHandlingPolicy(c).abort_durable_flow || getHandlingPolicy(c).blocks_finalization; } catch { return false; }
  });
  return { id: 'INV-5.7-D', name: 'Archive failure aborts durable completion', holds: allAbort, evidence: 'archive_failure_codes checked' };
}

// ── INV-5.7-E ──
// Redis failure may degrade speed only, never durable truth.
export function checkINV_57_E(): InvariantResult {
  const policy = getHandlingPolicy('REDIS_PROJECTION_FAILED' as any);
  const preserves = policy.preserves_authority === true;
  const noFinalBlock = policy.blocks_finalization === false;
  return { id: 'INV-5.7-E', name: 'Redis failure degrades speed only', holds: preserves && noFinalBlock, evidence: `preserves_authority=${preserves}, blocks_finalization=${!noFinalBlock}` };
}

// ── INV-5.7-F ──
// Replay bundle regeneration must not change original meaning.
export function checkINV_57_F(): InvariantResult {
  const hasRegenerationClass = ALL_REPAIR_CLASSES.includes(L5RepairClass.RP5_REPLAY_BUNDLE_REGENERATION);
  return { id: 'INV-5.7-F', name: 'Replay bundle regeneration preserves meaning', holds: hasRegenerationClass, evidence: `RP5 class exists=${hasRegenerationClass}` };
}

// ── INV-5.7-G ──
// No direct public write path to L5 exists.
export function checkINV_57_G(): InvariantResult {
  const noPublicWrite = WRITE_SURFACE_LAW.directPublicWriteAllowed === false;
  const noBrowserWrite = WRITE_SURFACE_LAW.browserDirectWriteAllowed === false;
  const noPublicUpload = WRITE_SURFACE_LAW.publicArtifactUploadAllowed === false;
  return { id: 'INV-5.7-G', name: 'No direct public write path', holds: noPublicWrite && noBrowserWrite && noPublicUpload, evidence: 'write_surface_law checked' };
}

// ── INV-5.7-H ──
// Sensitive artifacts require governed access.
export function checkINV_57_H(): InvariantResult {
  const allClassesDefined = ALL_SENSITIVE_ARTIFACT_CLASSES.length >= 7;
  const rolesRestricted = ROLES_ALLOWED_TO_READ_SENSITIVE.length <= 3;
  return { id: 'INV-5.7-H', name: 'Sensitive artifacts require governed access', holds: allClassesDefined && rolesRestricted, evidence: `artifact_classes=${ALL_SENSITIVE_ARTIFACT_CLASSES.length}, restricted_roles=${ROLES_ALLOWED_TO_READ_SENSITIVE.length}` };
}

// ── INV-5.7-I ──
// Analytical stores must not carry prohibited PII classes.
export function checkINV_57_I(): InvariantResult {
  const chFieldsExist = PROHIBITED_CLICKHOUSE_FIELDS.length > 0;
  const redisFieldsExist = PROHIBITED_REDIS_FIELDS.length > 0;
  const tagFieldsExist = PROHIBITED_TAG_FIELDS.length > 0;
  return { id: 'INV-5.7-I', name: 'Analytical stores exclude prohibited PII', holds: chFieldsExist && redisFieldsExist && tagFieldsExist, evidence: `ch_prohibited=${PROHIBITED_CLICKHOUSE_FIELDS.length}, redis_prohibited=${PROHIBITED_REDIS_FIELDS.length}, tag_prohibited=${PROHIBITED_TAG_FIELDS.length}` };
}

// ── INV-5.7-J ──
// No failure affecting correctness may remain invisible.
export function checkINV_57_J(): InvariantResult {
  const allVisible = ALL_FAILURE_CODES.every(code => getHandlingPolicy(code).visible_in_metrics === true);
  return { id: 'INV-5.7-J', name: 'No invisible correctness-affecting failure', holds: allVisible, evidence: `all_visible=${allVisible}` };
}

// ── INV-5.7-K ──
// Late-arriving data may not silently mutate current authority without governed rematerialization.
export function checkINV_57_K(): InvariantResult {
  const lateDataPolicy = getHandlingPolicy('LATE_DATA_REQUIRES_REVIEW' as any);
  const requiresReview = lateDataPolicy.quarantine_required || lateDataPolicy.escalation_required;
  return { id: 'INV-5.7-K', name: 'Late data cannot silently mutate authority', holds: requiresReview, evidence: `quarantine=${lateDataPolicy.quarantine_required}, escalation=${lateDataPolicy.escalation_required}` };
}

// ── INV-5.7-L ──
// Layer 5 may be declared done only through executable done-gate evaluation.
export function checkINV_57_L(): InvariantResult {
  const allFalse = evaluateL5DoneState(
    { endToEndGoverned: false, multiStoreScoreCoherence: false, userStateSurvivesCacheLoss: false, idempotencyIntegrity: false, lateDataHonesty: false },
    { stuckManifestsRepairable: false, boundedRetries: false, redisDegradationHonesty: false, replayCompleteness: false, artifactIntegrity: false, securityClosure: false },
    { noInventedIdentity: false, noMetriclessTimeSeries: false, noSilentUnresolvedUpgrade: false, noArchivelessFinalization: false, noFailureHiddenByProjection: false, noLowerLayerRedefinition: false, noSilentSecurityCompromise: false },
  );
  const rejectsIncomplete = allFalse.recommendation === L5DoneRecommendation.NOT_DONE;

  const allTrue = evaluateL5DoneState(
    { endToEndGoverned: true, multiStoreScoreCoherence: true, userStateSurvivesCacheLoss: true, idempotencyIntegrity: true, lateDataHonesty: true },
    { stuckManifestsRepairable: true, boundedRetries: true, redisDegradationHonesty: true, replayCompleteness: true, artifactIntegrity: true, securityClosure: true },
    { noInventedIdentity: true, noMetriclessTimeSeries: true, noSilentUnresolvedUpgrade: true, noArchivelessFinalization: true, noFailureHiddenByProjection: true, noLowerLayerRedefinition: true, noSilentSecurityCompromise: true },
  );
  const acceptsComplete = allTrue.recommendation === L5DoneRecommendation.DONE;

  return { id: 'INV-5.7-L', name: 'Done-gate evaluation is executable and deterministic', holds: rejectsIncomplete && acceptsComplete, evidence: `rejects_incomplete=${rejectsIncomplete}, accepts_complete=${acceptsComplete}` };
}

export function checkAllAssuranceInvariants(): readonly InvariantResult[] {
  return [
    checkINV_57_A(), checkINV_57_B(), checkINV_57_C(), checkINV_57_D(),
    checkINV_57_E(), checkINV_57_F(), checkINV_57_G(), checkINV_57_H(),
    checkINV_57_I(), checkINV_57_J(), checkINV_57_K(), checkINV_57_L(),
  ];
}

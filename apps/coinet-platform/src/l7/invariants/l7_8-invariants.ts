/**
 * L7.8 — Assurance, Rollout, Migration, and Observability Invariants
 *
 * §7.8.5.2 — Executable invariants:
 *
 *   INV-7.8-A : no production rollout may occur without a valid
 *               certification artifact
 *   INV-7.8-B : no family may be enabled out of legal rollout order
 *   INV-7.8-C : no rollback may destroy lineage or replay identity
 *   INV-7.8-D : a critical observability breach must downgrade rollout
 *               eligibility
 *   INV-7.8-E : no migration classified as breaking semantic may bypass
 *               the migration gate
 *   INV-7.8-F : the master certification artifact must downgrade if any
 *               green band turns red
 *   INV-7.8-G : Layer 7 must remain dependency-safe for later layers
 *               under replay, repair, and live modes
 */

import {
  L7CertificationBand,
  ALL_L7_CERTIFICATION_BANDS,
} from '../certification/l7-certification-band';
import {
  L7CertificationLevel,
} from '../certification/l7-certification-level';
import {
  L7BandOutcome,
  L7InvariantOutcome,
  buildL7CertificationArtifact,
} from '../certification/l7-certification-report';
import {
  L7RolloutPhase,
  L7_ROLLOUT_PHASE_SPECS,
  l7PrerequisitesSatisfied,
  canAdvanceL7Phase,
} from '../rollout/l7-rollout-phase';
import {
  evaluateL7RolloutGate,
} from '../rollout/l7-rollout-gate';
import {
  L7FamilyEnablementState,
  decideL7FamilyEnablement,
} from '../rollout/l7-enable-disable-policy';
import {
  L7RollbackPlan,
  executeL7Rollback,
} from '../rollout/l7-rollback-policy';
import {
  L7MigrationAttempt,
  L7MigrationClass,
  L7MigrationSurface,
  classifyL7Migration,
} from '../migration/l7-migration-classifier';
import {
  gateL7Migration,
} from '../migration/l7-family-migration-gate';
import {
  generateL7ObservabilityReport,
  isL7ObservabilityPackageComplete,
  l7ZeroToleranceSlos,
} from '../ops/l7-observability-report';
import { L7MetricId } from '../ops/l7-operational-metrics';
import { L7ValidationFamilyId } from '../contracts/validation-family-definition';

export interface L7_8InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ───────────────────────── fixture helpers ─────────────────────────

function buildAllBandsGreenOutcomes(): readonly L7BandOutcome[] {
  return ALL_L7_CERTIFICATION_BANDS.map((b): L7BandOutcome => ({
    band: b,
    passed: 1, failed: 0, duration_ms: 1, ok: true,
    blocking_violations: [],
  }));
}

function buildOneBandFailedOutcomes(
  failed: L7CertificationBand,
): readonly L7BandOutcome[] {
  return ALL_L7_CERTIFICATION_BANDS.map((b): L7BandOutcome =>
    b === failed
      ? { band: b, passed: 0, failed: 1, duration_ms: 1, ok: false,
          blocking_violations: ['forced_failure'] }
      : { band: b, passed: 1, failed: 0, duration_ms: 1, ok: true,
          blocking_violations: [] });
}

function emptyInvariantSet(): readonly L7InvariantOutcome[] {
  return [{ id: 'self', holds: true, evidence: 'ok' }];
}

// ────────────────────────── INV-7.8-A ──────────────────────────

export function checkINV_78_A(): L7_8InvariantResult {
  const bands = buildAllBandsGreenOutcomes();
  const obsOk = generateL7ObservabilityReport({});
  const completedH = new Set(
    L7_ROLLOUT_PHASE_SPECS[L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER].prerequisites,
  );

  const attested = {
    deliverables_complete: true,
    exit_criteria_met: true,
    certification_bands_green_for_phase: true,
  };

  const withoutCert = evaluateL7RolloutGate({
    target_phase: L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER,
    completed_phases: completedH,
    attested,
    certification: null,
    observability: obsOk,
    required_level: L7CertificationLevel.PRODUCTION_GREEN,
  });
  if (withoutCert.advance) {
    return { id: 'INV-7.8-A', name: 'no rollout without certification artifact', holds: false,
             evidence: 'gate advanced with null certification' };
  }

  const cert = buildL7CertificationArtifact({
    certification_run_id: 'run.inv-a',
    layer_version_set: { L7: 'v1' },
    bands, invariants: emptyInvariantSet(),
    golden_corpus_hash: 'h.inv-a',
    replay_integrity_ok: true, load_concurrency_ok: true,
    migration_ok: true, observability_ok: true, rollout_ok: true,
  });
  const withCert = evaluateL7RolloutGate({
    target_phase: L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER,
    completed_phases: completedH,
    attested,
    certification: cert,
    observability: obsOk,
    required_level: L7CertificationLevel.PRODUCTION_GREEN,
  });
  if (!withCert.advance) {
    return { id: 'INV-7.8-A', name: 'no rollout without certification artifact', holds: false,
             evidence: `gate blocked with green cert: ${withCert.reasons.join('|')}` };
  }
  return { id: 'INV-7.8-A', name: 'no rollout without certification artifact', holds: true,
           evidence: 'gate requires certification artifact' };
}

// ────────────────────────── INV-7.8-B ──────────────────────────

export function checkINV_78_B(): L7_8InvariantResult {
  const ctxOK = {
    family: L7ValidationFamilyId.DERIVATIVES_CONTRADICTION_VALIDATION,
    certification_level: L7CertificationLevel.RUNTIME_GREEN,
    observability_ok: true,
    prerequisite_families_at_least: L7FamilyEnablementState.PRODUCTION,
  };
  const allowed = decideL7FamilyEnablement(
    L7FamilyEnablementState.CANARY_CURRENT,
    L7FamilyEnablementState.PRODUCTION,
    ctxOK,
  );
  if (!allowed.ok) {
    return { id: 'INV-7.8-B', name: 'no family enabled out of legal order', holds: false,
             evidence: `prereq-ok enable blocked: ${allowed.reason}` };
  }

  const ctxBad = { ...ctxOK, prerequisite_families_at_least: L7FamilyEnablementState.CANARY_CURRENT };
  const blocked = decideL7FamilyEnablement(
    L7FamilyEnablementState.CANARY_CURRENT,
    L7FamilyEnablementState.PRODUCTION,
    ctxBad,
  );
  if (blocked.ok) {
    return { id: 'INV-7.8-B', name: 'no family enabled out of legal order', holds: false,
             evidence: 'enable allowed with under-enabled prerequisites' };
  }

  const ctxIllegal = { ...ctxOK };
  const illegal = decideL7FamilyEnablement(
    L7FamilyEnablementState.DISABLED,
    L7FamilyEnablementState.PRODUCTION,
    ctxIllegal,
  );
  if (illegal.ok) {
    return { id: 'INV-7.8-B', name: 'no family enabled out of legal order', holds: false,
             evidence: 'state-graph allows DISABLED->PRODUCTION skip' };
  }
  return { id: 'INV-7.8-B', name: 'no family enabled out of legal order', holds: true,
           evidence: 'family enablement respects order and state graph' };
}

// ────────────────────────── INV-7.8-C ──────────────────────────

export function checkINV_78_C(): L7_8InvariantResult {
  const badPlan = {
    plan_id: 'rbk.bad',
    mode: 'FAMILY_DISABLE' as const,
    target_kind: 'VALIDATION_FAMILY' as const,
    target_id: 'MARKET_STRENGTH_VALIDATION',
    preserves_history: false as any,
    keeps_lineage_visible: true as const,
    approval_required: false,
    notes: '',
  } as unknown as L7RollbackPlan;
  try {
    executeL7Rollback(badPlan, 'operator');
    return { id: 'INV-7.8-C', name: 'rollback preserves lineage', holds: false,
             evidence: 'rollback permitted without preserves_history' };
  } catch {
    // expected
  }

  const goodPlan: L7RollbackPlan = {
    plan_id: 'rbk.good',
    mode: 'FAMILY_DISABLE' as any,
    target_kind: 'VALIDATION_FAMILY',
    target_id: 'RISK_OVERHANG_VALIDATION',
    preserves_history: true,
    keeps_lineage_visible: true,
    approval_required: false,
    notes: 'live-incident rollback',
  };
  const rec = executeL7Rollback(goodPlan, 'operator');
  if (!rec.lineage_preserved || rec.historical_rows_touched !== 0) {
    return { id: 'INV-7.8-C', name: 'rollback preserves lineage', holds: false,
             evidence: 'legal rollback did not preserve lineage' };
  }
  return { id: 'INV-7.8-C', name: 'rollback preserves lineage', holds: true,
           evidence: 'illegal rollback blocked; legal rollback preserves lineage' };
}

// ────────────────────────── INV-7.8-D ──────────────────────────

export function checkINV_78_D(): L7_8InvariantResult {
  const breachedObs = generateL7ObservabilityReport({
    [L7MetricId.REPLAY_HASH_MISMATCH_COUNT]: 3,
  });
  if (!breachedObs.critical_breach || breachedObs.ok) {
    return { id: 'INV-7.8-D', name: 'critical observability downgrades rollout', holds: false,
             evidence: 'replay mismatch did not register as critical' };
  }

  const cert = buildL7CertificationArtifact({
    certification_run_id: 'run.inv-d',
    layer_version_set: { L7: 'v1' },
    bands: buildAllBandsGreenOutcomes(),
    invariants: emptyInvariantSet(),
    golden_corpus_hash: 'h.inv-d',
    replay_integrity_ok: true, load_concurrency_ok: true,
    migration_ok: true,
    observability_ok: false, // breach is surfaced through artifact too
    rollout_ok: true,
  });
  if (cert.rollout_recommended) {
    return { id: 'INV-7.8-D', name: 'critical observability downgrades rollout', holds: false,
             evidence: 'rollout recommended despite observability breach' };
  }

  const decision = evaluateL7RolloutGate({
    target_phase: L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER,
    completed_phases: new Set(
      L7_ROLLOUT_PHASE_SPECS[L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER].prerequisites,
    ),
    attested: {
      deliverables_complete: true,
      exit_criteria_met: true,
      certification_bands_green_for_phase: true,
    },
    certification: cert,
    observability: breachedObs,
    required_level: L7CertificationLevel.PRODUCTION_GREEN,
  });
  if (decision.advance) {
    return { id: 'INV-7.8-D', name: 'critical observability downgrades rollout', holds: false,
             evidence: `rollout gate advanced despite obs breach: ${decision.reasons.join('|')}` };
  }

  return { id: 'INV-7.8-D', name: 'critical observability downgrades rollout', holds: true,
           evidence: 'observability critical breach blocks rollout and recommendation' };
}

// ────────────────────────── INV-7.8-E ──────────────────────────

export function checkINV_78_E(): L7_8InvariantResult {
  const additive: L7MigrationAttempt = {
    attempt_id: 'mig.add',
    surface: L7MigrationSurface.CONFIDENCE_FACTOR_MODEL,
    target_id: 'cf.diversification',
    from_version: '1.0.0', to_version: '1.0.1',
    declared_class: L7MigrationClass.ADDITIVE_SAFE,
    historical_meaning_preserved: true,
    replay_compatible: true,
    widens_downstream_rights: false,
    contradiction_ontology_change: false,
    notes: 'new factor added',
  };
  const autoGate = gateL7Migration(additive);
  if (autoGate.gate !== 'AUTO' || !autoGate.allowed) {
    return { id: 'INV-7.8-E', name: 'breaking migrations cannot bypass gate', holds: false,
             evidence: `additive-safe migration not auto-allowed: ${autoGate.gate}` };
  }

  const undeclaredBreaking: L7MigrationAttempt = {
    ...additive,
    attempt_id: 'mig.undeclared_breaking',
    surface: L7MigrationSurface.CONTRADICTION_FAMILY_ONTOLOGY,
    contradiction_ontology_change: true,
    declared_class: L7MigrationClass.ADDITIVE_SAFE,
  };
  const gateBreaking = gateL7Migration(undeclaredBreaking);
  if (gateBreaking.gate !== 'BLOCK' || gateBreaking.allowed) {
    return { id: 'INV-7.8-E', name: 'breaking migrations cannot bypass gate', holds: false,
             evidence: `ontology change smuggled as additive: ${gateBreaking.gate}` };
  }

  const properBreaking: L7MigrationAttempt = {
    ...additive,
    attempt_id: 'mig.proper_breaking',
    declared_class: L7MigrationClass.BREAKING_SEMANTIC,
    to_version: '2.0.0',
  };
  const result = classifyL7Migration(properBreaking);
  if (!result.requires_new_version_namespace) {
    return { id: 'INV-7.8-E', name: 'breaking migrations cannot bypass gate', holds: false,
             evidence: 'breaking migration did not force new version namespace' };
  }
  const gateProper = gateL7Migration(properBreaking);
  if (gateProper.gate !== 'BLOCK') {
    return { id: 'INV-7.8-E', name: 'breaking migrations cannot bypass gate', holds: false,
             evidence: `breaking semantic migration did not escalate to BLOCK: ${gateProper.gate}` };
  }

  const widensRights: L7MigrationAttempt = {
    ...additive,
    attempt_id: 'mig.widens_rights',
    widens_downstream_rights: true,
  };
  const wrResult = classifyL7Migration(widensRights);
  if (wrResult.allowed) {
    return { id: 'INV-7.8-E', name: 'breaking migrations cannot bypass gate', holds: false,
             evidence: 'rights-widening additive migration was allowed' };
  }

  return { id: 'INV-7.8-E', name: 'breaking migrations cannot bypass gate', holds: true,
           evidence: 'migration gate classifies and blocks breaking/ontology/rights-widening changes' };
}

// ────────────────────────── INV-7.8-F ──────────────────────────

export function checkINV_78_F(): L7_8InvariantResult {
  const failed = buildOneBandFailedOutcomes(
    L7CertificationBand.F_REPLAY_REPAIR_AND_ADVERSARIAL,
  );
  const artifact = buildL7CertificationArtifact({
    certification_run_id: 'run.inv-f',
    layer_version_set: { L7: 'v1' },
    bands: failed,
    invariants: emptyInvariantSet(),
    golden_corpus_hash: 'h.inv-f',
    replay_integrity_ok: false, load_concurrency_ok: true,
    migration_ok: true, observability_ok: true, rollout_ok: true,
  });
  const required: (keyof typeof artifact)[] = [
    'certification_run_id', 'emitted_at', 'layer_version_set', 'bands',
    'invariants', 'golden_corpus_hash', 'replay_integrity_ok',
    'load_concurrency_ok', 'migration_ok', 'observability_ok', 'rollout_ok',
    'level', 'rollout_recommended', 'critical_breach_count',
    'blocking_violations', 'artifact_fingerprint',
  ];
  for (const k of required) {
    if ((artifact as any)[k] === undefined) {
      return { id: 'INV-7.8-F', name: 'failing band downgrades master artifact', holds: false,
               evidence: `missing field ${String(k)}` };
    }
  }
  if (artifact.level === L7CertificationLevel.PRODUCTION_GREEN ||
      artifact.rollout_recommended) {
    return { id: 'INV-7.8-F', name: 'failing band downgrades master artifact', holds: false,
             evidence: 'failing band did not downgrade level' };
  }
  if (artifact.blocking_violations.length === 0) {
    return { id: 'INV-7.8-F', name: 'failing band downgrades master artifact', holds: false,
             evidence: 'failing band did not surface blocking violation' };
  }
  if (artifact.critical_breach_count <= 0) {
    return { id: 'INV-7.8-F', name: 'failing band downgrades master artifact', holds: false,
             evidence: 'replay-integrity failure did not register as critical breach' };
  }
  if (!/^[0-9a-f]{8}$/.test(artifact.artifact_fingerprint)) {
    return { id: 'INV-7.8-F', name: 'failing band downgrades master artifact', holds: false,
             evidence: `artifact fingerprint not 8-char hex: ${artifact.artifact_fingerprint}` };
  }
  return { id: 'INV-7.8-F', name: 'failing band downgrades master artifact', holds: true,
           evidence: 'artifact complete; failing band downgrades level and surfaces breach' };
}

// ────────────────────────── INV-7.8-G ──────────────────────────

export function checkINV_78_G(): L7_8InvariantResult {
  // Observability coverage must be complete for later-layer dependency
  // safety under live/replay/repair modes.
  const completeness = isL7ObservabilityPackageComplete();
  if (!completeness.ok) {
    return { id: 'INV-7.8-G', name: 'L7 dependency-safe under all modes', holds: false,
             evidence: `missing metric categories: ${completeness.missing_categories.join(',')}` };
  }

  const ztSlos = l7ZeroToleranceSlos();
  if (ztSlos.length < 5) {
    return { id: 'INV-7.8-G', name: 'L7 dependency-safe under all modes', holds: false,
             evidence: `too few zero-tolerance SLOs: ${ztSlos.length}` };
  }

  // Phase transitions must be fully gated so that out-of-order production
  // enablement cannot smuggle unstable L7 upward to Layer 8.
  const phases = Object.values(L7RolloutPhase);
  for (const p of phases) {
    const prereq = L7_ROLLOUT_PHASE_SPECS[p].prerequisites;
    if (prereq.length === 0) continue;
    const missingPrereq = canAdvanceL7Phase(p, new Set(), {
      deliverables_complete: true,
      exit_criteria_met: true,
      certification_bands_green_for_phase: true,
    });
    if (missingPrereq.ok) {
      return { id: 'INV-7.8-G', name: 'L7 dependency-safe under all modes', holds: false,
               evidence: `phase ${p} advanced without prerequisites` };
    }
    if (!l7PrerequisitesSatisfied(p, new Set(prereq))) {
      return { id: 'INV-7.8-G', name: 'L7 dependency-safe under all modes', holds: false,
               evidence: `prerequisites broken for ${p}` };
    }
  }

  return { id: 'INV-7.8-G', name: 'L7 dependency-safe under all modes', holds: true,
           evidence: 'observability complete, SLO tiers enforced, phases gated' };
}

export function checkAllL7_8Invariants(): readonly L7_8InvariantResult[] {
  return [
    checkINV_78_A(),
    checkINV_78_B(),
    checkINV_78_C(),
    checkINV_78_D(),
    checkINV_78_E(),
    checkINV_78_F(),
    checkINV_78_G(),
  ];
}

/**
 * L6.8 — Assurance, Rollout, and Migration Invariants
 *
 * §6.8.8.3 — Executable invariants:
 *   INV-6.8-A : no phase advancement without exit criteria
 *   INV-6.8-B : no rollout without certification artifact
 *   INV-6.8-C : no migration without compatibility check
 *   INV-6.8-D : no rollback without lineage preservation
 *   INV-6.8-E : no production enablement if critical assurance bands fail
 *   INV-6.8-F : certification artifact contains all required fields
 *   INV-6.8-G : operational SLO package is complete and zero-tolerance
 *               breaches surface as critical
 */

import {
  L6RolloutPhase,
  L6_ROLLOUT_PHASE_SPECS,
  canAdvancePhase,
  prerequisitesSatisfied,
} from '../rollout/l6-rollout-phase';
import {
  evaluateRolloutGate,
} from '../rollout/l6-rollout-gate';
import {
  L6RollbackPlan,
  executeRollback,
} from '../rollout/l6-rollback-policy';
import {
  L6FamilyEnablementState,
  decideFamilyEnablement,
} from '../rollout/l6-family-enablement';
import {
  L6CertificationBand,
  L6CertificationLevel,
} from '../certification/l6-certification-level';
import {
  L6BandOutcome,
  L6InvariantOutcome,
  buildCertificationArtifact,
} from '../certification/l6-certification-report';
import {
  L6MigrationClass,
  classifyContractMigration,
  L6ContractMigrationAttempt,
} from '../migration/l6-contract-migration';
import {
  gateContractMigration,
} from '../migration/l6-compatibility-gate';
import {
  isObservabilityPackageComplete,
  generateObservabilityReport,
  zeroToleranceSlos,
} from '../ops/l6-observability-report';
import { L6MetricId } from '../ops/l6-metrics';

export interface L6_8InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ---------- fixture helpers ----------

function buildAllBandsGreenOutcomes(): readonly L6BandOutcome[] {
  return Object.values(L6CertificationBand).map((b): L6BandOutcome => ({
    band: b,
    passed: 1, failed: 0, duration_ms: 1, ok: true,
    blocking_violations: [],
  }));
}

function buildOneBandFailedOutcomes(
  failed: L6CertificationBand,
): readonly L6BandOutcome[] {
  return Object.values(L6CertificationBand).map((b): L6BandOutcome => b === failed
    ? { band: b, passed: 0, failed: 1, duration_ms: 1, ok: false, blocking_violations: ['forced_failure'] }
    : { band: b, passed: 1, failed: 0, duration_ms: 1, ok: true, blocking_violations: [] });
}

function emptyInvariantSet(): readonly L6InvariantOutcome[] {
  return [{ id: 'self', holds: true, evidence: 'ok' }];
}

// ---------- INV-6.8-A ----------

export function checkINV_68_A(): L6_8InvariantResult {
  // Any phase past A requires at least prerequisites. If we try to advance
  // without prerequisites or without attested deliverables, the gate must
  // refuse deterministically.
  const attempts: readonly [L6RolloutPhase, boolean][] = [
    [L6RolloutPhase.B_DEPENDENCY_AND_TEMPORAL, false],
    [L6RolloutPhase.F_PERSISTENCE_AND_EVIDENCE, false],
    [L6RolloutPhase.H_FINAL_ASSURANCE, false],
  ];

  for (const [p] of attempts) {
    const missingPrereq = canAdvancePhase(p, new Set(), {
      deliverables_complete: true,
      exit_criteria_met: true,
      certification_bands_green_for_phase: true,
    });
    if (missingPrereq.ok) {
      return { id: 'INV-6.8-A', name: 'no phase advancement without exit criteria', holds: false,
               evidence: `phase ${p} advanced without prerequisites` };
    }
    const completed = new Set(L6_ROLLOUT_PHASE_SPECS[p].prerequisites);
    const missingExit = canAdvancePhase(p, completed, {
      deliverables_complete: true,
      exit_criteria_met: false,
      certification_bands_green_for_phase: true,
    });
    if (missingExit.ok) {
      return { id: 'INV-6.8-A', name: 'no phase advancement without exit criteria', holds: false,
               evidence: `phase ${p} advanced without exit criteria` };
    }
    const missingBands = canAdvancePhase(p, completed, {
      deliverables_complete: true,
      exit_criteria_met: true,
      certification_bands_green_for_phase: false,
    });
    if (missingBands.ok) {
      return { id: 'INV-6.8-A', name: 'no phase advancement without exit criteria', holds: false,
               evidence: `phase ${p} advanced without green bands` };
    }
    if (!prerequisitesSatisfied(p, completed)) {
      return { id: 'INV-6.8-A', name: 'no phase advancement without exit criteria', holds: false,
               evidence: `prerequisites broken for ${p}` };
    }
  }

  return { id: 'INV-6.8-A', name: 'no phase advancement without exit criteria', holds: true,
           evidence: 'all phase transitions gated' };
}

// ---------- INV-6.8-B ----------

export function checkINV_68_B(): L6_8InvariantResult {
  const bands = buildAllBandsGreenOutcomes();
  const obsOk = generateObservabilityReport({});
  const decisionWithoutCert = evaluateRolloutGate({
    target_phase: L6RolloutPhase.H_FINAL_ASSURANCE,
    completed_phases: new Set(L6_ROLLOUT_PHASE_SPECS[L6RolloutPhase.H_FINAL_ASSURANCE].prerequisites),
    attested: { deliverables_complete: true, exit_criteria_met: true, certification_bands_green_for_phase: true },
    certification: null,
    observability: obsOk,
    requires_production_green: true,
  });
  if (decisionWithoutCert.advance) {
    return { id: 'INV-6.8-B', name: 'no rollout without certification artifact', holds: false,
             evidence: 'gate advanced with null certification' };
  }

  const cert = buildCertificationArtifact({
    certification_run_id: 'run-inv-b',
    layer_version_set: { L6: 'v1' },
    bands, invariants: emptyInvariantSet(),
    golden_corpus_hash: 'h:inv-b',
    replay_integrity_ok: true, load_concurrency_ok: true,
    migration_ok: true, observability_ok: true,
  });
  const decisionWithCert = evaluateRolloutGate({
    target_phase: L6RolloutPhase.H_FINAL_ASSURANCE,
    completed_phases: new Set(L6_ROLLOUT_PHASE_SPECS[L6RolloutPhase.H_FINAL_ASSURANCE].prerequisites),
    attested: { deliverables_complete: true, exit_criteria_met: true, certification_bands_green_for_phase: true },
    certification: cert,
    observability: obsOk,
    requires_production_green: true,
  });
  if (!decisionWithCert.advance) {
    return { id: 'INV-6.8-B', name: 'no rollout without certification artifact', holds: false,
             evidence: `gate blocked with green cert: ${decisionWithCert.reasons.join('|')}` };
  }
  return { id: 'INV-6.8-B', name: 'no rollout without certification artifact', holds: true,
           evidence: 'gate requires certification artifact' };
}

// ---------- INV-6.8-C ----------

export function checkINV_68_C(): L6_8InvariantResult {
  const autoAttempt: L6ContractMigrationAttempt = {
    attempt_id: 'mig.auto',
    target_kind: 'FEATURE_CONTRACT',
    target_id: 'market.return_1h',
    from_version: '1.0.0', to_version: '1.0.1',
    declared_class: L6MigrationClass.PATCH_COMPATIBLE,
    historical_meaning_preserved: true,
    replay_compatible: true,
    migration_notes: 'bugfix',
  };
  const autoDecision = gateContractMigration(autoAttempt);
  if (autoDecision.gate !== 'AUTO' || !autoDecision.allowed) {
    return { id: 'INV-6.8-C', name: 'no migration without compatibility check', holds: false,
             evidence: `auto patch migration was rejected: ${autoDecision.gate}` };
  }

  const badAttempt: L6ContractMigrationAttempt = {
    ...autoAttempt,
    attempt_id: 'mig.bad',
    historical_meaning_preserved: false,
  };
  const badResult = classifyContractMigration(badAttempt);
  if (badResult.allowed) {
    return { id: 'INV-6.8-C', name: 'no migration without compatibility check', holds: false,
             evidence: 'migration violating historical meaning was allowed' };
  }
  const badGate = gateContractMigration(badAttempt);
  if (badGate.gate !== 'BLOCK') {
    return { id: 'INV-6.8-C', name: 'no migration without compatibility check', holds: false,
             evidence: `migration gate did not block: ${badGate.gate}` };
  }

  const retirementAttempt: L6ContractMigrationAttempt = {
    ...autoAttempt,
    attempt_id: 'mig.retire',
    declared_class: L6MigrationClass.RETIREMENT,
    to_version: 'RETIRED',
  };
  const retireGate = gateContractMigration(retirementAttempt);
  if (retireGate.gate !== 'BLOCK') {
    return { id: 'INV-6.8-C', name: 'no migration without compatibility check', holds: false,
             evidence: `retirement did not escalate to BLOCK: ${retireGate.gate}` };
  }

  return { id: 'INV-6.8-C', name: 'no migration without compatibility check', holds: true,
           evidence: 'compatibility gate classifies and blocks' };
}

// ---------- INV-6.8-D ----------

export function checkINV_68_D(): L6_8InvariantResult {
  const badPlan = {
    plan_id: 'rbk.bad', mode: 'FAMILY_DISABLE' as const,
    target_kind: 'FEATURE_FAMILY' as const, target_id: 'MARKET',
    preserves_history: false as any,
    keeps_lineage_visible: true as const,
    approval_required: false, notes: '',
  } as unknown as L6RollbackPlan;
  try {
    executeRollback(badPlan, 'operator');
    return { id: 'INV-6.8-D', name: 'no rollback without lineage preservation', holds: false,
             evidence: 'rollback permitted without preserves_history' };
  } catch {
    // expected
  }
  const goodPlan: L6RollbackPlan = {
    plan_id: 'rbk.good', mode: 'FAMILY_DISABLE' as any,
    target_kind: 'FEATURE_FAMILY', target_id: 'MARKET',
    preserves_history: true,
    keeps_lineage_visible: true,
    approval_required: false,
    notes: 'canary failure',
  };
  const rec = executeRollback(goodPlan, 'operator');
  if (!rec.lineage_preserved || rec.historical_rows_touched !== 0) {
    return { id: 'INV-6.8-D', name: 'no rollback without lineage preservation', holds: false,
             evidence: 'legal rollback did not preserve lineage' };
  }
  return { id: 'INV-6.8-D', name: 'no rollback without lineage preservation', holds: true,
           evidence: 'illegal rollback blocked; legal rollback preserves history' };
}

// ---------- INV-6.8-E ----------

export function checkINV_68_E(): L6_8InvariantResult {
  const ctxGreen = {
    certification_runtime_green_or_higher: true,
    observability_ok: true,
    earlier_families_at_least: L6FamilyEnablementState.PRODUCTION,
  };
  const ctxRedCert = { ...ctxGreen, certification_runtime_green_or_higher: false };
  const ctxRedObs = { ...ctxGreen, observability_ok: false };

  const goodDecision = decideFamilyEnablement(
    L6FamilyEnablementState.CANARY_CURRENT,
    L6FamilyEnablementState.PRODUCTION,
    ctxGreen,
  );
  if (!goodDecision.ok) {
    return { id: 'INV-6.8-E', name: 'no production enablement if critical assurance bands fail', holds: false,
             evidence: `green-ctx production blocked: ${goodDecision.reason}` };
  }

  const certBlocked = decideFamilyEnablement(
    L6FamilyEnablementState.CANARY_CURRENT,
    L6FamilyEnablementState.PRODUCTION,
    ctxRedCert,
  );
  if (certBlocked.ok) {
    return { id: 'INV-6.8-E', name: 'no production enablement if critical assurance bands fail', holds: false,
             evidence: 'production enabled without runtime-green certification' };
  }
  const obsBlocked = decideFamilyEnablement(
    L6FamilyEnablementState.CANARY_CURRENT,
    L6FamilyEnablementState.PRODUCTION,
    ctxRedObs,
  );
  if (obsBlocked.ok) {
    return { id: 'INV-6.8-E', name: 'no production enablement if critical assurance bands fail', holds: false,
             evidence: 'production enabled with observability critical breach' };
  }

  return { id: 'INV-6.8-E', name: 'no production enablement if critical assurance bands fail', holds: true,
           evidence: 'family enablement requires certification + observability green' };
}

// ---------- INV-6.8-F ----------

export function checkINV_68_F(): L6_8InvariantResult {
  const artifact = buildCertificationArtifact({
    certification_run_id: 'run-inv-f',
    layer_version_set: { L6: 'v1' },
    bands: buildOneBandFailedOutcomes(L6CertificationBand.G_LOAD_AND_CONCURRENCY),
    invariants: emptyInvariantSet(),
    golden_corpus_hash: 'h:inv-f',
    replay_integrity_ok: true, load_concurrency_ok: false,
    migration_ok: true, observability_ok: true,
  });
  const required: (keyof typeof artifact)[] = [
    'certification_run_id', 'emitted_at', 'layer_version_set', 'bands', 'invariants',
    'golden_corpus_hash', 'replay_integrity_ok', 'load_concurrency_ok', 'migration_ok',
    'observability_ok', 'level', 'rollout_recommended', 'blocking_violations',
  ];
  for (const k of required) {
    if ((artifact as any)[k] === undefined) {
      return { id: 'INV-6.8-F', name: 'certification artifact contains all required fields', holds: false,
               evidence: `missing field ${String(k)}` };
    }
  }
  if (artifact.level === L6CertificationLevel.PRODUCTION_GREEN || artifact.rollout_recommended) {
    return { id: 'INV-6.8-F', name: 'certification artifact contains all required fields', holds: false,
             evidence: 'failing band did not downgrade level' };
  }
  if (artifact.blocking_violations.length === 0) {
    return { id: 'INV-6.8-F', name: 'certification artifact contains all required fields', holds: false,
             evidence: 'failing band did not surface blocking violation' };
  }
  return { id: 'INV-6.8-F', name: 'certification artifact contains all required fields', holds: true,
           evidence: 'artifact surface complete and band failure downgrades level' };
}

// ---------- INV-6.8-G ----------

export function checkINV_68_G(): L6_8InvariantResult {
  const completeness = isObservabilityPackageComplete();
  if (!completeness.ok) {
    return { id: 'INV-6.8-G', name: 'observability package complete and zero-tolerance breaches critical', holds: false,
             evidence: `missing categories: ${completeness.missing_categories.join(',')}` };
  }
  const ztSlos = zeroToleranceSlos();
  if (ztSlos.length < 3) {
    return { id: 'INV-6.8-G', name: 'observability package complete and zero-tolerance breaches critical', holds: false,
             evidence: `too few zero-tolerance SLOs: ${ztSlos.length}` };
  }
  const breached = generateObservabilityReport({
    [L6MetricId.REPLAY_MISMATCH_COUNT]: 3,
  });
  if (!breached.critical_breach || breached.ok) {
    return { id: 'INV-6.8-G', name: 'observability package complete and zero-tolerance breaches critical', holds: false,
             evidence: 'replay mismatch did not register as critical' };
  }
  return { id: 'INV-6.8-G', name: 'observability package complete and zero-tolerance breaches critical', holds: true,
           evidence: 'observability complete; zero-tolerance SLOs surface as critical' };
}

export function checkAllL6_8Invariants(): readonly L6_8InvariantResult[] {
  return [
    checkINV_68_A(),
    checkINV_68_B(),
    checkINV_68_C(),
    checkINV_68_D(),
    checkINV_68_E(),
    checkINV_68_F(),
    checkINV_68_G(),
  ];
}

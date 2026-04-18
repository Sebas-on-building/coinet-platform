/**
 * L7.8 — Failure Playbooks
 *
 * §7.8.6.5 — Explicit, not tribal. Every critical failure class has a
 * declared first-actions list, verification steps, and escalation path.
 * The assurance tests verify each listed failure class has a runbook
 * entry so ops does not discover gaps during incidents.
 */

export enum L7FailureClass {
  REPLAY_MISMATCH = 'REPLAY_MISMATCH',
  CONTRADICTION_BUNDLE_CORRUPTION = 'CONTRADICTION_BUNDLE_CORRUPTION',
  CURRENT_HISTORICAL_DIVERGENCE = 'CURRENT_HISTORICAL_DIVERGENCE',
  MISSING_EVIDENCE_ARCHIVE_POINTER = 'MISSING_EVIDENCE_ARCHIVE_POINTER',
  ILLEGAL_FAMILY_ROLLOUT_ATTEMPT = 'ILLEGAL_FAMILY_ROLLOUT_ATTEMPT',
  SEMANTIC_MIGRATION_MISCLASSIFICATION = 'SEMANTIC_MIGRATION_MISCLASSIFICATION',
  SHADOW_AUTHORITY_DETECTED = 'SHADOW_AUTHORITY_DETECTED',
  DOWNSTREAM_RAW_REBUILD_DETECTED = 'DOWNSTREAM_RAW_REBUILD_DETECTED',
  CLEAN_CONFIDENCE_ADMITTED = 'CLEAN_CONFIDENCE_ADMITTED',
}

export const ALL_L7_FAILURE_CLASSES: readonly L7FailureClass[] =
  Object.values(L7FailureClass);

export interface L7FailurePlaybook {
  readonly playbook_id: string;
  readonly failure_class: L7FailureClass;
  readonly first_actions: readonly string[];
  readonly verification_steps: readonly string[];
  readonly escalation_path: readonly string[];
  readonly runbook_ref: string;
}

export const L7_FAILURE_PLAYBOOKS: readonly L7FailurePlaybook[] = Object.freeze([
  {
    playbook_id: 'pb.l7.replay_mismatch',
    failure_class: L7FailureClass.REPLAY_MISMATCH,
    first_actions: [
      'pin affected family to REPLAY_ONLY_MODE',
      'snapshot divergent replay hashes',
      'block current-state materialization for affected scopes',
    ],
    verification_steps: [
      'diff bounded to known migration window',
      'no historical row silently rewritten',
    ],
    escalation_path: ['on-call L7', 'L7 contract owner', 'L5 storage lead'],
    runbook_ref: 'RB-L7-REPLAY-MISMATCH',
  },
  {
    playbook_id: 'pb.l7.contradiction_bundle_corruption',
    failure_class: L7FailureClass.CONTRADICTION_BUNDLE_CORRUPTION,
    first_actions: [
      'halt contradiction materializer',
      'freeze current validation rows referencing corrupt bundles',
      'enqueue repair-only recompute',
    ],
    verification_steps: [
      'no CONFIRMED verdict references a missing bundle',
      'contradiction read surface errors fall to zero',
    ],
    escalation_path: ['on-call L7', 'L7 contradiction owner'],
    runbook_ref: 'RB-L7-CONTRADICTION-CORRUPTION',
  },
  {
    playbook_id: 'pb.l7.current_historical_divergence',
    failure_class: L7FailureClass.CURRENT_HISTORICAL_DIVERGENCE,
    first_actions: [
      'freeze current-state writes for affected family',
      'identify drift start from transition log',
      'plan lineage-preserving supersession',
    ],
    verification_steps: [
      'current state = latest historical row after supersession',
      'no silent overwrites recorded',
    ],
    escalation_path: ['on-call L7', 'L5 coordination'],
    runbook_ref: 'RB-L7-CURRENT-HISTORICAL-DIVERGE',
  },
  {
    playbook_id: 'pb.l7.missing_evidence_archive',
    failure_class: L7FailureClass.MISSING_EVIDENCE_ARCHIVE_POINTER,
    first_actions: [
      'halt affected materializer',
      'failover archive target',
      'flag validations pending evidence',
    ],
    verification_steps: ['no orphan packs', 'all pointers have checksums'],
    escalation_path: ['on-call L7', 'L5 storage lead'],
    runbook_ref: 'RB-L7-EVIDENCE-MISSING',
  },
  {
    playbook_id: 'pb.l7.illegal_rollout',
    failure_class: L7FailureClass.ILLEGAL_FAMILY_ROLLOUT_ATTEMPT,
    first_actions: [
      'block enable request',
      'log attempt in assurance audit',
      'verify prerequisite family state',
    ],
    verification_steps: [
      'rollout gate rejected the enable request',
      'no family advanced out of order',
    ],
    escalation_path: ['on-call L7', 'rollout coordinator'],
    runbook_ref: 'RB-L7-ROLLOUT-ILLEGAL',
  },
  {
    playbook_id: 'pb.l7.migration_misclassification',
    failure_class: L7FailureClass.SEMANTIC_MIGRATION_MISCLASSIFICATION,
    first_actions: [
      'revert to prior contract version',
      'freeze migration gate',
      'reclassify migration',
    ],
    verification_steps: [
      'replay stable on prior version',
      'new version namespace assigned for breaking change',
    ],
    escalation_path: ['L7 contract owner', 'L7 migration reviewer'],
    runbook_ref: 'RB-L7-MIGRATION-MISCLASSIFIED',
  },
  {
    playbook_id: 'pb.l7.shadow_authority',
    failure_class: L7FailureClass.SHADOW_AUTHORITY_DETECTED,
    first_actions: [
      'block offending writer path',
      'audit Redis keyspace for authoritative-looking writes',
      'scan for non-POSTGRES current-state mutations',
    ],
    verification_steps: [
      'no current row sourced from Redis',
      'authority-store validator passes for all writes',
    ],
    escalation_path: ['on-call L7', 'L5 storage lead'],
    runbook_ref: 'RB-L7-SHADOW-AUTHORITY',
  },
  {
    playbook_id: 'pb.l7.downstream_raw_rebuild',
    failure_class: L7FailureClass.DOWNSTREAM_RAW_REBUILD_DETECTED,
    first_actions: [
      'block offending consumer via downstream-consumption validator',
      'audit consumer class and mode',
      'notify L8 owner',
    ],
    verification_steps: [
      'no live consumer bypasses L7 read surfaces',
      'replay/repair consumers remain declared',
    ],
    escalation_path: ['on-call L7', 'L8 owner'],
    runbook_ref: 'RB-L7-DOWNSTREAM-RAW-REBUILD',
  },
  {
    playbook_id: 'pb.l7.clean_confidence_admitted',
    failure_class: L7FailureClass.CLEAN_CONFIDENCE_ADMITTED,
    first_actions: [
      'block confidence emission path',
      'force re-evaluation of confidence cap chain',
      'freeze affected downstream reliance',
    ],
    verification_steps: [
      'no confidence above blocking-contradiction ceiling',
      'cap chain recorded in evidence bundle',
    ],
    escalation_path: ['on-call L7', 'L7 confidence owner'],
    runbook_ref: 'RB-L7-CLEAN-CONFIDENCE',
  },
]);

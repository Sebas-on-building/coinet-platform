/**
 * L13.7 — Alert Output Contract
 *
 * §13.7.11 — An alert describes a meaningful governed change.
 * Must answer what changed, why it matters, what was affected,
 * whether trigger/invalidation activated, whether confidence /
 * readiness changed, what to watch — without becoming advice.
 */

/**
 * §13.7.11.3 — Alert class taxonomy.
 */
export enum L13AlertClass {
  SCENARIO_SHIFT = 'SCENARIO_SHIFT',
  TRIGGER_ACTIVATED = 'TRIGGER_ACTIVATED',
  INVALIDATION_ACTIVATED = 'INVALIDATION_ACTIVATED',
  CONFIDENCE_DEGRADED = 'CONFIDENCE_DEGRADED',
  SCORE_MEANING_SHIFT = 'SCORE_MEANING_SHIFT',
  HYPOTHESIS_RANK_SHIFT = 'HYPOTHESIS_RANK_SHIFT',
  CONTRADICTION_ESCALATION = 'CONTRADICTION_ESCALATION',
  MISSING_DATA_DEGRADATION = 'MISSING_DATA_DEGRADATION',
  DRIFT_ESCALATION = 'DRIFT_ESCALATION',
}

export const ALL_L13_ALERT_CLASSES: readonly L13AlertClass[] =
  Object.values(L13AlertClass);

/**
 * §13.7.11.4 — Alert severity taxonomy. Severity is
 * policy-driven, not prose-driven.
 */
export enum L13AlertSeverity {
  INFO = 'INFO',
  NOTICE = 'NOTICE',
  IMPORTANT = 'IMPORTANT',
  CRITICAL = 'CRITICAL',
}

export const ALL_L13_ALERT_SEVERITIES: readonly L13AlertSeverity[] =
  Object.values(L13AlertSeverity);

/**
 * §13.7.11.2 — Per-alert confidence change profile. Tracks before
 * and after bands plus a short prose statement.
 */
export interface L13AlertConfidenceChangeProfile {
  readonly previous_band?: string;
  readonly current_band: string;
  readonly direction: 'WIDENED' | 'NARROWED' | 'UNCHANGED';
  readonly statement: string;
}

/**
 * §13.7.11.2 — Per-alert readiness change profile.
 */
export interface L13AlertReadinessChangeProfile {
  readonly previous_class?: string;
  readonly current_class: string;
  readonly direction: 'WIDENED' | 'NARROWED' | 'UNCHANGED';
  readonly statement: string;
}

export interface L13AlertOutput {
  readonly alert_output_id: string;

  readonly output_id: string;
  readonly input_package_id: string;

  readonly alert_class: L13AlertClass;
  readonly alert_severity: L13AlertSeverity;

  readonly changed_subject_ref: string;
  readonly previous_state_ref?: string;
  readonly current_state_ref: string;

  readonly what_changed: string;
  readonly why_it_matters: string;

  readonly affected_scenario_refs: readonly string[];
  readonly affected_hypothesis_refs: readonly string[];
  readonly affected_score_refs: readonly string[];
  readonly activated_trigger_refs: readonly string[];
  readonly activated_invalidation_refs: readonly string[];

  readonly confidence_change_profile:
    L13AlertConfidenceChangeProfile;
  readonly readiness_change_profile:
    L13AlertReadinessChangeProfile;

  readonly watch_next_lines: readonly string[];
  readonly restriction_disclosure_lines: readonly string[];
  readonly uncertainty_disclosure_lines: readonly string[];

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}

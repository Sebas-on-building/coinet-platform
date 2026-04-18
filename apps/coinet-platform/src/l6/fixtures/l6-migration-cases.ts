/**
 * L6.8 — Migration Cases
 *
 * §6.8.4.2 Band I, §6.8.6.4 — Contract and family migration scenarios.
 * Each case declares compatibility class so `l6-compatibility-gate.ts`
 * can mechanically decide whether rollout is allowed.
 */

import { L6MigrationClass } from '../migration/l6-contract-migration';

export interface L6MigrationCase {
  readonly case_id: string;
  readonly target_kind: 'FEATURE_CONTRACT' | 'EVENT_CONTRACT' | 'FEATURE_FAMILY' | 'EVENT_FAMILY';
  readonly target_id: string;
  readonly from_version: string;
  readonly to_version: string;
  readonly class: L6MigrationClass;
  readonly historical_meaning_preserved: boolean;
  readonly replay_compatible: boolean;
  readonly required_gate: 'AUTO' | 'REVIEW' | 'BLOCK';
  readonly notes: string;
}

export const MIGRATION_CASES: readonly L6MigrationCase[] = Object.freeze([
  {
    case_id: 'mig.market.ret.patch',
    target_kind: 'FEATURE_CONTRACT',
    target_id: 'market.return_1h',
    from_version: '1.0.0',
    to_version: '1.0.1',
    class: L6MigrationClass.PATCH_COMPATIBLE,
    historical_meaning_preserved: true,
    replay_compatible: true,
    required_gate: 'AUTO',
    notes: 'Bug fix in edge case; replay hashes unchanged.',
  },
  {
    case_id: 'mig.funding.minor_add',
    target_kind: 'FEATURE_CONTRACT',
    target_id: 'deriv.funding_zscore',
    from_version: '1.0.0',
    to_version: '1.1.0',
    class: L6MigrationClass.MINOR_ADDITIVE,
    historical_meaning_preserved: true,
    replay_compatible: true,
    required_gate: 'REVIEW',
    notes: 'Added optional annualization flag; default preserves old semantics.',
  },
  {
    case_id: 'mig.whale_event.minor_semantic',
    target_kind: 'EVENT_CONTRACT',
    target_id: 'event.whale_accum_cluster',
    from_version: '1.0.0',
    to_version: '1.1.0',
    class: L6MigrationClass.MINOR_SEMANTIC_PRESERVED,
    historical_meaning_preserved: true,
    replay_compatible: true,
    required_gate: 'REVIEW',
    notes: 'Refined suppression rules; historical firings re-verified.',
  },
  {
    case_id: 'mig.narrative.major_break',
    target_kind: 'FEATURE_FAMILY',
    target_id: 'NARRATIVE',
    from_version: '1.0.0',
    to_version: '2.0.0',
    class: L6MigrationClass.MAJOR_SEMANTIC_BREAK,
    historical_meaning_preserved: false,
    replay_compatible: false,
    required_gate: 'BLOCK',
    notes: 'Scoring re-derived; MUST be staged as new version, not replace old.',
  },
  {
    case_id: 'mig.deprecate_legacy_event',
    target_kind: 'EVENT_FAMILY',
    target_id: 'LEGACY_FOO',
    from_version: '1.0.0',
    to_version: 'DEPRECATED',
    class: L6MigrationClass.DEPRECATION,
    historical_meaning_preserved: true,
    replay_compatible: true,
    required_gate: 'REVIEW',
    notes: 'Stop emitting; keep history readable.',
  },
  {
    case_id: 'mig.retire_event',
    target_kind: 'EVENT_FAMILY',
    target_id: 'LEGACY_FOO',
    from_version: 'DEPRECATED',
    to_version: 'RETIRED',
    class: L6MigrationClass.RETIREMENT,
    historical_meaning_preserved: true,
    replay_compatible: true,
    required_gate: 'BLOCK',
    notes: 'Registry archived; history remains for replay but no new writes.',
  },
]);

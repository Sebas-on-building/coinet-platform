/**
 * L7.3 — Validation Output Contract
 *
 * §7.3.3 — The executable verdict object. Every field required by
 * §7.3.3.2 and §7.3.3.3 is typed here; the validator (L7.3) enforces
 * the runtime cleanliness law (§7.3.3.7).
 */

import type {
  L7ValidationClass,
  L7ValidationModifier,
} from './validation-output-class';
import type { L7ConfidenceBand } from './confidence-assessment';
import type {
  L7RuntimeStatusClass,
  L7ReplayIdentityMode,
} from './validation-runtime-status';
import type { L7ClaimRestrictionProfileContract } from './restriction-profile.contract';

export type L7LateDataClass =
  | 'NONE'
  | 'LATE_MINOR'
  | 'LATE_MATERIAL'
  | 'LATE_CRITICAL';

export interface L7RuntimeIntegrityFlags {
  readonly input_snapshot_hash_match: boolean;
  readonly contract_version_match: boolean;
  readonly replay_hash_stable: boolean;
  readonly evidence_refs_resolvable: boolean;
  readonly subject_contract_resolvable: boolean;
}

export interface L7ValidationOutputContract {
  // Identity
  readonly validation_result_id: string;
  readonly validation_subject_id: string;
  readonly subject_contract_ref: string;

  // Contract versioning (§7.3.3.3)
  readonly validation_contract_version: string;
  readonly schema_version: string;

  // Claim lineage
  readonly claim_family: string;
  readonly claim_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  // Verdict (§7.3.3.4)
  readonly validation_class: L7ValidationClass;
  readonly validation_modifiers: readonly L7ValidationModifier[];
  readonly validation_status: L7RuntimeStatusClass;

  // Score profile (§7.3.3.2)
  readonly support_strength_score: number;
  readonly contradiction_severity_score: number;
  readonly incompleteness_score: number;
  readonly staleness_score: number;
  readonly ambiguity_score: number;
  readonly degradation_score: number;

  // Confidence snapshot (§7.3.3.2)
  readonly confidence_score: number;
  readonly confidence_band: L7ConfidenceBand;
  readonly confidence_assessment_ref: string;

  // Contradiction (§7.3.3.2)
  readonly contradiction_bundle_ref: string | null;

  // Support + evidence (§7.3.3.2)
  readonly support_refs: readonly string[];
  readonly evidence_pack_ref: string | null;
  readonly input_snapshot_ref: string | null;

  // Restriction profile (§7.3.6.5) — embedded or linked (never ambiguous)
  readonly restriction_profile: L7ClaimRestrictionProfileContract | null;
  readonly restriction_profile_ref: string | null;

  // Materialization and replay (§7.3.3.3)
  readonly materialization_mode: 'EAGER' | 'ON_DEMAND' | 'REPLAY_ONLY';
  readonly replay_mode_flag: L7ReplayIdentityMode;
  readonly repair_mode_flag: boolean;
  readonly late_data_class: L7LateDataClass;

  // Replay identity
  readonly compute_run_id: string;
  readonly replay_hash: string;
  readonly runtime_integrity_flags: L7RuntimeIntegrityFlags;

  // Lineage
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
}

export const L7_OUTPUT_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'validation_result_id', 'validation_subject_id', 'subject_contract_ref',
  'validation_contract_version', 'schema_version',
  'claim_family', 'claim_version', 'scope_type', 'scope_id', 'as_of',
  'validation_class', 'validation_modifiers', 'validation_status',
  'support_strength_score', 'contradiction_severity_score',
  'incompleteness_score', 'staleness_score', 'ambiguity_score', 'degradation_score',
  'confidence_score', 'confidence_band', 'confidence_assessment_ref',
  'materialization_mode', 'replay_mode_flag',
  'compute_run_id', 'replay_hash', 'runtime_integrity_flags',
  'lineage_refs',
];

/**
 * §7.3.3.5 — An output is illegal if contradiction is claimed but no bundle
 * exists. This helper centralises that check.
 */
export function outputRequiresContradictionBundle(
  o: Pick<L7ValidationOutputContract, 'contradiction_severity_score' | 'validation_class' | 'validation_modifiers'>,
): boolean {
  if (o.contradiction_severity_score > 0) return true;
  const cls = o.validation_class as string;
  if (cls === 'CONFLICTING' || cls === 'DEGRADED') return true;
  if (o.validation_modifiers.some(m => m === 'UNRESOLVED_CONTRADICTION_PRESENT')) return true;
  return false;
}

/**
 * §7.3.3.7 — cleanliness law. Output must not be CLEAN when any score
 * is materially active or a cleanliness flag is set.
 */
export function outputViolatesCleanliness(
  o: Pick<
    L7ValidationOutputContract,
    | 'validation_status'
    | 'staleness_score'
    | 'incompleteness_score'
    | 'ambiguity_score'
    | 'degradation_score'
    | 'contradiction_severity_score'
    | 'validation_modifiers'
  >,
  thresholds = {
    stalenessMaterial: 0.25,
    incompletenessMaterial: 0.25,
    ambiguityMaterial: 0.25,
    degradationMaterial: 0.25,
    contradictionMaterial: 0.25,
  },
): boolean {
  if (o.validation_status !== 'CLEAN') return false;
  if (o.staleness_score > thresholds.stalenessMaterial) return true;
  if (o.incompleteness_score > thresholds.incompletenessMaterial) return true;
  if (o.ambiguity_score > thresholds.ambiguityMaterial) return true;
  if (o.degradation_score > thresholds.degradationMaterial) return true;
  if (o.contradiction_severity_score > thresholds.contradictionMaterial) return true;
  if (
    o.validation_modifiers.some(
      m =>
        m === 'STALE_SUPPORT_PRESENT' ||
        m === 'INCOMPLETE_SUPPORT_PRESENT' ||
        m === 'AMBIGUOUS_DIRECTION_PRESENT' ||
        m === 'DEGRADED_SOURCE_PRESENT' ||
        m === 'UNRESOLVED_CONTRADICTION_PRESENT',
    )
  ) {
    return true;
  }
  return false;
}

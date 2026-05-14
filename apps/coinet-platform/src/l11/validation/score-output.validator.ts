/**
 * L11.2 — Score Output Validator (§11.2.9 / §11.2.11 / §11.2.18)
 *
 * The strongest validator in L11.2. Operates on a complete
 * `L11ScoreOutput` and returns every doctrine issue that would block
 * emission. Cross-checks numeric bounds, transformation legality,
 * band correctness, replay-hash determinism, family-specific
 * disclosure requirements, and reserved-family embargo.
 */

import {
  L11ScoreOutput,
  isL11ScoreInBounds,
  isL11ScoreTransformationConsistent,
  extractL11ReplayMaterial,
  canonicalScoreOutputReplayHash,
} from '../contracts/score-output';
import {
  resolveL11ScoreBand,
  L11_DEFAULT_BAND_THRESHOLDS,
} from '../contracts/score-band-policy';
import {
  L11ScoreFamily,
  isL11ProductionScoreFamily,
  isL11ReservedScoreFamily,
} from '../contracts/score-family';
import {
  L11_REQUIRED_DIRECTION_BY_FAMILY,
} from '../contracts/score-direction';
import {
  L11ScoreProductionStatus,
} from '../contracts/score-production-status';
import {
  L11ScoreDisclosureRequirement,
} from '../contracts/score-meaning-claim';
import {
  L11ScoreFamilyDefinition,
  getL11ScoreFamilyDefinition,
} from '../contracts/score-family-catalogue';
import {
  L11ScoreDoctrineIssue,
  L11ScoreDoctrineViolationCode,
  makeL11ScoreDoctrineIssue,
} from './l11-score-doctrine-violation-codes';

export interface L11ScoreOutputValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreDoctrineIssue[];
}

function check(field: unknown): boolean {
  return field !== null && field !== undefined && (typeof field !== 'string' || field.trim() !== '');
}

export function validateL11ScoreOutput(o: L11ScoreOutput): L11ScoreOutputValidationResult {
  const issues: L11ScoreDoctrineIssue[] = [];
  const subj = `score:${o.score_id || '<missing>'}`;
  const family = o.score_family;

  // ── Identity ──
  if (!check(o.score_id)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_SCORE_IDENTITY_MISSING, 'score_id missing', subj, family));
  }
  if (!check(o.score_name)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_SCORE_IDENTITY_MISSING, 'score_name missing', subj, family));
  }
  if (!check(o.score_version)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_SCORE_VERSION_MISSING, 'score_version missing', subj, family));
  }
  if (!family || (!isL11ProductionScoreFamily(family) && !isL11ReservedScoreFamily(family))) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_FAMILY_UNREGISTERED, `unknown score_family ${family}`, subj, family));
  }

  // ── Scope/time ──
  if (!check(o.scope_type)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_SCORE_SCOPE_MISSING, 'scope_type missing', subj, family));
  }
  if (!check(o.scope_id)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_SCORE_SCOPE_MISSING, 'scope_id missing', subj, family));
  }
  if (!check(o.as_of)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_SCORE_AS_OF_MISSING, 'as_of missing', subj, family));
  }

  // ── Production-status / reserved-family embargo ──
  const def: L11ScoreFamilyDefinition | undefined = family
    ? getL11ScoreFamilyDefinition(family)
    : undefined;
  if (def) {
    if (def.production_status === L11ScoreProductionStatus.RESERVED) {
      issues.push(make(L11ScoreDoctrineViolationCode.L11D_RESERVED_FAMILY_EMITTED,
        `reserved family ${family} may not emit production score outputs`, subj, family));
    } else if (def.production_status === L11ScoreProductionStatus.EXPERIMENTAL_BLOCKED) {
      issues.push(make(L11ScoreDoctrineViolationCode.L11D_EXPERIMENTAL_FAMILY_EMITTED,
        `experimental-blocked family ${family} may not emit production score outputs`, subj, family));
    } else if (def.production_status === L11ScoreProductionStatus.DEPRECATED) {
      issues.push(make(L11ScoreDoctrineViolationCode.L11D_DEPRECATED_FAMILY_EMITTED,
        `deprecated family ${family} may not emit new production score outputs`, subj, family));
    }
  }

  // ── Numeric bounds (§11.2.11.2) ──
  if (!Number.isFinite(o.raw_score)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_SCORE_VALUE_NOT_FINITE, 'raw_score not finite', subj, family));
  } else if (!isL11ScoreInBounds(o.raw_score)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_RAW_SCORE_OUT_OF_RANGE,
      `raw_score ${o.raw_score} outside [0, 100]`, subj, family));
  }
  if (!Number.isFinite(o.modified_score)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_SCORE_VALUE_NOT_FINITE, 'modified_score not finite', subj, family));
  } else if (!isL11ScoreInBounds(o.modified_score)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_MODIFIED_SCORE_OUT_OF_RANGE,
      `modified_score ${o.modified_score} outside [0, 100]`, subj, family));
  }
  if (!Number.isFinite(o.final_score)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_SCORE_VALUE_NOT_FINITE, 'final_score not finite', subj, family));
  } else if (!isL11ScoreInBounds(o.final_score)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_FINAL_SCORE_OUT_OF_RANGE,
      `final_score ${o.final_score} outside [0, 100]`, subj, family));
  }

  // ── Transformation legality (§11.2.11.3) ──
  const xform = isL11ScoreTransformationConsistent(o);
  if (!xform.ok) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_TRANSFORMATION_INCONSISTENT, xform.reason, subj, family));
  }

  // ── Band consistency (§11.2.12) ──
  if (Number.isFinite(o.final_score) && isL11ScoreInBounds(o.final_score)) {
    const expectedBand = resolveL11ScoreBand(o.final_score, L11_DEFAULT_BAND_THRESHOLDS);
    if (!expectedBand) {
      issues.push(make(L11ScoreDoctrineViolationCode.L11D_SCORE_BAND_MISMATCH,
        `band could not be resolved for final_score ${o.final_score}`, subj, family));
    } else if (expectedBand !== o.score_band) {
      issues.push(make(L11ScoreDoctrineViolationCode.L11D_SCORE_BAND_MISMATCH,
        `band ${o.score_band} does not match final_score ${o.final_score} (expected ${expectedBand})`, subj, family));
    }
  }

  // ── Direction (§11.2.6) ──
  if (!o.direction_class) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_DIRECTION_MISSING, 'direction_class missing', subj, family));
  } else if (family) {
    const expected = L11_REQUIRED_DIRECTION_BY_FAMILY[family];
    if (o.direction_class !== expected) {
      issues.push(make(L11ScoreDoctrineViolationCode.L11D_DIRECTION_MISMATCH,
        `direction mismatch: expected ${expected}, got ${o.direction_class}`, subj, family));
    }
  }

  // ── Meaning ──
  if (!check(o.score_meaning_claim_ref)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_MISSING,
      'score_meaning_claim_ref missing', subj, family));
  }

  // ── Attribution & disclosures (§11.2.5 / §11.2.10 / §11.2.17) ──
  const noAttribution =
    o.positive_attribution_refs.length === 0 &&
    o.negative_attribution_refs.length === 0;
  if (noAttribution) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_ATTRIBUTION_MISSING,
      'score has neither positive nor negative attribution refs', subj, family));
  }

  if (!check(o.missing_data_profile_ref)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_MISSING_DATA_PROFILE_MISSING,
      'missing_data_profile_ref missing', subj, family));
  }
  if (!check(o.calibration_target_ref)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_CALIBRATION_TARGET_MISSING,
      'calibration_target_ref missing', subj, family));
  }
  if (!check(o.restriction_profile_ref)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_RESTRICTION_PROFILE_MISSING,
      'restriction_profile_ref missing', subj, family));
  }
  if (!check(o.evidence_pack_ref)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_EVIDENCE_PACK_MISSING,
      'evidence_pack_ref missing', subj, family));
  }
  if (!check(o.input_snapshot_ref)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_INPUT_SNAPSHOT_MISSING,
      'input_snapshot_ref missing', subj, family));
  }
  if (!check(o.compute_run_id)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_COMPUTE_RUN_MISSING,
      'compute_run_id missing', subj, family));
  }
  if (!check(o.policy_version)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_POLICY_VERSION_MISSING,
      'policy_version missing', subj, family));
  }

  // ── Replay (§11.2.18) ──
  if (!check(o.replay_hash)) {
    issues.push(make(L11ScoreDoctrineViolationCode.L11D_REPLAY_HASH_MISSING,
      'replay_hash missing', subj, family));
  } else {
    const expectedHash = canonicalScoreOutputReplayHash(extractL11ReplayMaterial(o));
    if (expectedHash !== o.replay_hash) {
      issues.push(make(L11ScoreDoctrineViolationCode.L11D_REPLAY_HASH_MISMATCH,
        `replay_hash mismatch (expected ${expectedHash}, got ${o.replay_hash})`, subj, family));
    }
  }

  // ── Family-specific disclosure requirements ──
  if (def && def.production_status === L11ScoreProductionStatus.PRODUCTION_ENABLED) {
    if (def.requires_regime_modifiers && o.regime_modifier_refs.length === 0) {
      issues.push(make(L11ScoreDoctrineViolationCode.L11D_REGIME_MODIFIER_MISSING,
        `family ${family} requires regime modifier refs`, subj, family));
    }
    if (def.requires_sequence_modifiers && o.sequence_modifier_refs.length === 0) {
      issues.push(make(L11ScoreDoctrineViolationCode.L11D_SEQUENCE_MODIFIER_MISSING,
        `family ${family} requires sequence modifier refs`, subj, family));
    }
    if (def.requires_hypothesis_modifiers && o.hypothesis_modifier_refs.length === 0) {
      issues.push(make(L11ScoreDoctrineViolationCode.L11D_HYPOTHESIS_MODIFIER_MISSING,
        `family ${family} requires hypothesis modifier refs`, subj, family));
    }
    if (def.requires_positive_attribution && o.positive_attribution_refs.length === 0) {
      issues.push(make(L11ScoreDoctrineViolationCode.L11D_ATTRIBUTION_MISSING,
        `family ${family} requires positive attribution refs`, subj, family));
    }
    if (def.requires_negative_attribution && o.negative_attribution_refs.length === 0) {
      issues.push(make(L11ScoreDoctrineViolationCode.L11D_ATTRIBUTION_MISSING,
        `family ${family} requires negative attribution refs`, subj, family));
    }
    if (def.requires_calibration_target && !check(o.calibration_target_ref)) {
      issues.push(make(L11ScoreDoctrineViolationCode.L11D_CALIBRATION_TARGET_MISSING,
        `family ${family} requires calibration target ref`, subj, family));
    }

    const requiredDisclosures = new Set<L11ScoreDisclosureRequirement>(
      def.required_disclosure_requirements,
    );
    if (
      requiredDisclosures.has(L11ScoreDisclosureRequirement.MISSING_DATA_PROFILE) &&
      !check(o.missing_data_profile_ref)
    ) {
      issues.push(make(L11ScoreDoctrineViolationCode.L11D_REQUIRED_DISCLOSURE_MISSING,
        'required disclosure MISSING_DATA_PROFILE absent', subj, family));
    }
    if (
      requiredDisclosures.has(L11ScoreDisclosureRequirement.RESTRICTION_POSTURE) &&
      !check(o.restriction_profile_ref)
    ) {
      issues.push(make(L11ScoreDoctrineViolationCode.L11D_REQUIRED_DISCLOSURE_MISSING,
        'required disclosure RESTRICTION_POSTURE absent', subj, family));
    }
    if (
      requiredDisclosures.has(L11ScoreDisclosureRequirement.EVIDENCE_PACK) &&
      !check(o.evidence_pack_ref)
    ) {
      issues.push(make(L11ScoreDoctrineViolationCode.L11D_REQUIRED_DISCLOSURE_MISSING,
        'required disclosure EVIDENCE_PACK absent', subj, family));
    }
    if (
      requiredDisclosures.has(L11ScoreDisclosureRequirement.CALIBRATION_TARGET) &&
      !check(o.calibration_target_ref)
    ) {
      issues.push(make(L11ScoreDoctrineViolationCode.L11D_REQUIRED_DISCLOSURE_MISSING,
        'required disclosure CALIBRATION_TARGET absent', subj, family));
    }
  }

  return { ok: issues.length === 0, issues };
}

function make(
  code: L11ScoreDoctrineViolationCode,
  msg: string,
  subj: string,
  family: L11ScoreFamily | undefined,
): L11ScoreDoctrineIssue {
  return makeL11ScoreDoctrineIssue(code, msg, {
    subject_ref: subj,
    score_family: family,
  });
}

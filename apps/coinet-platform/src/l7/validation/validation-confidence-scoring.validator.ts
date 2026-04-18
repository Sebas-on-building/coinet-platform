/**
 * L7.6 — Validation Confidence Scoring Validator
 *
 * §7.6.4.9 — Verifies that an `L7ValidationConfidenceDecision` is
 * legal under the L7.6 lawbook:
 *
 *   - factor completeness (every governed factor group present)
 *   - factor values within registered ranges
 *   - factor weights within max-legal envelopes
 *   - raw and capped scores within [0,100]
 *   - capped ≤ raw (truth-restrictive)
 *   - reliability band matches capped score
 *   - cap chain references only registered cap classes
 *   - contradiction-penalty present when contradiction count > 0
 *   - clean confidence does not masquerade past contradiction/staleness
 *     /incompleteness/ambiguity/degradation (§7.6.4.8)
 *   - replay hash + lineage refs present (§7.6.7.9)
 *   - policy version is registered (§7.6.3.9)
 */

import {
  L7ValidationConfidenceDecision,
  clamp01,
  clamp100,
} from '../contracts/validation-confidence.policy';
import {
  L7ConfidenceFactorGroup,
  L7_CONFIDENCE_FACTOR_DESCRIPTORS,
} from '../contracts/confidence-factor';
import {
  reliabilityBandForScore100,
  L7ReliabilityBand,
} from '../contracts/confidence-band';
import {
  L7ConfidenceFactorRegistry,
  getDefaultConfidenceFactorRegistry,
} from '../registry/confidence-factor.registry';
import {
  L7ConfidenceCapRegistry,
  getDefaultConfidenceCapRegistry,
} from '../registry/confidence-cap.registry';
import {
  L7ConfidencePolicyRegistry,
  getDefaultConfidencePolicyRegistry,
} from '../registry/confidence-policy.registry';
import {
  L7ConfidenceViolation,
  L7ConfidenceViolationCode,
} from './l7-confidence-violation-codes';

export interface L7ConfidenceScoringMaterialState {
  readonly contradiction_count: number;
  readonly contradiction_material: boolean;
  readonly staleness_material: boolean;
  readonly incompleteness_material: boolean;
  readonly ambiguity_material: boolean;
  readonly degradation_material: boolean;
}

export interface L7ConfidenceScoringValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L7ConfidenceViolation[];
}

export class L7ValidationConfidenceScoringValidator {
  constructor(
    private readonly factorRegistry: L7ConfidenceFactorRegistry = getDefaultConfidenceFactorRegistry(),
    private readonly capRegistry: L7ConfidenceCapRegistry = getDefaultConfidenceCapRegistry(),
    private readonly policyRegistry: L7ConfidencePolicyRegistry = getDefaultConfidencePolicyRegistry(),
  ) {}

  validate(
    decision: L7ValidationConfidenceDecision,
    state: L7ConfidenceScoringMaterialState,
  ): L7ConfidenceScoringValidationResult {
    const violations: L7ConfidenceViolation[] = [];
    const sid = decision.validation_subject_id;

    // Policy version registered.
    if (
      !this.policyRegistry.isRegistered(
        decision.policy_version.policy_id,
        decision.policy_version.policy_version,
      )
    ) {
      violations.push(
        v(
          L7ConfidenceViolationCode.CONFIDENCE_POLICY_VERSION_NOT_REGISTERED,
          sid,
          `policy ${decision.policy_version.policy_id}@${decision.policy_version.policy_version} not registered`,
        ),
      );
    }

    // Factor completeness + value ranges + weight legality.
    for (const d of L7_CONFIDENCE_FACTOR_DESCRIPTORS) {
      const v01 = decision.factor_breakdown.values[d.group];
      const w = decision.factor_breakdown.weights[d.group];
      if (typeof v01 !== 'number' || !isFinite(v01)) {
        violations.push(
          v(
            L7ConfidenceViolationCode.FACTOR_COMPONENT_MISSING,
            sid,
            `factor ${d.group} value missing`,
            { group: d.group },
          ),
        );
      } else if (!this.factorRegistry.isValueLegal(d.group, v01)) {
        violations.push(
          v(
            L7ConfidenceViolationCode.FACTOR_COMPONENT_OUT_OF_RANGE,
            sid,
            `factor ${d.group}=${v01} outside [${d.valueRange.min},${d.valueRange.max}]`,
            { group: d.group },
          ),
        );
      }
      if (typeof w !== 'number' || !isFinite(w)) {
        violations.push(
          v(
            L7ConfidenceViolationCode.FACTOR_WEIGHT_NOT_DECLARED,
            sid,
            `factor ${d.group} weight missing`,
            { group: d.group },
          ),
        );
      } else if (!this.factorRegistry.isWeightLegal(d.group, w)) {
        violations.push(
          v(
            L7ConfidenceViolationCode.FACTOR_WEIGHT_OUT_OF_RANGE,
            sid,
            `factor ${d.group} weight=${w} > max ${d.maxLegalWeight}`,
            { group: d.group },
          ),
        );
      }
    }

    // Raw + capped score legality.
    if (decision.raw_score_100 < 0 || decision.raw_score_100 > 100) {
      violations.push(
        v(
          L7ConfidenceViolationCode.RAW_SCORE_OUT_OF_RANGE,
          sid,
          `raw ${decision.raw_score_100} out of [0,100]`,
        ),
      );
    }
    if (decision.capped_score_100 < 0 || decision.capped_score_100 > 100) {
      violations.push(
        v(
          L7ConfidenceViolationCode.CAPPED_SCORE_OUT_OF_RANGE,
          sid,
          `capped ${decision.capped_score_100} out of [0,100]`,
        ),
      );
    }
    if (decision.capped_score_100 > decision.raw_score_100 + 1e-6) {
      violations.push(
        v(
          L7ConfidenceViolationCode.CAPPED_SCORE_EXCEEDS_RAW,
          sid,
          `capped ${decision.capped_score_100} > raw ${decision.raw_score_100}`,
        ),
      );
    }
    const expectedBand = reliabilityBandForScore100(
      decision.capped_score_100,
      decision.policy_version.band_thresholds,
    );
    if (expectedBand !== decision.reliability_band) {
      violations.push(
        v(
          L7ConfidenceViolationCode.BAND_DOES_NOT_MATCH_SCORE,
          sid,
          `band=${decision.reliability_band} expected ${expectedBand} for score=${decision.capped_score_100}`,
        ),
      );
    }

    // Cap chain entries reference only registered cap classes.
    for (const c of decision.cap_chain.evaluations) {
      if (!this.capRegistry.isRegistered(c.capClass)) {
        violations.push(
          v(
            L7ConfidenceViolationCode.CAP_CLASS_NOT_REGISTERED,
            sid,
            `cap ${c.capClass} not registered`,
            { cap: c.capClass },
          ),
        );
      }
    }

    // Contradiction penalty present when contradiction count > 0.
    if (
      state.contradiction_count > 0 &&
      decision.contradiction_penalty_chain.applied_magnitude === 0
    ) {
      violations.push(
        v(
          L7ConfidenceViolationCode.CONTRADICTION_PRESENT_NO_PENALTY,
          sid,
          `contradiction count=${state.contradiction_count} but penalty=0`,
        ),
      );
    }

    // §7.6.4.8 — clean confidence ban.
    const looksClean =
      decision.cap_chain.applied_cap_classes.length === 0 &&
      decision.contradiction_penalty_chain.applied_magnitude === 0;
    const materialIssue =
      state.contradiction_material ||
      state.staleness_material ||
      state.incompleteness_material ||
      state.ambiguity_material ||
      state.degradation_material;
    if (looksClean && materialIssue) {
      violations.push(
        v(
          L7ConfidenceViolationCode.CLEAN_CONFIDENCE_MASQUERADE,
          sid,
          'confidence appears clean but state has material caps/penalties pending',
        ),
      );
    }

    // Replay/lineage law.
    if (!decision.replay_hash) {
      violations.push(
        v(
          L7ConfidenceViolationCode.CONFIDENCE_REPLAY_HASH_MISSING,
          sid,
          'replay_hash empty',
        ),
      );
    }
    if (!decision.lineage_refs?.trace_id || !decision.lineage_refs?.manifest_id) {
      violations.push(
        v(
          L7ConfidenceViolationCode.CONFIDENCE_LINEAGE_INCOMPLETE,
          sid,
          'lineage refs incomplete',
        ),
      );
    }

    // §7.6.5.9 — restriction profile must be embedded or referenced.
    if (decision.restriction_profile_ref === null) {
      violations.push(
        v(
          L7ConfidenceViolationCode.RESTRICTION_PROFILE_REF_MISSING,
          sid,
          'restriction_profile_ref must be set before downstream emission',
        ),
      );
    }

    // sanity guards
    void clamp01;
    void clamp100;

    return { ok: violations.length === 0, violations };
  }
}

function v(
  code: L7ConfidenceViolationCode,
  subjectId: string,
  detail: string,
  context: Record<string, unknown> = {},
): L7ConfidenceViolation {
  return {
    code,
    source: 'validation-confidence-scoring.validator',
    subject_id: subjectId,
    factor_group: typeof context.group === 'string' ? context.group : null,
    cap_class: typeof context.cap === 'string' ? context.cap : null,
    right: typeof context.right === 'string' ? context.right : null,
    detail,
    context,
  };
}

export function isReliabilityBandValue(b: string): b is L7ReliabilityBand {
  return (
    b === L7ReliabilityBand.HIGH ||
    b === L7ReliabilityBand.MEDIUM ||
    b === L7ReliabilityBand.LOW ||
    b === L7ReliabilityBand.UNRESOLVED
  );
}

export function isFactorGroupValue(g: string): g is L7ConfidenceFactorGroup {
  return Object.values(L7ConfidenceFactorGroup).includes(g as L7ConfidenceFactorGroup);
}

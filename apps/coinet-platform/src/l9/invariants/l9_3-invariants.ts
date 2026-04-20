/**
 * L9.3 — Contract-Layer Invariants
 *
 * §9.3.10.1 — INV-9.3-A through INV-9.3-G, all executable and covered
 * by the certification suite.
 *
 *   INV-9.3-A : Every sequence subject contract declares identity,
 *               scope, inputs, temporal logic, sequence logic,
 *               confidence/restriction logic, and persistence posture.
 *   INV-9.3-B : Every sequence output contract carries identity,
 *               family/state, confidence, phase, decay, ordering
 *               refs, restriction posture, lineage, and replay.
 *   INV-9.3-C : Lead-lag relations and sequence chains are first-class
 *               contract objects and may not be implicit only.
 *   INV-9.3-D : Ambiguity / staleness / degradation / restriction
 *               posture may not be silently omitted from emissible
 *               temporal outputs.
 *   INV-9.3-E : L7 and L8 posture must be contractually consumed where
 *               required.
 *   INV-9.3-F : Replay identity and contract compatibility
 *               classification must be deterministic.
 *   INV-9.3-G : No sequence contract may leak judgment, recommendation,
 *               score-finality, or unjustified causality semantics.
 */

import { validateL9SequenceSubjectContract } from '../validation/sequence-subject-contract.validator';
import { validateL9SequenceOutputContract } from '../validation/sequence-output-contract.validator';
import { validateL9LeadLagContract } from '../validation/lead-lag-contract.validator';
import { validateL9SequenceChainContract } from '../validation/sequence-chain-contract.validator';
import { validateL9PhaseStateContract } from '../validation/phase-state-contract.validator';
import { validateL9DecayProfileContract } from '../validation/decay-profile-contract.validator';
import { validateL9PostEventWindowContract } from '../validation/post-event-window-contract.validator';
import { validateL9SequenceRestrictionProfileContract } from '../validation/sequence-restriction-contract.validator';
import { validateL9ContractCompatibility } from '../validation/sequence-contract-compatibility.validator';
import { evaluateL9SequenceOutputReadiness } from '../validation/sequence-output-readiness.validator';
import { L9SequenceContractViolationCode } from '../validation/l9-contract-violation-codes';

import {
  cannedSubject,
  cannedOutput,
  cannedLeadLag,
  cannedChain,
  cannedPhase,
  cannedDecay,
  cannedPostEvent,
  cannedRestriction,
} from './l9_3-fixtures';

import {
  buildL9ContractReplayHash,
  classifyL9ContractDelta,
  L9ContractCompatibilityClass,
  L9ContractSurface,
} from '../contracts/sequence-contract-versioning';
import { L9SequenceReadinessClass } from '../contracts/sequence-materialization-policy';
import { L9SequenceCoexistenceClass } from '../contracts/sequence-coexistence';
import { L9SequenceState } from '../contracts/sequence-state';
import { L9SequenceFamily } from '../contracts/sequence-family';
import {
  L9LagSupportStrength,
  L9LagContradictionPosture,
} from '../contracts/lead-lag-relation';

export interface L9_3InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

/**
 * INV-9.3-A — Subject contract completeness is machine-enforced.
 * The canonical fixture must pass; an underdeclared fixture must fail.
 */
export function checkINV_93_A(): L9_3InvariantResult {
  const green = validateL9SequenceSubjectContract(cannedSubject());

  // Strip a required field (sequence_window).
  const red = validateL9SequenceSubjectContract(
    cannedSubject({ sequence_window: {
      window_id: '',
      as_of: '',
      lookback_seconds: 0,
      lookforward_seconds: 0,
      granularity: 'HOUR',
    }}),
  );

  // Strip required validation inputs.
  const red2 = validateL9SequenceSubjectContract(
    cannedSubject({ required_validation_inputs: [] }),
  );

  // Required: confidence_derivation_spec absent.
  const red3 = validateL9SequenceSubjectContract(
    cannedSubject({ confidence_derivation_spec: {
      policy_id: '',
      policy_version: '',
      required_factors: [],
      factor_weights: {},
      caps: [],
      consumes_l7_confidence: false,
      consumes_l8_regime: false,
    }}),
  );

  const holds = green.valid && !red.valid && !red2.valid && !red3.valid &&
    red2.issues.some(i =>
      i.code ===
        L9SequenceContractViolationCode.SUBJECT_MISSING_VALIDATION_INPUTS);

  return {
    id: 'INV-9.3-A',
    name: 'Subject contract completeness machine-enforced',
    holds,
    evidence:
      `green.valid=${green.valid} red(seqWin)=${red.valid} red(validInputs)=${red2.valid} red(confSpec)=${red3.valid}`,
  };
}

/**
 * INV-9.3-B — Output contract completeness machine-enforced.
 */
export function checkINV_93_B(): L9_3InvariantResult {
  const green = validateL9SequenceOutputContract(cannedOutput());

  // Strip required primary state via empty string cast — validator
  // should reject as missing.
  const red = validateL9SequenceOutputContract(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cannedOutput({ primary_sequence_state: '' as unknown as L9SequenceState }),
  );
  const red2 = validateL9SequenceOutputContract(
    cannedOutput({ ordered_signal_refs: [] }),
  );
  const red3 = validateL9SequenceOutputContract(
    cannedOutput({ replay_hash: '' }),
  );
  const red4 = validateL9SequenceOutputContract(
    cannedOutput({ restriction_profile_ref: '' }),
  );

  const holds = green.valid && !red.valid && !red2.valid && !red3.valid &&
    !red4.valid;
  return {
    id: 'INV-9.3-B',
    name: 'Output contract completeness machine-enforced',
    holds,
    evidence:
      `green=${green.valid} red(primary)=${red.valid} red(ordered)=${red2.valid} red(replay)=${red3.valid} red(restriction)=${red4.valid}`,
  };
}

/**
 * INV-9.3-C — Lead-lag and chain contracts are first-class.
 * Validators exist; fixtures pass; underdeclared variants fail.
 */
export function checkINV_93_C(): L9_3InvariantResult {
  const llGreen = validateL9LeadLagContract(cannedLeadLag());
  const chGreen = validateL9SequenceChainContract(cannedChain());
  const phGreen = validateL9PhaseStateContract(cannedPhase());
  const dcGreen = validateL9DecayProfileContract(cannedDecay());
  const pewGreen = validateL9PostEventWindowContract(cannedPostEvent());

  const llRed = validateL9LeadLagContract(
    cannedLeadLag({ leading_signal_ref: '' }),
  );
  const chRed = validateL9SequenceChainContract(
    cannedChain({ ordered_node_refs: [] }),
  );
  const phRed = validateL9PhaseStateContract(
    cannedPhase({ phase_support_refs: [] }),
  );
  const dcRed = validateL9DecayProfileContract(
    cannedDecay({ decay_reason_codes: [] }),
  );
  const pewRed = validateL9PostEventWindowContract(
    cannedPostEvent({ anchor_event_ref: '' }),
  );

  const holds = llGreen.valid && chGreen.valid && phGreen.valid &&
    dcGreen.valid && pewGreen.valid &&
    !llRed.valid && !chRed.valid && !phRed.valid && !dcRed.valid &&
    !pewRed.valid;
  return {
    id: 'INV-9.3-C',
    name: 'Lead-lag / chain / phase / decay / post-event are first-class contracts',
    holds,
    evidence:
      `green: ll=${llGreen.valid} ch=${chGreen.valid} ph=${phGreen.valid} dc=${dcGreen.valid} pew=${pewGreen.valid}; red: ll=${llRed.valid} ch=${chRed.valid} ph=${phRed.valid} dc=${dcRed.valid} pew=${pewRed.valid}`,
  };
}

/**
 * INV-9.3-D — Ambiguity/staleness/degradation/restriction posture
 * silent omission rejected; CLEAN_SINGLE under material ambiguity
 * rejected.
 */
export function checkINV_93_D(): L9_3InvariantResult {
  const cleanWhileAmbiguous = validateL9SequenceOutputContract(
    cannedOutput({
      coexistence_class: L9SequenceCoexistenceClass.CLEAN_SINGLE,
      ambiguity_score: 0.8,
    }),
  );
  const cleanWhileStale = validateL9SequenceOutputContract(
    cannedOutput({ staleness_score: 0.9 }),
  );
  const cleanWhileDegraded = validateL9SequenceOutputContract(
    cannedOutput({ degradation_score: 0.9 }),
  );
  const cleanWhileDecayHigh = validateL9SequenceOutputContract(
    cannedOutput({ sequence_decay_score: 0.8 }),
  );
  const missingRestriction = validateL9SequenceOutputContract(
    cannedOutput({ restriction_profile_ref: '' }),
  );

  const A = cleanWhileAmbiguous.issues.some(i =>
    i.code === L9SequenceContractViolationCode.CLEAN_WHILE_AMBIGUOUS);
  const B = cleanWhileStale.issues.some(i =>
    i.code === L9SequenceContractViolationCode.CLEAN_WHILE_STALE);
  const C = cleanWhileDegraded.issues.some(i =>
    i.code === L9SequenceContractViolationCode.CLEAN_WHILE_DEGRADED);
  const D = cleanWhileDecayHigh.issues.some(i =>
    i.code === L9SequenceContractViolationCode.CLEAN_WHILE_DECAY_HIGH);
  const E = missingRestriction.issues.some(i =>
    i.code === L9SequenceContractViolationCode.RESTRICTION_POSTURE_REQUIRED ||
    i.code === L9SequenceContractViolationCode.OUTPUT_MISSING_RESTRICTION_PROFILE);

  const holds = A && B && C && D && E;
  return {
    id: 'INV-9.3-D',
    name: 'Ambiguity/staleness/degradation/restriction posture silence rejected',
    holds,
    evidence: `ambiguity=${A} staleness=${B} degradation=${C} decay=${D} restriction=${E}`,
  };
}

/**
 * INV-9.3-E — L7 (validation) and L8 (regime) posture must be
 * contractually consumed when the subject requires it. Here we verify
 * that the readiness orchestrator emits the correct code when the
 * output omits posture the subject required.
 */
export function checkINV_93_E(): L9_3InvariantResult {
  const subject = cannedSubject({
    sequence_family: L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
    required_regime_inputs: [{
      ref: 'l8_reg_1',
      family: 'L8_REGIME',
      required: true,
      staleness_critical: true,
      evidence_only: false,
      context_only: false,
    }],
    regime_consumption_policy: {
      required: true,
      min_regime_refs: 1,
      block_on_unstable_regime: true,
    },
    allowed_sequence_state_set: [
      L9SequenceState.LEVERAGE_CROWDING_PHASE,
      L9SequenceState.LATE_STAGE_REFLEXIVITY,
    ],
  });
  const output = cannedOutput({
    sequence_family: L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
    primary_sequence_state: L9SequenceState.LEVERAGE_CROWDING_PHASE,
    regime_refs: [], // subject says required:true but output carries none.
  });

  const report = evaluateL9SequenceOutputReadiness({
    subject, output,
    chain: cannedChain(),
    phase: cannedPhase(),
    decay: cannedDecay(),
    restriction: cannedRestriction(),
    leadLagRelations: [cannedLeadLag()],
    postEventWindows: [],
  });

  const regimeDetected = report.issues.some(i =>
    i.code === L9SequenceContractViolationCode.REGIME_POSTURE_REQUIRED);
  const validationDetected = report.issues.some(i =>
    i.code === L9SequenceContractViolationCode.VALIDATION_POSTURE_REQUIRED);

  // Now test the validation-missing case.
  const report2 = evaluateL9SequenceOutputReadiness({
    subject: cannedSubject(),
    output: cannedOutput({ validation_refs: [] }),
    chain: cannedChain(),
    phase: cannedPhase(),
    decay: cannedDecay(),
    restriction: cannedRestriction(),
    leadLagRelations: [cannedLeadLag()],
    postEventWindows: [],
  });

  const holds = regimeDetected &&
    report2.issues.some(i =>
      i.code === L9SequenceContractViolationCode.VALIDATION_POSTURE_REQUIRED ||
      i.code === L9SequenceContractViolationCode.OUTPUT_MISSING_VALIDATION_REFS);

  return {
    id: 'INV-9.3-E',
    name: 'L7/L8 posture contractually consumed when required',
    holds,
    evidence:
      `regimeDetected=${regimeDetected} validationDetected=${validationDetected} validMissing=${!report2.valid}`,
  };
}

/**
 * INV-9.3-F — Replay identity and compatibility classification are
 * deterministic.
 *
 *   - buildL9ContractReplayHash(canonical) is idempotent.
 *   - classifyL9ContractDelta returns the strongest applicable class.
 */
export function checkINV_93_F(): L9_3InvariantResult {
  const canonical = JSON.stringify({ a: 1, b: 'x', c: ['y'] });
  const h1 = buildL9ContractReplayHash(canonical);
  const h2 = buildL9ContractReplayHash(canonical);
  const h3 = buildL9ContractReplayHash(canonical + ' ');
  const deterministic = h1 === h2 && h1 !== h3;

  const breakingClass = classifyL9ContractDelta({
    surface: L9ContractSurface.OUTPUT,
    from: '9.3.0', to: '9.4.0',
    added_fields: [],
    removed_fields: [],
    semantically_changed_fields: ['primary_sequence_state'],
    changed_enum_vocabularies: [],
    changed_default_policies: [],
    prohibited_change: false,
  });
  const migrationClass = classifyL9ContractDelta({
    surface: L9ContractSurface.SUBJECT,
    from: '9.3.0', to: '9.3.1',
    added_fields: [],
    removed_fields: ['sequence_window'],
    semantically_changed_fields: [],
    changed_enum_vocabularies: [],
    changed_default_policies: [],
    prohibited_change: false,
  });
  const additiveClass = classifyL9ContractDelta({
    surface: L9ContractSurface.OUTPUT,
    from: '9.3.0', to: '9.3.1',
    added_fields: ['new_optional_field'],
    removed_fields: [],
    semantically_changed_fields: [],
    changed_enum_vocabularies: [],
    changed_default_policies: [],
    prohibited_change: false,
  });
  const prohibitedClass = classifyL9ContractDelta({
    surface: L9ContractSurface.OUTPUT,
    from: '9.3.0', to: '9.4.0',
    added_fields: [],
    removed_fields: [],
    semantically_changed_fields: [],
    changed_enum_vocabularies: [],
    changed_default_policies: [],
    prohibited_change: true,
  });

  const classificationOk =
    breakingClass === L9ContractCompatibilityClass.BREAKING_SEMANTIC &&
    migrationClass === L9ContractCompatibilityClass.MIGRATION_REQUIRED &&
    additiveClass === L9ContractCompatibilityClass.ADDITIVE_SAFE &&
    prohibitedClass === L9ContractCompatibilityClass.PROHIBITED;

  // Classification-mismatch validator catches a declaration that's
  // weaker than the classified class.
  const mismatchReport = validateL9ContractCompatibility({
    delta: {
      surface: L9ContractSurface.OUTPUT,
      from: '9.3.0', to: '9.4.0',
      added_fields: [],
      removed_fields: [],
      semantically_changed_fields: ['primary_sequence_state'],
      changed_enum_vocabularies: [],
      changed_default_policies: [],
      prohibited_change: false,
    },
    declaredClass: L9ContractCompatibilityClass.ADDITIVE_SAFE,
  });
  const mismatchDetected = mismatchReport.issues.some(i =>
    i.code === L9SequenceContractViolationCode.COMPATIBILITY_CLASSIFICATION_MISMATCH);

  // Non-monotonic version rejected.
  const regressReport = validateL9ContractCompatibility({
    delta: {
      surface: L9ContractSurface.OUTPUT,
      from: '9.4.0', to: '9.3.0',
      added_fields: [],
      removed_fields: [],
      semantically_changed_fields: [],
      changed_enum_vocabularies: [],
      changed_default_policies: [],
      prohibited_change: false,
    },
    declaredClass: L9ContractCompatibilityClass.ADDITIVE_SAFE,
  });
  const regressDetected = regressReport.issues.some(i =>
    i.code === L9SequenceContractViolationCode.COMPATIBILITY_NON_MONOTONIC_VERSION);

  const holds = deterministic && classificationOk && mismatchDetected &&
    regressDetected;
  return {
    id: 'INV-9.3-F',
    name: 'Replay identity + compatibility classification deterministic',
    holds,
    evidence:
      `replayDet=${deterministic} classOk=${classificationOk} mismatch=${mismatchDetected} regress=${regressDetected}`,
  };
}

/**
 * INV-9.3-G — No contract leaks judgment / recommendation / scenario /
 * score-finality / causal-overclaim semantics.
 */
export function checkINV_93_G(): L9_3InvariantResult {
  // Description leak on the subject.
  const subjectLeak = validateL9SequenceSubjectContract(
    cannedSubject({ description: 'Strong buy recommendation for target' }),
  );
  const subjDetected = subjectLeak.issues.some(i =>
    i.code === L9SequenceContractViolationCode.SUBJECT_JUDGMENT_LEAK);

  // Lead-lag causal overclaim: flag set false.
  const llLeak = validateL9LeadLagContract(
    cannedLeadLag({
      causal_restraint_flag:
        false as unknown as L9LagContradictionPosture as unknown as true,
    }),
  );
  const llDetected = llLeak.issues.some(i =>
    i.code === L9SequenceContractViolationCode.LEAD_LAG_CAUSAL_OVERCLAIM);

  // Lead-lag clean support while decisive contradiction.
  const llContradict = validateL9LeadLagContract(
    cannedLeadLag({
      support_strength: L9LagSupportStrength.STRONG_SUPPORT,
      contradiction_posture: L9LagContradictionPosture.DECISIVE,
    }),
  );
  const llContradictDetected = llContradict.issues.some(i =>
    i.code ===
      L9SequenceContractViolationCode.LEAD_LAG_CLEAN_WHILE_CONTRADICTION);

  // Restriction description leak.
  const restrLeak = validateL9SequenceRestrictionProfileContract(
    cannedRestriction({
      description: 'Use as final judgment override for trade_signal downstream.',
    }),
  );
  const restrDetected = restrLeak.issues.some(i =>
    i.code === L9SequenceContractViolationCode.RESTRICTION_JUDGMENT_LEAK);

  // Output causal restraint flag weakened: should be flagged.
  const outLeak = validateL9SequenceOutputContract(
    cannedOutput({
      causal_restraint_flags: {
        chain_is_temporal_only: true,
        adjacency_is_not_causality_disclaimer: '',
        hypothesis_excluded: true,
        judgment_excluded: true,
        scenario_excluded: true,
        recommendation_excluded: true,
      },
    }),
  );
  const outDetected = outLeak.issues.some(i =>
    i.code === L9SequenceContractViolationCode.OUTPUT_MISSING_CAUSAL_RESTRAINT);

  const holds = subjDetected && llDetected && llContradictDetected &&
    restrDetected && outDetected;
  return {
    id: 'INV-9.3-G',
    name: 'No judgment/recommendation/scenario/score-finality/causal leaks',
    holds,
    evidence:
      `subject=${subjDetected} ll_overclaim=${llDetected} ll_contradict=${llContradictDetected} restriction=${restrDetected} output_restraint=${outDetected}`,
  };
}

export function checkAllL93Invariants(): readonly L9_3InvariantResult[] {
  return [
    checkINV_93_A(),
    checkINV_93_B(),
    checkINV_93_C(),
    checkINV_93_D(),
    checkINV_93_E(),
    checkINV_93_F(),
    checkINV_93_G(),
  ];
}

// Retain imports that are exported for tests/consumers.
void L9SequenceReadinessClass;

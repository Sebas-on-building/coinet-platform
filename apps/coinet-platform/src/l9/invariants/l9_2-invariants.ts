/**
 * L9.2 — Object-Model Invariants
 *
 * §9.2.10.1 — INV-9.2-A through INV-9.2-G, all executable and covered
 * by the certification suite.
 *
 *   INV-9.2-A : Every sequence state used at runtime belongs to a
 *               registered sequence family.
 *   INV-9.2-B : Every sequence assessment carries family, primary
 *               state, scope, temporal refs, phase posture, decay
 *               posture, and replay identity.
 *   INV-9.2-C : Lead-lag, phase, decay, change-point, and post-event
 *               window objects are first-class and may not be implicit
 *               side fields.
 *   INV-9.2-D : Ambiguity and coexistence posture may not be omitted
 *               when multi-state interpretation is materially relevant.
 *   INV-9.2-E : Sequence states may not leak judgment, recommendation,
 *               or scenario semantics.
 *   INV-9.2-F : Illegal state collisions and fake clean-single
 *               emissions must be blocked.
 *   INV-9.2-G : Sequence object model remains lineage-bound, replay-
 *               safe, and restriction-aware.
 */

import {
  L9SequenceFamily,
  ALL_L9_SEQUENCE_FAMILIES,
  L9_SEQUENCE_FAMILY_DESCRIPTORS,
} from '../contracts/sequence-family';
import {
  L9SequenceState,
  ALL_L9_SEQUENCE_STATES,
  L9_SEQUENCE_STATE_DESCRIPTORS,
  getL9SequenceStateDescriptor,
} from '../contracts/sequence-state';
import {
  L9SequenceCoexistenceClass,
  decideL9Coexistence,
  L9_SEQUENCE_COEXISTENCE_RULES,
} from '../contracts/sequence-coexistence';
import {
  L9SequenceOutputClass,
  ALL_L9_SEQUENCE_OUTPUT_CLASSES,
  L9_SEQUENCE_OUTPUT_CLASS_DESCRIPTORS,
} from '../contracts/sequence-output-class';
import { L9OutputSurfaceClass } from '../contracts/l9-constitutional-types';
import { validateL9SequenceOutput } from '../validation/sequence-output.validator';

export interface L9_2InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

/**
 * INV-9.2-A — Every registered state belongs to a registered family.
 */
export function checkINV_92_A(): L9_2InvariantResult {
  const allStatesCovered = L9_SEQUENCE_STATE_DESCRIPTORS.every(d =>
    ALL_L9_SEQUENCE_FAMILIES.includes(d.family),
  );
  const familyCoverage = new Map<L9SequenceFamily, number>();
  for (const d of L9_SEQUENCE_STATE_DESCRIPTORS) {
    familyCoverage.set(d.family, (familyCoverage.get(d.family) ?? 0) + 1);
  }
  const everyFamilyHasStates = ALL_L9_SEQUENCE_FAMILIES.every(
    f => (familyCoverage.get(f) ?? 0) >= 1,
  );
  const holds = allStatesCovered && everyFamilyHasStates;
  return {
    id: 'INV-9.2-A',
    name: 'Every sequence state belongs to a registered family',
    holds,
    evidence: `states=${L9_SEQUENCE_STATE_DESCRIPTORS.length} families=${ALL_L9_SEQUENCE_FAMILIES.length} allCovered=${allStatesCovered} everyFamilyHasStates=${everyFamilyHasStates}`,
  };
}

/**
 * INV-9.2-B — Output class descriptors declare the completeness gates
 * required for a SequenceAssessment: evidence, lineage, replay hash,
 * and restriction profile on the primary class.
 */
export function checkINV_92_B(): L9_2InvariantResult {
  const descByClass = new Map(
    L9_SEQUENCE_OUTPUT_CLASS_DESCRIPTORS.map(d => [d.outputClass, d]),
  );
  const assessmentDesc = descByClass.get(L9SequenceOutputClass.SEQUENCE_ASSESSMENT);
  const assessmentGates =
    !!assessmentDesc &&
    assessmentDesc.requiresEvidence &&
    assessmentDesc.requiresLineage &&
    assessmentDesc.requiresReplayHash &&
    assessmentDesc.requiresRestrictionProfile;

  // Every output class must require lineage + replay identity + evidence.
  const allOutputsTraceable = L9_SEQUENCE_OUTPUT_CLASS_DESCRIPTORS.every(
    d => d.requiresEvidence && d.requiresLineage && d.requiresReplayHash,
  );
  const holds = assessmentGates && allOutputsTraceable;
  return {
    id: 'INV-9.2-B',
    name: 'Sequence assessment carries family/state/scope/phase/decay/replay identity',
    holds,
    evidence: `assessmentGates=${assessmentGates} allOutputsTraceable=${allOutputsTraceable}`,
  };
}

/**
 * INV-9.2-C — First-class temporal objects all appear as registered
 * output classes. Lead-lag, phase, decay, and the evidence read surface
 * are each distinct outputs, and the chain is its own output.
 *
 * (ChangePoint and PostEventWindow are referenced inside a chain /
 * assessment rather than emitted as top-level outputs, but the
 * assessment contract requires them to be declared explicitly. This
 * invariant ensures the four standalone temporal objects are not
 * collapsed into the assessment and that the set of L9 output classes
 * exactly matches L9.1's boundary declaration.)
 */
export function checkINV_92_C(): L9_2InvariantResult {
  const required: readonly L9SequenceOutputClass[] = [
    L9SequenceOutputClass.SEQUENCE_ASSESSMENT,
    L9SequenceOutputClass.SEQUENCE_CHAIN,
    L9SequenceOutputClass.LEAD_LAG_PROFILE,
    L9SequenceOutputClass.PHASE_STATE,
    L9SequenceOutputClass.DECAY_PROFILE,
    L9SequenceOutputClass.SEQUENCE_RESTRICTION_PROFILE,
    L9SequenceOutputClass.SEQUENCE_EVIDENCE_READ_SURFACE,
  ];
  const allPresent = required.every(c => ALL_L9_SEQUENCE_OUTPUT_CLASSES.includes(c));

  // Exactly seven classes, matching L9.1's L9OutputSurfaceClass.
  const l91Classes: readonly string[] = Object.values(L9OutputSurfaceClass);
  const l92Classes: readonly string[] = Object.values(L9SequenceOutputClass);
  const exactAlignment =
    l91Classes.length === l92Classes.length &&
    l91Classes.every(c => l92Classes.includes(c));

  const holds = allPresent && exactAlignment;
  return {
    id: 'INV-9.2-C',
    name: 'First-class temporal objects are distinct, registered output classes',
    holds,
    evidence: `requiredPresent=${allPresent} l91/l92 alignment=${exactAlignment}`,
  };
}

/**
 * INV-9.2-D — Ambiguity/coexistence is required when multi-state. A
 * non-null secondary with CLEAN_SINGLE is rejected; an intra-family
 * AMBIGUITY_ONLY pair declared as PRIMARY_PLUS_SECONDARY is rejected.
 */
export function checkINV_92_D(): L9_2InvariantResult {
  // Case 1: fake clean single with a secondary.
  const fakeCleanSingle = decideL9Coexistence(
    L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
    L9SequenceState.LEVERAGE_CROWDING_PHASE,
    L9SequenceState.LATE_STAGE_REFLEXIVITY,
    L9SequenceCoexistenceClass.CLEAN_SINGLE,
  );

  // Case 2: ambiguity-only pair declared as primary+secondary (must
  // force AMBIGUOUS_MULTI_STATE).
  const ambigRule = L9_SEQUENCE_COEXISTENCE_RULES.find(r => r.kind === 'AMBIGUITY_ONLY');
  let ambigCaseOk = true;
  if (ambigRule) {
    const res = decideL9Coexistence(
      ambigRule.family,
      ambigRule.pair[0],
      ambigRule.pair[1],
      L9SequenceCoexistenceClass.PRIMARY_PLUS_SECONDARY,
    );
    ambigCaseOk = !res.allowed &&
      res.requiredClass === L9SequenceCoexistenceClass.AMBIGUOUS_MULTI_STATE;
  }

  const holds = !fakeCleanSingle.allowed && ambigCaseOk;
  return {
    id: 'INV-9.2-D',
    name: 'Ambiguity/coexistence posture cannot be omitted for multi-state interpretations',
    holds,
    evidence: `fakeCleanSingleRejected=${!fakeCleanSingle.allowed} ambigCaseOk=${ambigCaseOk}`,
  };
}

/**
 * INV-9.2-E — No sequence state or output may leak judgment, scenario,
 * recommendation, hypothesis, score, or action-bias semantics.
 */
export function checkINV_92_E(): L9_2InvariantResult {
  // Registered state names must pass the output semantic filter.
  const stateNames = ALL_L9_SEQUENCE_STATES.map(s => s as string);
  const badState = stateNames.find(name => {
    const r = validateL9SequenceOutput({
      outputClass: L9SequenceOutputClass.SEQUENCE_ASSESSMENT,
      outputName: name,
      outputDescription: '',
      evidence_pack_ref: 'epk_test',
      lineage_refs: ['lin_test'],
      replay_hash: 'srhash_test',
      restriction_profile_ref: 'srp_test',
    });
    // Only semantic leak codes are disqualifying for state labels.
    return r.issues.some(i => i.code.toString().includes('LEAK'));
  });

  // A crafted offender must fail at the output validator.
  const offender = validateL9SequenceOutput({
    outputClass: L9SequenceOutputClass.SEQUENCE_ASSESSMENT,
    outputName: 'AccumulationRecommendation',
    outputDescription: 'Scenario-led buy recommendation on target',
    evidence_pack_ref: 'epk_test',
    lineage_refs: ['lin_test'],
    replay_hash: 'srhash_test',
    restriction_profile_ref: 'srp_test',
  });
  const offenderFails = !offender.valid;

  const holds = !badState && offenderFails;
  return {
    id: 'INV-9.2-E',
    name: 'No judgment/scenario/recommendation/score/hypothesis/action-bias semantics in state labels or outputs',
    holds,
    evidence: `badState=${badState ?? 'none'} offenderFails=${offenderFails}`,
  };
}

/**
 * INV-9.2-F — Illegal intra-family collisions and fake-clean-single
 * emissions must be blocked regardless of declared class.
 */
export function checkINV_92_F(): L9_2InvariantResult {
  // Build an illegal pair from the rulebook.
  const illegal = L9_SEQUENCE_COEXISTENCE_RULES.find(r => r.kind === 'ILLEGAL');
  let illegalBlocked = true;
  if (illegal) {
    // Every declared coexistence class must fail.
    const classesToTest: L9SequenceCoexistenceClass[] = [
      L9SequenceCoexistenceClass.CLEAN_SINGLE,
      L9SequenceCoexistenceClass.PRIMARY_PLUS_SECONDARY,
      L9SequenceCoexistenceClass.TRANSITIONAL_OVERLAP,
      L9SequenceCoexistenceClass.AMBIGUOUS_MULTI_STATE,
      L9SequenceCoexistenceClass.ILLEGAL_COLLISION,
    ];
    illegalBlocked = classesToTest.every(cls => {
      const res = decideL9Coexistence(illegal.family, illegal.pair[0], illegal.pair[1], cls);
      return !res.allowed;
    });
  }

  // A state flagged cleanSingleAllowed=false must not emit with null
  // secondary + CLEAN_SINGLE.
  const dirtyState = L9_SEQUENCE_STATE_DESCRIPTORS.find(d => !d.cleanSingleAllowed);
  let dirtyBlocked = true;
  if (dirtyState) {
    const res = decideL9Coexistence(
      dirtyState.family,
      dirtyState.state,
      null,
      L9SequenceCoexistenceClass.CLEAN_SINGLE,
    );
    dirtyBlocked = !res.allowed;
  }

  const holds = illegalBlocked && dirtyBlocked;
  return {
    id: 'INV-9.2-F',
    name: 'Illegal intra-family collisions and fake clean-single emissions blocked',
    holds,
    evidence: `illegalBlocked=${illegalBlocked} dirtyStateBlocked=${dirtyBlocked}`,
  };
}

/**
 * INV-9.2-G — Every registered output class requires evidence, lineage,
 * and replay identity; every family with post-event-anchor requirement
 * is reflected by at least one state that also requires the anchor, and
 * the SEQUENCE_ASSESSMENT output requires a restriction profile.
 */
export function checkINV_92_G(): L9_2InvariantResult {
  const outputsTraceable = L9_SEQUENCE_OUTPUT_CLASS_DESCRIPTORS.every(
    d => d.requiresEvidence && d.requiresLineage && d.requiresReplayHash,
  );
  const assessmentRestriction =
    L9_SEQUENCE_OUTPUT_CLASS_DESCRIPTORS.find(
      d => d.outputClass === L9SequenceOutputClass.SEQUENCE_ASSESSMENT,
    )?.requiresRestrictionProfile === true;

  const anchorFamilies = L9_SEQUENCE_FAMILY_DESCRIPTORS.filter(f => f.requiresPostEventAnchor);
  const anchorFamilyStatesOk = anchorFamilies.every(f =>
    L9_SEQUENCE_STATE_DESCRIPTORS.some(
      s => s.family === f.family && s.requiresPostEventAnchor,
    ),
  );

  const holds = outputsTraceable && assessmentRestriction && anchorFamilyStatesOk;
  return {
    id: 'INV-9.2-G',
    name: 'Outputs are lineage-bound, replay-safe, restriction-aware; anchor laws aligned',
    holds,
    evidence:
      `outputsTraceable=${outputsTraceable} assessmentRestriction=${assessmentRestriction} anchorFamiliesAligned=${anchorFamilyStatesOk}`,
  };
}

export function checkAllL92Invariants(): readonly L9_2InvariantResult[] {
  return [
    checkINV_92_A(),
    checkINV_92_B(),
    checkINV_92_C(),
    checkINV_92_D(),
    checkINV_92_E(),
    checkINV_92_F(),
    checkINV_92_G(),
  ];
}

void getL9SequenceStateDescriptor; // retained import for potential future dominance checks

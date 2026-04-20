/**
 * L9.3 — Sequence Output Readiness Validator
 *
 * §9.3.8 — Orchestrates every contract validator plus the cleanliness
 * law and assigns a final `L9SequenceReadinessClass`.
 *
 * Readiness depends on (§9.3.8.2): object completeness, ambiguity,
 * phase/decay/restriction completeness, replay identity, L7/L8 posture
 * consumption, and chain integrity flags.
 */

import { L9SequenceSubjectContract } from '../contracts/sequence-subject.contract';
import { L9SequenceOutputContract } from '../contracts/sequence-output.contract';
import { L9LeadLagRelationContract } from '../contracts/lead-lag-relation.contract';
import { L9SequenceChainContract } from '../contracts/sequence-chain.contract';
import { L9PhaseStateContract } from '../contracts/phase-state.contract';
import { L9DecayProfileContract } from '../contracts/decay-profile.contract';
import { L9PostEventWindowContract } from '../contracts/post-event-window.contract';
import { L9SequenceRestrictionProfileContract } from '../contracts/sequence-restriction.contract';
import {
  L9SequenceReadinessClass,
  L9_OUTPUT_CLEANLINESS_THRESHOLDS,
} from '../contracts/sequence-materialization-policy';
import { L9SequenceCoexistenceClass } from '../contracts/sequence-coexistence';
import { L9SequenceRelianceBand } from '../contracts/sequence-restriction-profile';

import {
  validateL9SequenceSubjectContract,
  L9SubjectContractIssue,
} from './sequence-subject-contract.validator';
import {
  validateL9SequenceOutputContract,
  L9OutputContractIssue,
} from './sequence-output-contract.validator';
import {
  validateL9LeadLagContract,
  L9LeadLagContractIssue,
} from './lead-lag-contract.validator';
import {
  validateL9SequenceChainContract,
  L9ChainContractIssue,
} from './sequence-chain-contract.validator';
import {
  validateL9PhaseStateContract,
  L9PhaseContractIssue,
} from './phase-state-contract.validator';
import {
  validateL9DecayProfileContract,
  L9DecayContractIssue,
} from './decay-profile-contract.validator';
import {
  validateL9PostEventWindowContract,
  L9PostEventContractIssue,
} from './post-event-window-contract.validator';
import {
  validateL9SequenceRestrictionProfileContract,
  L9RestrictionContractIssue,
} from './sequence-restriction-contract.validator';
import { L9SequenceContractViolationCode } from './l9-contract-violation-codes';

export interface L9ReadinessBundle {
  readonly subject: L9SequenceSubjectContract;
  readonly output: L9SequenceOutputContract;
  readonly chain: L9SequenceChainContract;
  readonly phase: L9PhaseStateContract;
  readonly decay: L9DecayProfileContract;
  readonly restriction: L9SequenceRestrictionProfileContract;
  readonly leadLagRelations: readonly L9LeadLagRelationContract[];
  readonly postEventWindows: readonly L9PostEventWindowContract[];
}

export type L9AnyContractIssue =
  | (L9SubjectContractIssue & { readonly surface: 'SUBJECT' })
  | (L9OutputContractIssue & { readonly surface: 'OUTPUT' })
  | (L9LeadLagContractIssue & { readonly surface: 'LEAD_LAG' })
  | (L9ChainContractIssue & { readonly surface: 'CHAIN' })
  | (L9PhaseContractIssue & { readonly surface: 'PHASE' })
  | (L9DecayContractIssue & { readonly surface: 'DECAY' })
  | (L9PostEventContractIssue & { readonly surface: 'POST_EVENT' })
  | (L9RestrictionContractIssue & { readonly surface: 'RESTRICTION' })
  | {
      readonly surface: 'READINESS';
      readonly code: L9SequenceContractViolationCode;
      readonly message: string;
    };

export interface L9ReadinessReport {
  readonly readinessClass: L9SequenceReadinessClass;
  readonly valid: boolean;
  readonly issues: readonly L9AnyContractIssue[];
}

function push<T extends { code: L9SequenceContractViolationCode; message: string }>(
  acc: L9AnyContractIssue[],
  surface: L9AnyContractIssue['surface'],
  items: readonly T[],
): void {
  for (const i of items) {
    acc.push({ surface, code: i.code, message: i.message } as L9AnyContractIssue);
  }
}

export function evaluateL9SequenceOutputReadiness(
  bundle: L9ReadinessBundle,
): L9ReadinessReport {
  const issues: L9AnyContractIssue[] = [];

  const subjectReport = validateL9SequenceSubjectContract(bundle.subject);
  push(issues, 'SUBJECT', subjectReport.issues);

  const outputReport = validateL9SequenceOutputContract(bundle.output);
  push(issues, 'OUTPUT', outputReport.issues);

  const chainReport = validateL9SequenceChainContract(bundle.chain);
  push(issues, 'CHAIN', chainReport.issues);

  const phaseReport = validateL9PhaseStateContract(bundle.phase);
  push(issues, 'PHASE', phaseReport.issues);

  const decayReport = validateL9DecayProfileContract(bundle.decay);
  push(issues, 'DECAY', decayReport.issues);

  const restrictionReport = validateL9SequenceRestrictionProfileContract(
    bundle.restriction,
    { ambiguity_score: bundle.output.ambiguity_score },
  );
  push(issues, 'RESTRICTION', restrictionReport.issues);

  for (const ll of bundle.leadLagRelations) {
    const r = validateL9LeadLagContract(ll);
    push(issues, 'LEAD_LAG', r.issues);
  }
  for (const w of bundle.postEventWindows) {
    const r = validateL9PostEventWindowContract(w);
    push(issues, 'POST_EVENT', r.issues);
  }

  // Cross-contract identity alignment
  if (bundle.output.sequence_subject_id !== bundle.subject.sequence_subject_id) {
    issues.push({
      surface: 'READINESS',
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_SUBJECT_REF,
      message:
        `output.sequence_subject_id ${bundle.output.sequence_subject_id} != subject.sequence_subject_id ${bundle.subject.sequence_subject_id}`,
    });
  }
  if (bundle.chain.sequence_subject_id !== bundle.subject.sequence_subject_id) {
    issues.push({
      surface: 'READINESS',
      code: L9SequenceContractViolationCode.CHAIN_MISSING_IDENTITY,
      message: 'chain.sequence_subject_id != subject.sequence_subject_id',
    });
  }
  if (bundle.restriction.sequence_result_id !==
      bundle.output.sequence_result_id) {
    issues.push({
      surface: 'READINESS',
      code:
        L9SequenceContractViolationCode.OUTPUT_MISSING_RESTRICTION_PROFILE,
      message: 'restriction.sequence_result_id != output.sequence_result_id',
    });
  }
  if (bundle.output.sequence_family !== bundle.subject.sequence_family) {
    issues.push({
      surface: 'READINESS',
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_FAMILY,
      message: 'output.sequence_family != subject.sequence_family',
    });
  }

  // Regime/validation consumption enforcement (INV-9.3-E)
  if (bundle.subject.regime_consumption_policy?.required &&
      bundle.output.regime_refs.length <
        bundle.subject.regime_consumption_policy.min_regime_refs) {
    issues.push({
      surface: 'READINESS',
      code: L9SequenceContractViolationCode.REGIME_POSTURE_REQUIRED,
      message:
        `output.regime_refs length ${bundle.output.regime_refs.length} < subject.min_regime_refs ${bundle.subject.regime_consumption_policy.min_regime_refs}`,
    });
  }
  if (bundle.subject.validation_consumption_policy?.required &&
      bundle.output.validation_refs.length <
        bundle.subject.validation_consumption_policy.min_validation_refs) {
    issues.push({
      surface: 'READINESS',
      code: L9SequenceContractViolationCode.VALIDATION_POSTURE_REQUIRED,
      message:
        `output.validation_refs length ${bundle.output.validation_refs.length} < subject.min_validation_refs ${bundle.subject.validation_consumption_policy.min_validation_refs}`,
    });
  }
  if (bundle.subject.restriction_consumption_policy?.required &&
      !bundle.output.restriction_profile_ref) {
    issues.push({
      surface: 'READINESS',
      code: L9SequenceContractViolationCode.RESTRICTION_POSTURE_REQUIRED,
      message: 'subject requires restriction consumption but output has no restriction profile',
    });
  }

  // Decide readiness class
  const readinessClass = decideReadinessClass(bundle, issues);

  return {
    readinessClass,
    valid:
      issues.length === 0 &&
      readinessClass === L9SequenceReadinessClass.CLEAN_EMISSION,
    issues,
  };
}

function decideReadinessClass(
  bundle: L9ReadinessBundle,
  issues: readonly L9AnyContractIssue[],
): L9SequenceReadinessClass {
  // BLOCKED_EMISSION conditions (§9.3.8.3)
  const fatalCodes = new Set<string>([
    L9SequenceContractViolationCode.OUTPUT_MISSING_PRIMARY_STATE,
    L9SequenceContractViolationCode.OUTPUT_MISSING_FAMILY,
    L9SequenceContractViolationCode.OUTPUT_MISSING_ORDERED_REFS,
    L9SequenceContractViolationCode.OUTPUT_MISSING_LEAD_LAG_PROFILE,
    L9SequenceContractViolationCode.OUTPUT_MISSING_PHASE_REF,
    L9SequenceContractViolationCode.OUTPUT_MISSING_DECAY_REF,
    L9SequenceContractViolationCode.OUTPUT_MISSING_RESTRICTION_PROFILE,
    L9SequenceContractViolationCode.OUTPUT_MISSING_REPLAY_HASH,
    L9SequenceContractViolationCode.AMBIGUITY_POSTURE_REQUIRED,
    L9SequenceContractViolationCode.VALIDATION_POSTURE_REQUIRED,
    L9SequenceContractViolationCode.REGIME_POSTURE_REQUIRED,
    L9SequenceContractViolationCode.RESTRICTION_POSTURE_REQUIRED,
    L9SequenceContractViolationCode.OUTPUT_MISSING_IDENTITY,
    L9SequenceContractViolationCode.OUTPUT_MISSING_SUBJECT_REF,
    L9SequenceContractViolationCode.OUTPUT_MISSING_CAUSAL_RESTRAINT,
    L9SequenceContractViolationCode.CLEAN_WHILE_POST_EVENT_MISSING,
  ]);
  if (issues.some(i => fatalCodes.has(i.code))) {
    return L9SequenceReadinessClass.BLOCKED_EMISSION;
  }

  // DEGRADED_EMISSION — material cleanliness breach or chain damage.
  const out = bundle.output;
  const chainDamaged =
    (out.chain_integrity_flags && out.chain_integrity_flags.length > 0) ||
    (typeof out.sequence_completeness_score === 'number' &&
      out.sequence_completeness_score <
        L9_OUTPUT_CLEANLINESS_THRESHOLDS.completenessMaterial);
  const decayHigh = out.sequence_decay_score >=
    L9_OUTPUT_CLEANLINESS_THRESHOLDS.decayMaterial;
  const stalenessMaterial = out.staleness_score >=
    L9_OUTPUT_CLEANLINESS_THRESHOLDS.stalenessMaterial;
  const degradationMaterial = out.degradation_score >=
    L9_OUTPUT_CLEANLINESS_THRESHOLDS.degradationMaterial;
  if (chainDamaged || decayHigh || stalenessMaterial || degradationMaterial) {
    return L9SequenceReadinessClass.DEGRADED_EMISSION;
  }

  // CAPPED_EMISSION — restriction band limits reliance.
  if (bundle.restriction.reliance_band === L9SequenceRelianceBand.EVIDENCE_ONLY ||
      bundle.restriction.reliance_band === L9SequenceRelianceBand.BLOCKED ||
      bundle.restriction.reliance_band === L9SequenceRelianceBand.CORROBORATING) {
    return L9SequenceReadinessClass.CAPPED_EMISSION;
  }

  // MODIFIER_REQUIRED — ambiguity material but not fatal; coexistence is multi-state.
  const ambiguous = out.ambiguity_score >=
    L9_OUTPUT_CLEANLINESS_THRESHOLDS.ambiguityMaterial;
  const multiState = out.coexistence_class !==
    L9SequenceCoexistenceClass.CLEAN_SINGLE;
  if (ambiguous || multiState) {
    return L9SequenceReadinessClass.MODIFIER_REQUIRED;
  }

  // Clean only if zero issues at all.
  if (issues.length === 0) {
    return L9SequenceReadinessClass.CLEAN_EMISSION;
  }
  return L9SequenceReadinessClass.MODIFIER_REQUIRED;
}

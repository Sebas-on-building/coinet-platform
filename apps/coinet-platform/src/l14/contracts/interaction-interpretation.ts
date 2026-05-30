/**
 * L14.4 — Interpretation Policy + Forbidden Conclusions
 *
 * §14.4.19 / §14.4.20 / §14.4.21 — Frozen policy mapping
 * interaction types to legal interpretations and forbidden
 * truth conclusions.
 */

import type { L14InteractionType } from './interaction-event';

export enum L14BehavioralInterpretation {
  ATTENTION = 'ATTENTION',
  CURIOSITY = 'CURIOSITY',
  PERCEIVED_RELEVANCE = 'PERCEIVED_RELEVANCE',
  USER_INTEREST = 'USER_INTEREST',
  PERCEIVED_UTILITY = 'PERCEIVED_UTILITY',
  LOW_IMMEDIATE_RELEVANCE = 'LOW_IMMEDIATE_RELEVANCE',
  QUALITY_ISSUE_CANDIDATE = 'QUALITY_ISSUE_CANDIDATE',
  PREFERENCE_FRICTION = 'PREFERENCE_FRICTION',
  DEEPER_INVESTIGATION = 'DEEPER_INVESTIGATION',
}

export enum L14ForbiddenBehavioralConclusion {
  FACTUAL_CORRECTNESS = 'FACTUAL_CORRECTNESS',
  MODEL_ACCURACY = 'MODEL_ACCURACY',
  SCENARIO_VALIDITY = 'SCENARIO_VALIDITY',
  SCORE_CALIBRATION_PROOF = 'SCORE_CALIBRATION_PROOF',
  HYPOTHESIS_TRUTH = 'HYPOTHESIS_TRUTH',
  OUTPUT_USEFULNESS_PROVEN = 'OUTPUT_USEFULNESS_PROVEN',
  AUTOMATIC_ERROR = 'AUTOMATIC_ERROR',
}

export interface L14InteractionInterpretationPolicy {
  readonly interaction_type: L14InteractionType;
  readonly can_indicate: readonly L14BehavioralInterpretation[];
  readonly cannot_prove: readonly L14ForbiddenBehavioralConclusion[];
  readonly may_feed_delivery_analytics: boolean;
  readonly may_feed_quality_review: boolean;
  readonly may_feed_truth_calibration_directly: false;
  readonly policy_version: string;
}

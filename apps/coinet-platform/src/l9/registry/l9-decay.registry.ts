/**
 * L9.5 — Decay Registry
 *
 * §9.5.8 / §9.5.11.2 — Runtime registry for decay policy. Decay factor
 * weights, score composition, dominance banding, refresh legality, and
 * illegal-posture scans are exposed through one registry so engines
 * never redefine decay semantics inline.
 */

import { L9DecayClass } from '../contracts/decay-profile';
import {
  L9DecayDominance,
  L9DecayFactor,
  L9RefreshCandidate,
  L9RefreshEvaluation,
  L9_DECAY_FACTOR_WEIGHTS,
  classifyL9DecayDominance,
  composeL9DecayScore,
  evaluateL9Refresh,
  l9DecayClassToDominance,
  l9IsDecayDominant,
  scanL9IllegalDecayPostures,
} from '../contracts/l9-decay-policy';

export class L9DecayRegistry {
  factorWeight(factor: L9DecayFactor): number {
    return L9_DECAY_FACTOR_WEIGHTS[factor];
  }

  composeScore(
    contributions: Partial<Record<L9DecayFactor, number>>,
  ): number {
    return composeL9DecayScore(contributions);
  }

  classifyDominance(decay_score: number): L9DecayDominance {
    return classifyL9DecayDominance(decay_score);
  }

  classToDominance(cls: L9DecayClass): L9DecayDominance {
    return l9DecayClassToDominance(cls);
  }

  isDecayDominant(
    decay_score: number,
    contributions: Partial<Record<L9DecayFactor, number>>,
  ): boolean {
    return l9IsDecayDominant(decay_score, contributions);
  }

  evaluateRefresh(candidate: L9RefreshCandidate): L9RefreshEvaluation {
    return evaluateL9Refresh(candidate);
  }

  scanIllegalPostures(input: Parameters<typeof scanL9IllegalDecayPostures>[0]): string[] {
    return scanL9IllegalDecayPostures(input);
  }
}

const defaultDecayRegistry = new L9DecayRegistry();

export function getDefaultL9DecayRegistry(): L9DecayRegistry {
  return defaultDecayRegistry;
}

export {
  L9_DECAY_FACTOR_WEIGHTS,
  classifyL9DecayDominance,
  composeL9DecayScore,
  evaluateL9Refresh,
  l9DecayClassToDominance,
  l9IsDecayDominant,
  scanL9IllegalDecayPostures,
};

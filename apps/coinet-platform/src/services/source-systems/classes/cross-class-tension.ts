/**
 * Cross-Class Tension Engine — Strategy 3.
 *
 * Most systems smooth disagreement. Coinet preserves tension between
 * truth domains because those tensions are often the most important
 * part of reality.
 */

import type { TruthClass } from '../registry';
import { TRUTH_CLASSES } from '../registry';
import type { CrossClassTension, TensionDirection, ClassVisibility } from './types';
import { CLASS_INTERACTIONS } from './class-interactions';

interface ClassStrengthInput {
  truthClass: TruthClass;
  visibility: ClassVisibility;
  strength: number;
}

export interface TensionComputeInput {
  classStates: ClassStrengthInput[];
}

export interface TensionComputeOutput {
  tensions: CrossClassTension[];
  dominantTension: CrossClassTension | null;
  tensionCount: number;
  summary: string[];
}

const TC = TRUTH_CLASSES;

interface TensionTemplate {
  label: string;
  classA: TruthClass;
  classB: TruthClass;
  interpretation: (dir: TensionDirection) => string;
}

const TENSION_TEMPLATES: TensionTemplate[] = [
  {
    label: 'Attention > Substance',
    classA: TC.NARRATIVE_ATTENTION,
    classB: TC.PROTOCOL_SUBSTANCE,
    interpretation: (dir) =>
      dir === 'stronger'
        ? 'Narrative heat exceeds fundamental substance — reflexive fragility risk'
        : dir === 'weaker'
          ? 'Substance exceeds narrative — potential underappreciated quality'
          : 'Narrative and substance are in balance',
  },
  {
    label: 'Pressure > Conviction',
    classA: TC.DERIVATIVES_PRESSURE,
    classB: TC.ONCHAIN_BEHAVIOR,
    interpretation: (dir) =>
      dir === 'stronger'
        ? 'Leverage leads but spot conviction is weak — squeeze fragility'
        : dir === 'weaker'
          ? 'Spot conviction exceeds leverage — healthier structural move'
          : 'Derivatives and spot behavior are balanced',
  },
  {
    label: 'Surface > Safety',
    classA: TC.MARKET_SURFACE,
    classB: TC.STRUCTURAL_SAFETY,
    interpretation: (dir) =>
      dir === 'stronger'
        ? 'Price looks strong but structural safety is weak — false confidence risk'
        : dir === 'weaker'
          ? 'Safety is strong relative to surface — structurally sound foundation'
          : 'Surface and safety are aligned',
  },
  {
    label: 'Behavior > Surface',
    classA: TC.ONCHAIN_BEHAVIOR,
    classB: TC.MARKET_SURFACE,
    interpretation: (dir) =>
      dir === 'stronger'
        ? 'On-chain activity exceeds visible price action — possible stealth accumulation'
        : dir === 'weaker'
          ? 'Price moves without proportional on-chain activity — shallow move'
          : 'On-chain and surface are aligned',
  },
  {
    label: 'Narrative > Safety',
    classA: TC.NARRATIVE_ATTENTION,
    classB: TC.STRUCTURAL_SAFETY,
    interpretation: (dir) =>
      dir === 'stronger'
        ? 'Social hype exceeds structural legitimacy — critical warning signal'
        : dir === 'weaker'
          ? 'Structural safety exceeds narrative attention — safe but quiet'
          : 'Narrative and safety are aligned',
  },
  {
    label: 'Entity Significance > Raw Activity',
    classA: TC.ENTITY_CONTEXT,
    classB: TC.ONCHAIN_BEHAVIOR,
    interpretation: (dir) =>
      dir === 'stronger'
        ? 'Entity labeling is strong but raw activity is thin — known actors, low volume'
        : dir === 'weaker'
          ? 'Activity is visible but actor identity is unknown — interpretation risk'
          : 'Entity labeling and on-chain activity are proportional',
  },
  {
    label: 'DEX Fresh > Market Established',
    classA: TC.DEX_EMERGENCE,
    classB: TC.MARKET_SURFACE,
    interpretation: (dir) =>
      dir === 'stronger'
        ? 'DEX emergence signals ahead of broad market recognition — early discovery window'
        : dir === 'weaker'
          ? 'Market surface visible but DEX signals are weak — late-stage or non-DEX asset'
          : 'DEX and market surface are aligned',
  },
];

const TENSION_THRESHOLD = 0.15;

function resolveDirection(strengthA: number, strengthB: number): TensionDirection {
  const diff = strengthA - strengthB;
  if (diff > TENSION_THRESHOLD) return 'stronger';
  if (diff < -TENSION_THRESHOLD) return 'weaker';
  return 'neutral';
}

function strengthFromVisibility(vis: ClassVisibility, rawStrength: number): number {
  const visibilityMultiplier: Record<ClassVisibility, number> = {
    healthy: 1.0,
    partial: 0.6,
    degraded: 0.3,
    stale_dominant: 0.15,
    blind: 0.0,
  };
  return rawStrength * (visibilityMultiplier[vis] ?? 0);
}

export function computeTensions(input: TensionComputeInput): TensionComputeOutput {
  const stateMap = new Map<TruthClass, ClassStrengthInput>();
  for (const s of input.classStates) {
    stateMap.set(s.truthClass, s);
  }

  const tensions: CrossClassTension[] = [];

  for (const template of TENSION_TEMPLATES) {
    const stateA = stateMap.get(template.classA);
    const stateB = stateMap.get(template.classB);

    const effectiveA = stateA ? strengthFromVisibility(stateA.visibility, stateA.strength) : 0;
    const effectiveB = stateB ? strengthFromVisibility(stateB.visibility, stateB.strength) : 0;

    const direction = resolveDirection(effectiveA, effectiveB);
    if (direction === 'neutral') continue;

    const magnitude = Math.abs(effectiveA - effectiveB);

    tensions.push({
      label: template.label,
      classA: template.classA,
      classB: template.classB,
      direction,
      magnitude,
      interpretation: template.interpretation(direction),
    });
  }

  tensions.sort((a, b) => b.magnitude - a.magnitude);

  const summary = tensions.slice(0, 3).map(t => t.interpretation);

  return {
    tensions,
    dominantTension: tensions[0] ?? null,
    tensionCount: tensions.length,
    summary,
  };
}

export function getContradictionTensionSignals(input: TensionComputeInput): string[] {
  const result = computeTensions(input);
  const contradictions = CLASS_INTERACTIONS.filter(i => i.type === 'contradicts');

  const activeSignals: string[] = [];
  for (const t of result.tensions) {
    const matching = contradictions.find(
      c => (c.from === t.classA && c.to === t.classB) || (c.from === t.classB && c.to === t.classA),
    );
    if (matching?.tensionSignal) {
      activeSignals.push(matching.tensionSignal);
    }
  }
  return activeSignals;
}

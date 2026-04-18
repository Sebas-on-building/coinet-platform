/**
 * L8.9 — Final Definition of Layer 8
 *
 * §8.9.3 — Ratified canonical, minimal, expanded, negative, dependency
 * and output finality definitions for the Regime Engine. Future L8
 * documentation and extensions must remain consistent with this
 * definition (§8.9.9.1 INV-8.9-F/G).
 *
 * §8.9.3.2 — This is also where the 9-section structural form of L8
 * is permanently encoded; L8.9 closes the layer around it.
 */

export const L8_LAYER_ID = 'L8' as const;

/**
 * §8.9.3.1 — Canonical short definition.
 */
export const L8_CANONICAL_DEFINITION: string =
  'Layer 8 is the Regime Engine that classifies the environment in ' +
  'which validated truths and governed primitives are unfolding, and ' +
  'produces regime state, confidence, transition risk, and ' +
  'interpretation multipliers as evidence-backed, governed read ' +
  'surfaces for later layers.';

/**
 * §8.9.3.2 — Minimal semantic definition. If a proposed component does
 * not serve this sentence, it probably does not belong in L8.
 */
export const L8_MINIMAL_DEFINITION: string =
  'Layer 8 classifies the current environment, quantifies how much the ' +
  'rest of the system may rely on that classification, and conditions ' +
  'later interpretation without making scoring, scenario, or judgment ' +
  'decisions.';

/**
 * §8.9.3.2 — Expanded canonical definition. These sentences are part of
 * the frozen definition surface and are hashed into the ratification
 * artifact.
 */
export const L8_EXPANDED_DEFINITION: readonly string[] = Object.freeze([
  'Layer 8 takes governed L6 primitives and L7 validated truths and ' +
  'asks not just what exists or what is confirmed, but what environment ' +
  'those truths are happening inside.',
  'It resolves regime subjects, runs the deterministic regime runtime, ' +
  'consumes only legally admitted regime inputs, and emits primary, ' +
  'secondary, and coexistence regime state bound to ratified family ' +
  'templates.',
  'It governs reliance through regime confidence, transition risk, ' +
  'cap chains, and regime-specific multiplier profiles, keeping ' +
  'multipliers interpretive rather than determinative.',
  'It materializes regime truth through Layer 5 only and exposes ' +
  'current, historical, evidence, and lineage read surfaces that later ' +
  'layers consume without reclassifying regime from raw L6/L7 state.',
]);

/**
 * §8.9.3.3 — Negative definition. Anything on this list is NOT part of
 * Layer 8.
 */
export const L8_NEGATIVE_DEFINITION: readonly string[] = Object.freeze([
  'a scoring engine',
  'a scenario engine',
  'a final judgment layer',
  'a recommendation layer',
  'a validation engine',
  'a sequence engine',
  'a forecasting engine',
]);

/**
 * §8.9.3 — Dependency finality. L8 consumes these dependencies as
 * frozen law and may never compensate for missing lower-layer law
 * locally.
 */
export interface L8DependencyFinality {
  readonly L3: readonly string[];
  readonly L4: readonly string[];
  readonly L5: readonly string[];
  readonly L6: readonly string[];
  readonly L7: readonly string[];
}

export const L8_DEPENDENCY_FINALITY: L8DependencyFinality = Object.freeze({
  L3: Object.freeze([
    'canonical truth', 'identity', 'metrics',
    'reconciliation', 'mutation/version law',
  ]),
  L4: Object.freeze([
    'relational intelligence', 'graph context', 'propagation',
  ]),
  L5: Object.freeze([
    'persistence authority', 'historical lineage',
    'replay', 'repair', 'durability', 'evidence storage',
  ]),
  L6: Object.freeze([
    'governed feature primitives', 'governed event primitives',
    'feature families', 'event families', 'legal read surfaces',
  ]),
  L7: Object.freeze([
    'validation assessments', 'contradiction bundles',
    'confidence posture', 'restriction profiles',
    'validation lineage',
  ]),
}) as L8DependencyFinality;

/**
 * §8.9.3.2 — Output finality. Layer 8 produces exactly these surfaces
 * for later layers.
 */
export const L8_OUTPUT_FINALITY: readonly string[] = Object.freeze([
  'regime state (primary, secondary, coexistence, readiness)',
  'regime confidence profiles (banded + cap-chained)',
  'regime transition risk profiles',
  'regime-specific multiplier profiles (interpretive only)',
  'regime evidence packs and lineage',
  'current/historical/evidence/lineage read surfaces',
]);

/**
 * §8.9.3.1 — The ratified 9-section structural form of Layer 8.
 */
export const L8_STRUCTURAL_FORM: readonly string[] = Object.freeze([
  'L8.1 Constitutional boundary',
  'L8.2 Regime doctrine and object model',
  'L8.3 Executable contracts',
  'L8.4 Deterministic runtime',
  'L8.5 Input admissibility and consumption law',
  'L8.6 Family templates and rollout law',
  'L8.7 Reliance governance (confidence, transition, multipliers)',
  'L8.8 Persistence, read surfaces, replay/repair, serving law',
  'L8.9 Closure, ratification, freeze, and downstream-dependency law',
]);

/**
 * §8.9.3.1 / §8.9.9.1 INV-8.9-G — Causal execution sequence. L8.9 must
 * detect and reject any permutation of this order.
 */
export const L8_EXECUTION_SEQUENCE: readonly string[] = Object.freeze([
  'L8.1', 'L8.2', 'L8.3', 'L8.4', 'L8.5',
  'L8.6', 'L8.7', 'L8.8', 'L8.9',
]);

/**
 * Sublayers that must be present, certified, and green before L8.9
 * may ratify the layer. L8.9 itself is not a prerequisite for itself.
 */
export const L8_REQUIRED_SUBLAYERS: readonly string[] = Object.freeze([
  'L8.1', 'L8.2', 'L8.3', 'L8.4',
  'L8.5', 'L8.6', 'L8.7', 'L8.8',
]);

/**
 * Sentences representing the ratified definition surface. Used by the
 * completion validator and INV-8.9-F to detect contradiction with the
 * canonical L8 definition.
 */
export const L8_DEFINITION_SURFACE: readonly string[] = Object.freeze([
  L8_CANONICAL_DEFINITION,
  L8_MINIMAL_DEFINITION,
  ...L8_EXPANDED_DEFINITION,
]);

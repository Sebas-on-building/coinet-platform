/**
 * L9.9 — Final Definition of Layer 9
 *
 * §9.9.1 / §9.9.5 / §9.9.6 — Ratified canonical, minimal, expanded,
 * negative, dependency, and output finality definitions for the
 * Sequence & Temporal Engine. Future L9 documentation and extensions
 * must remain consistent with this definition (§9.9.4.1 INV-9.9-D/G).
 *
 * §9.9.1.3 — This is also where the 9-section structural form of L9 is
 * permanently encoded; L9.9 closes the layer around it.
 */

export const L9_LAYER_ID = 'L9' as const;

/**
 * §9.9.1.2 — Canonical short definition.
 */
export const L9_CANONICAL_DEFINITION: string =
  'Layer 9 is the Sequence & Temporal Engine that converts governed ' +
  'lower-layer truth into governed temporal meaning by classifying ' +
  'ordered signal chains, lead-lag structure, phase progression, ' +
  'change-point evidence, decay posture, and post-event windows as ' +
  'evidence-backed, governed read surfaces for later layers.';

/**
 * §9.9.1.2 — Minimal semantic definition. If a proposed component does
 * not serve this sentence, it probably does not belong in L9.
 */
export const L9_MINIMAL_DEFINITION: string =
  'Layer 9 classifies how governed truths unfolded through time, bounds ' +
  'how much later layers may rely on that classification, and preserves ' +
  'replay and repair meaning without inventing causality, leaking into ' +
  'judgment/scenario/scoring, or re-validating lower-layer truth.';

/**
 * §9.9.1.2 / §9.9.3.1 — Expanded canonical definition. These sentences
 * are part of the frozen definition surface and are hashed into the
 * ratification artifact.
 */
export const L9_EXPANDED_DEFINITION: readonly string[] = Object.freeze([
  'Layer 9 takes governed L6 primitives, L7 validated truths, and L8 ' +
  'regime posture and asks not what exists, not what is confirmed, ' +
  'and not what environment surrounds it, but in what order those ' +
  'truths unfolded and what that ordering governs.',
  'It resolves sequence subjects, runs the deterministic sequence ' +
  'runtime, consumes only legally admitted sequence inputs, and emits ' +
  'sequence chains, lead-lag profiles, phase states, change-point ' +
  'evidence, decay profiles, and post-event windows bound to ratified ' +
  'family templates.',
  'It governs reliance through sequence confidence, cap chains, ' +
  'restriction rights, and causal restraint, keeping temporal ' +
  'adjacency interpretive rather than causal.',
  'It materializes sequence truth through Layer 5 only and exposes ' +
  'current, historical, evidence, and lineage read surfaces that later ' +
  'layers consume without reconstructing sequence meaning from raw ' +
  'L6/L7/L8 state.',
]);

/**
 * §9.9.1.2 — Negative definition. Anything on this list is NOT part of
 * Layer 9.
 */
export const L9_NEGATIVE_DEFINITION: readonly string[] = Object.freeze([
  'a judgment engine',
  'a scenario engine',
  'a scoring engine',
  'a recommendation engine',
  'a hypothesis engine',
  'a validation engine',
  'a regime engine',
  'a forecasting engine',
  'a causal-inference engine',
]);

/**
 * §9.9.1.2 — Dependency finality. L9 consumes these dependencies as
 * frozen law and may never compensate for missing lower-layer law
 * locally.
 */
export interface L9DependencyFinality {
  readonly L3: readonly string[];
  readonly L4: readonly string[];
  readonly L5: readonly string[];
  readonly L6: readonly string[];
  readonly L7: readonly string[];
  readonly L8: readonly string[];
}

export const L9_DEPENDENCY_FINALITY: L9DependencyFinality = Object.freeze({
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
  L8: Object.freeze([
    'regime state', 'regime confidence',
    'regime transition risk', 'regime multipliers',
    'regime evidence', 'regime lineage',
  ]),
}) as L9DependencyFinality;

/**
 * §9.9.1.2 / §9.9.5.1 — Output finality. Layer 9 produces exactly these
 * surfaces for later layers.
 */
export const L9_OUTPUT_FINALITY: readonly string[] = Object.freeze([
  'sequence chain assessments',
  'lead-lag profiles',
  'phase states (progression, change-point)',
  'decay profiles and post-event windows',
  'sequence confidence profiles (banded + cap-chained)',
  'sequence restriction profiles',
  'causal-restraint profiles',
  'sequence evidence packs and lineage',
  'current/historical/evidence/lineage read surfaces',
]);

/**
 * §9.9.1.3 — The ratified 9-section structural form of Layer 9.
 */
export const L9_STRUCTURAL_FORM: readonly string[] = Object.freeze([
  'L9.1 Constitutional boundary',
  'L9.2 Temporal ontology and object model',
  'L9.3 Universal contracts and emission law',
  'L9.4 Deterministic runtime DAG',
  'L9.5 Temporal-semantics lawbook',
  'L9.6 Family-template lawbook',
  'L9.7 Reliance-governance lawbook',
  'L9.8 Persistence-and-serving constitution',
  'L9.9 Closure, ratification, and completion-standard layer',
]);

/**
 * §9.9.1.3 / §9.9.4.1 INV-9.9-G — Causal execution sequence. L9.9 must
 * detect and reject any permutation of this order.
 */
export const L9_EXECUTION_SEQUENCE: readonly string[] = Object.freeze([
  'L9.1', 'L9.2', 'L9.3', 'L9.4', 'L9.5',
  'L9.6', 'L9.7', 'L9.8', 'L9.9',
]);

/**
 * Sublayers that must be present, certified, and green before L9.9 may
 * ratify the layer. L9.9 itself is not a prerequisite for itself.
 */
export const L9_REQUIRED_SUBLAYERS: readonly string[] = Object.freeze([
  'L9.1', 'L9.2', 'L9.3', 'L9.4',
  'L9.5', 'L9.6', 'L9.7', 'L9.8',
]);

/**
 * Sentences representing the ratified definition surface. Used by the
 * completion validator and INV-9.9-D to detect contradiction with the
 * canonical L9 definition.
 */
export const L9_DEFINITION_SURFACE: readonly string[] = Object.freeze([
  L9_CANONICAL_DEFINITION,
  L9_MINIMAL_DEFINITION,
  ...L9_EXPANDED_DEFINITION,
]);

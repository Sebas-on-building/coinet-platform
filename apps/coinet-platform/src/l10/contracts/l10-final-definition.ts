/**
 * L10.9 — Final Definition of Layer 10
 *
 * §10.9.3 / §10.9.13 INV-10.9-D/G — Ratified canonical, minimal,
 * expanded, negative, dependency, and output finality definitions for
 * the Hypothesis Engine. Future L10 documentation and extensions must
 * remain consistent with this definition (INV-10.9-D / INV-10.9-G).
 *
 * §10.9.3.4 — This is also where the 9-section structural form of L10
 * is permanently encoded; L10.9 closes the layer around it.
 */

export const L10_LAYER_ID = 'L10' as const;

/**
 * §10.9.3.3 — Canonical short definition.
 */
export const L10_CANONICAL_DEFINITION: string =
  'Layer 10 is the Hypothesis Engine that constructs, compares, ranks, ' +
  'and serves competing explanations for a governed market state ' +
  'using frozen lower-layer truth from L3–L9, producing hypothesis ' +
  'assessments, rankings, spread profiles, shift-condition sets, ' +
  'reliance profiles, and evidence-backed read surfaces.';

/**
 * §10.9.3.3 — Minimal semantic definition. If a proposed component
 * does not serve this sentence, it probably does not belong in L10.
 */
export const L10_MINIMAL_DEFINITION: string =
  'Layer 10 explains how the system understands the current market ' +
  'state by ranking competing hypotheses, governs reliance on those ' +
  'rankings, persists explanatory truth through L5, and exposes ' +
  'governed read surfaces — without producing judgment, scenarios, ' +
  'scores, or recommendations.';

/**
 * §10.9.3.3 / §10.9.4 — Expanded canonical definition. These
 * sentences are part of the frozen definition surface and are hashed
 * into the ratification artifact.
 */
export const L10_EXPANDED_DEFINITION: readonly string[] = Object.freeze([
  'Layer 10 takes governed L3 canonical truth, L6 governed primitives, ' +
  'L7 validation posture, L8 regime posture, and L9 sequence/temporal ' +
  'truth and asks not whether truth exists, not whether it is ' +
  'confirmed, not what regime surrounds it, and not in what order it ' +
  'unfolded — but what story best explains it.',
  'It generates legal hypothesis candidates, resolves support, ' +
  'contradiction, confirmation, invalidation, and shift-condition ' +
  'evidence, ranks competing explanations, surfaces ranking spread, ' +
  'and bounds reliance through confidence, cap chains, restriction ' +
  'rights, and readiness classes.',
  'It governs reliance so that primary hypotheses cannot masquerade ' +
  'as final truth, narrow spread cannot be hidden, contradiction and ' +
  'invalidation cannot be laundered, and L7/L8/L9 posture cannot be ' +
  'silently bypassed.',
  'It materializes hypothesis truth through Layer 5 only and exposes ' +
  'current, historical, evidence, and lineage read surfaces that ' +
  'later layers consume without reconstructing hypothesis meaning ' +
  'from raw L6/L7/L8/L9 state.',
]);

/**
 * §10.9.3.3 — Negative definition. Anything on this list is NOT part
 * of Layer 10.
 */
export const L10_NEGATIVE_DEFINITION: readonly string[] = Object.freeze([
  'a judgment engine',
  'a scenario engine',
  'a scoring engine',
  'a recommendation engine',
  'a trade-instruction engine',
  'a sequence engine',
  'a regime engine',
  'a validation engine',
  'a forecasting engine',
  'a causal-inference engine',
]);

/**
 * §10.9.3.3 — Dependency finality. L10 consumes these dependencies as
 * frozen law and may never compensate for missing lower-layer law
 * locally.
 */
export interface L10DependencyFinality {
  readonly L3: readonly string[];
  readonly L4: readonly string[];
  readonly L5: readonly string[];
  readonly L6: readonly string[];
  readonly L7: readonly string[];
  readonly L8: readonly string[];
  readonly L9: readonly string[];
}

export const L10_DEPENDENCY_FINALITY: L10DependencyFinality = Object.freeze({
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
  L9: Object.freeze([
    'sequence chains', 'lead-lag profiles',
    'phase states', 'change-point evidence', 'decay posture',
    'post-event windows', 'sequence reliance posture',
  ]),
}) as L10DependencyFinality;

/**
 * §10.9.3.3 / §10.9.7.3 — Output finality. Layer 10 produces exactly
 * these surfaces for later layers.
 */
export const L10_OUTPUT_FINALITY: readonly string[] = Object.freeze([
  'hypothesis assessments',
  'hypothesis rankings (primary + alternatives)',
  'hypothesis spread profiles',
  'shift-condition sets',
  'hypothesis reliance profiles (confidence + caps + restriction + readiness)',
  'hypothesis evidence packs and lineage',
  'current/historical/evidence/lineage read surfaces',
]);

/**
 * §10.9.3.4 — The ratified 9-section structural form of Layer 10.
 */
export const L10_STRUCTURAL_FORM: readonly string[] = Object.freeze([
  'L10.1 Constitutional boundary',
  'L10.2 Explanatory object model',
  'L10.3 Universal contracts and output law',
  'L10.4 Deterministic runtime DAG',
  'L10.5 Evidence-semantics lawbook',
  'L10.6 Family-template lawbook',
  'L10.7 Reliance-governance lawbook',
  'L10.8 Persistence-and-serving constitution',
  'L10.9 Closure, ratification, and completion-standard layer',
]);

/**
 * §10.9.3.5 / §10.9.13 INV-10.9-G — Causal execution sequence. L10.9
 * must detect and reject any permutation of this order.
 */
export const L10_EXECUTION_SEQUENCE: readonly string[] = Object.freeze([
  'L10.1', 'L10.2', 'L10.3', 'L10.4', 'L10.5',
  'L10.6', 'L10.7', 'L10.8', 'L10.9',
]);

/**
 * Sublayers that must be present, certified, and green before L10.9
 * may ratify the layer. L10.9 itself is not a prerequisite for
 * itself.
 */
export const L10_REQUIRED_SUBLAYERS: readonly string[] = Object.freeze([
  'L10.1', 'L10.2', 'L10.3', 'L10.4',
  'L10.5', 'L10.6', 'L10.7', 'L10.8',
]);

/**
 * Sentences representing the ratified definition surface. Used by
 * the completion validator and INV-10.9-D to detect contradiction
 * with the canonical L10 definition.
 */
export const L10_DEFINITION_SURFACE: readonly string[] = Object.freeze([
  L10_CANONICAL_DEFINITION,
  L10_MINIMAL_DEFINITION,
  ...L10_EXPANDED_DEFINITION,
]);

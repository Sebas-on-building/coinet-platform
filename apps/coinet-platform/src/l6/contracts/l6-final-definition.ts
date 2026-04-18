/**
 * L6.9 — Final Definition of Layer 6
 *
 * §6.9.2 — Ratified canonical, expanded, minimal, negative, and
 * dependency/output finality definitions. Future L6 documentation and
 * extensions must remain consistent with this definition (§6.9.2.6,
 * §6.9.9.1 INV-6.9-F).
 */

export const L6_LAYER_ID = 'L6' as const;

/**
 * §6.9.2.1 — Canonical short definition.
 */
export const L6_CANONICAL_DEFINITION: string =
  'Layer 6 is the Feature & Event Engine that converts governed facts ' +
  'into governed intelligence primitives.';

/**
 * §6.9.2.3 — Minimal semantic definition. If a proposed component does
 * not serve this sentence, it likely does not belong in L6.
 */
export const L6_MINIMAL_DEFINITION: string =
  'Layer 6 turns governed lower-layer state into governed features and events.';

/**
 * §6.9.2.2 — Expanded definition.
 */
export const L6_EXPANDED_DEFINITION: readonly string[] = Object.freeze([
  'Layer 6 is the first true intelligence-construction layer in Coinet.',
  'It does not define internal reality, graph legality, storage authority, or final judgment.',
  'It transforms the governed outputs of L3/L4/L5 into reusable, contract-safe,',
  'deterministic primitives that later layers may consume without reinterpreting raw facts.',
]);

/**
 * §6.9.2.4 — Dependency finality. Layer 6 consumes these dependencies as
 * frozen law and may never compensate for missing lower-layer law locally.
 */
export interface L6DependencyFinality {
  readonly L3: readonly string[];
  readonly L4: readonly string[];
  readonly L5: readonly string[];
}

export const L6_DEPENDENCY_FINALITY: L6DependencyFinality = Object.freeze({
  L3: Object.freeze([
    'canonical truth',
    'identity',
    'metrics',
    'confidence',
    'reconciliation',
    'mutation/version law',
  ]),
  L4: Object.freeze([
    'relational intelligence',
    'graph context',
    'propagation',
    'context packages',
  ]),
  L5: Object.freeze([
    'persistence',
    'storage authority',
    'replay',
    'repair',
    'durability',
  ]),
}) as L6DependencyFinality;

/**
 * §6.9.2.5 — Output finality. Layer 6 produces exactly these surfaces.
 */
export const L6_OUTPUT_FINALITY: readonly string[] = Object.freeze([
  'feature history',
  'current feature state',
  'event instances and lifecycle transitions',
  'evidence packs',
  'read surfaces for current/history/evidence/recompute lineage',
]);

/**
 * §6.9.2.6 — Negative definition. Anything from this list is NOT part of
 * Layer 6.
 */
export const L6_NEGATIVE_DEFINITION: readonly string[] = Object.freeze([
  'a dashboard',
  'a report engine',
  'a score-finalization layer',
  'a scenario layer',
  'a judgment layer',
  'a recommendation layer',
]);

/**
 * §6.9.7.1 — The ratified implementation/execution order of the layer.
 * §6.9.9.1 INV-6.9-G requires this order to remain causally correct.
 */
export const L6_EXECUTION_SEQUENCE: readonly string[] = Object.freeze([
  'L6.1', 'L6.2', 'L6.3', 'L6.4', 'L6.5',
  'L6.6', 'L6.7', 'L6.8', 'L6.9',
]);

/**
 * §6.9.6 — The ratified 9-section structural form of Layer 6.
 */
export const L6_STRUCTURAL_FORM: readonly string[] = Object.freeze([
  'L6.1 boundary',
  'L6.2 primitives',
  'L6.3 contracts',
  'L6.4 runtime',
  'L6.5 temporal law',
  'L6.6 production families',
  'L6.7 persistence/read law',
  'L6.8 assurance',
  'L6.9 closure',
]);

export const REQUIRED_SUBLAYERS: readonly string[] = Object.freeze([
  'L6.1', 'L6.2', 'L6.3', 'L6.4', 'L6.5', 'L6.6', 'L6.7', 'L6.8',
]);

/**
 * Sentences representing the ratified definition surface. Used by the
 * completion validator and INV-6.9-F to detect contradiction.
 */
export const L6_DEFINITION_SURFACE: readonly string[] = Object.freeze([
  L6_CANONICAL_DEFINITION,
  L6_MINIMAL_DEFINITION,
  ...L6_EXPANDED_DEFINITION,
]);

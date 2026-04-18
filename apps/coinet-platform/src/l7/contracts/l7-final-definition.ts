/**
 * L7.9 — Final Definition of Layer 7
 *
 * §7.9.2 — Ratified canonical, minimal, expanded, negative, dependency
 * and output finality definitions for the Validation & Contradiction
 * Engine. Future L7 documentation and extensions must remain consistent
 * with this definition (§7.9.9.1 INV-7.9-F).
 *
 * §7.9.2.5 — This is also where the 9-section structural form of L7
 * is permanently encoded; L7.9 closes the layer around it.
 */

export const L7_LAYER_ID = 'L7' as const;

/**
 * §7.9.2.1 — Canonical short definition.
 */
export const L7_CANONICAL_DEFINITION: string =
  'Layer 7 is the Validation & Contradiction Engine that truth-tests ' +
  'governed market stories, composite signal states, and claim candidates ' +
  'against confirmation, contradiction, incompleteness, staleness, ' +
  'ambiguity, and degraded support.';

/**
 * §7.9.2.2 — Minimal semantic definition. If a proposed component does
 * not serve this sentence, it probably does not belong in L7.
 */
export const L7_MINIMAL_DEFINITION: string =
  'Layer 7 truth-tests governed claims and determines what is supported, ' +
  'what is contradicted, how reliable that result is, and how later ' +
  'layers may use it.';

/**
 * §7.9.2.3 — Expanded canonical definition.
 */
export const L7_EXPANDED_DEFINITION: readonly string[] = Object.freeze([
  'Layer 7 is the first layer in Coinet that takes governed primitives and ' +
  'asks not just what exists or what changed, but whether an interpretation ' +
  'actually survives truth-testing.',
  'It constructs structured validation subjects, resolves support and ' +
  'challenge surfaces, detects and clusters contradictions, and preserves ' +
  'incompleteness, staleness, ambiguity, and degradation explicitly.',
  'It assigns legal validation classes, derives formal reliance through ' +
  'confidence law, and derives downstream rights through restriction law.',
  'It materializes all of that through Layer 5 only and exposes stable ' +
  'read surfaces for higher layers.',
]);

/**
 * §7.9.2.4 — Negative definition. Anything on this list is NOT part of
 * Layer 7.
 */
export const L7_NEGATIVE_DEFINITION: readonly string[] = Object.freeze([
  'a regime engine',
  'a sequence engine',
  'a scenario engine',
  'a deterministic scoring layer',
  'a final judgment layer',
  'a recommendation layer',
]);

/**
 * §7.9.2 — Dependency finality. L7 consumes these dependencies as frozen
 * law and may never compensate for missing lower-layer law locally.
 */
export interface L7DependencyFinality {
  readonly L3: readonly string[];
  readonly L4: readonly string[];
  readonly L5: readonly string[];
  readonly L6: readonly string[];
}

export const L7_DEPENDENCY_FINALITY: L7DependencyFinality = Object.freeze({
  L3: Object.freeze([
    'canonical truth', 'identity', 'metrics', 'confidence',
    'reconciliation', 'mutation/version law',
  ]),
  L4: Object.freeze([
    'relational intelligence', 'graph context',
    'propagation', 'context packages',
  ]),
  L5: Object.freeze([
    'persistence authority', 'historical lineage',
    'replay', 'repair', 'durability', 'evidence storage',
  ]),
  L6: Object.freeze([
    'governed feature primitives', 'governed event primitives',
    'feature families', 'event families',
    'evidence packs', 'legal read surfaces',
  ]),
}) as L7DependencyFinality;

/**
 * §7.9.1.3 — Output finality. Layer 7 produces exactly these surfaces.
 */
export const L7_OUTPUT_FINALITY: readonly string[] = Object.freeze([
  'validation assessments (class + modifiers)',
  'contradiction bundles',
  'confidence assessments',
  'restriction profiles',
  'evidence-backed read surfaces for later layers',
  'validation lineage for replay/repair',
]);

/**
 * §7.9.2.5 — The ratified 9-section structural form of Layer 7.
 */
export const L7_STRUCTURAL_FORM: readonly string[] = Object.freeze([
  'L7.1 Constitutional boundary',
  'L7.2 Validation doctrine and object model',
  'L7.3 Executable contracts',
  'L7.4 Deterministic runtime',
  'L7.5 Semantic lawbook',
  'L7.6 Confidence and restriction law',
  'L7.7 Persistence and serving constitution',
  'L7.8 Assurance and certification',
  'L7.9 Ratification and closure',
]);

/**
 * §7.9.2.5 / §7.9.9.1 INV-7.9-G — Causal execution sequence. L7.9 must
 * detect and reject any permutation of this order.
 */
export const L7_EXECUTION_SEQUENCE: readonly string[] = Object.freeze([
  'L7.1', 'L7.2', 'L7.3', 'L7.4', 'L7.5',
  'L7.6', 'L7.7', 'L7.8', 'L7.9',
]);

/**
 * Sublayers that must be present, certified, and green before L7.9 may
 * ratify the layer. L7.9 itself is not a prerequisite for itself.
 */
export const L7_REQUIRED_SUBLAYERS: readonly string[] = Object.freeze([
  'L7.1', 'L7.2', 'L7.3', 'L7.4',
  'L7.5', 'L7.6', 'L7.7', 'L7.8',
]);

/**
 * Sentences representing the ratified definition surface. Used by the
 * completion validator and INV-7.9-F to detect contradiction with the
 * canonical L7 definition.
 */
export const L7_DEFINITION_SURFACE: readonly string[] = Object.freeze([
  L7_CANONICAL_DEFINITION,
  L7_MINIMAL_DEFINITION,
  ...L7_EXPANDED_DEFINITION,
]);

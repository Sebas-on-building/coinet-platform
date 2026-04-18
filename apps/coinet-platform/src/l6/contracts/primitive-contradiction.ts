/**
 * L6.2 — Contradiction Preservation Contract
 *
 * §6.2.7.4 / §6.2.7.5 — Layer 6 must preserve contradiction as first-class
 * artifacts. Layer 6 does NOT resolve contradiction; it represents it.
 */

export enum L6ContradictionArtifactType {
  DIVERGENCE_FEATURE = 'DIVERGENCE_FEATURE',
  CONTRADICTION_MARKER = 'CONTRADICTION_MARKER',
  EVIDENCE_SEPARATED_STATE = 'EVIDENCE_SEPARATED_STATE',
}

export const ALL_CONTRADICTION_ARTIFACT_TYPES: readonly L6ContradictionArtifactType[] =
  Object.values(L6ContradictionArtifactType);

export interface ContradictionSupportSpec {
  readonly supports: boolean;
  readonly artifactType: L6ContradictionArtifactType | null;
  readonly preservesSourceSeparation: boolean;
  readonly rationale: string;
}

export const FORBIDDEN_COLLAPSE_TOKENS: readonly string[] = [
  'AVERAGE_CONFLICTING',
  'COLLAPSE_TO_SINGLE_TRUTH',
  'RESOLVE_DISAGREEMENT',
  'SMOOTH_DIVERGENCE',
  'FINAL_COMBINED_TRUTH',
  'NORMALIZE_CONFLICT_AWAY',
];

export function isForbiddenCollapseToken(token: string): boolean {
  return FORBIDDEN_COLLAPSE_TOKENS.includes(token.toUpperCase());
}

export function describesContradictionLegally(spec: ContradictionSupportSpec): boolean {
  if (!spec.supports) return true;
  if (!spec.artifactType) return false;
  if (!spec.preservesSourceSeparation) return false;
  return true;
}

/**
 * L13.2 — Contradiction Preservation Engine
 *
 * §13.2.14 — Ensures contradictions survive package building,
 * priority ranking, and compression. A dropped material
 * contradiction blocks the package; contradictions may be
 * summarized but not erased.
 */

import { fnv1a } from './_fnv1a';

const POLICY_V = 'l13.input-package.v1';

export interface L13ContradictionPreservationInput {
  readonly request_id: string;
  /** All material/active contradiction refs from L7/L12. */
  readonly active_contradiction_refs: readonly string[];
  /** Refs that survived after compression. */
  readonly preserved_after_compression: readonly string[];
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

export interface L13ContradictionPreservationResult {
  readonly preservation_result_id: string;

  readonly active_contradiction_refs: readonly string[];
  readonly preserved_contradiction_refs: readonly string[];
  readonly dropped_contradiction_refs: readonly string[];

  readonly all_material_contradictions_preserved: boolean;

  readonly preservation_failures: readonly string[];

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly replay_hash: string;
  readonly policy_version: string;
}

export function evaluateL13ContradictionPreservation(
  input: L13ContradictionPreservationInput,
): L13ContradictionPreservationResult {
  const active = [...input.active_contradiction_refs].sort();
  const preserved = active.filter(r =>
    input.preserved_after_compression.includes(r),
  );
  const dropped = active.filter(
    r => !input.preserved_after_compression.includes(r),
  );

  const failures: string[] = [];
  for (const r of dropped) {
    failures.push(
      `material contradiction "${r}" dropped during compression`,
    );
  }

  const replayHash = fnv1a(
    [
      input.request_id,
      active.join(','),
      preserved.join(','),
      dropped.join(','),
    ].join('|'),
  );

  return {
    preservation_result_id: `l13d.preservation.${replayHash}`,
    active_contradiction_refs: active,
    preserved_contradiction_refs: preserved,
    dropped_contradiction_refs: dropped,
    all_material_contradictions_preserved: dropped.length === 0,
    preservation_failures: failures,
    evidence_refs: [...(input.evidence_refs ?? [])].sort(),
    lineage_refs: [...(input.lineage_refs ?? [])].sort(),
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

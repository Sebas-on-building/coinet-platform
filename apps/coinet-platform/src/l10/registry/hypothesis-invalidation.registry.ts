/**
 * L10.5 — HypothesisInvalidationPolicy Registry
 *
 * §10.5.9.1 — Holds invalidation-policy declarations per candidate.
 */

import { L10HypothesisInvalidationPolicy } from '../contracts/hypothesis-invalidation-policy';

export class L10HypothesisInvalidationPolicyRegistry {
  private readonly byId = new Map<string, L10HypothesisInvalidationPolicy>();
  private readonly byCandidate =
    new Map<string, L10HypothesisInvalidationPolicy>();

  register(p: L10HypothesisInvalidationPolicy): void {
    if (!p.policy_id) {
      throw new Error('L10.5 invalidation registry: missing policy_id');
    }
    if (this.byId.has(p.policy_id)) {
      throw new Error(
        `L10.5 invalidation registry: duplicate policy_id '${p.policy_id}'`,
      );
    }
    if (this.byCandidate.has(p.hypothesis_candidate_id)) {
      throw new Error(
        `L10.5 invalidation registry: duplicate invalidation policy for ` +
          `candidate '${p.hypothesis_candidate_id}'`,
      );
    }
    this.byId.set(p.policy_id, p);
    this.byCandidate.set(p.hypothesis_candidate_id, p);
  }

  has(policy_id: string): boolean { return this.byId.has(policy_id); }
  get(policy_id: string): L10HypothesisInvalidationPolicy | undefined {
    return this.byId.get(policy_id);
  }
  getForCandidate(
    hypothesis_candidate_id: string,
  ): L10HypothesisInvalidationPolicy | undefined {
    return this.byCandidate.get(hypothesis_candidate_id);
  }
  size(): number { return this.byId.size; }
  list(): readonly L10HypothesisInvalidationPolicy[] {
    return Array.from(this.byId.values());
  }
  clear(): void { this.byId.clear(); this.byCandidate.clear(); }
}

let _default: L10HypothesisInvalidationPolicyRegistry | null = null;
export function getDefaultL10InvalidationPolicyRegistry(): L10HypothesisInvalidationPolicyRegistry {
  if (!_default) _default = new L10HypothesisInvalidationPolicyRegistry();
  return _default;
}

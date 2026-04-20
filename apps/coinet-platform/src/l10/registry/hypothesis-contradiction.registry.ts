/**
 * L10.5 — HypothesisContradictionPolicy Registry
 *
 * §10.5.9.1 — Holds contradiction-policy declarations per candidate.
 */

import { L10HypothesisContradictionPolicy } from '../contracts/hypothesis-contradiction-policy';

export class L10HypothesisContradictionPolicyRegistry {
  private readonly byId = new Map<string, L10HypothesisContradictionPolicy>();
  private readonly byCandidate =
    new Map<string, L10HypothesisContradictionPolicy>();

  register(p: L10HypothesisContradictionPolicy): void {
    if (!p.policy_id) {
      throw new Error('L10.5 contradiction registry: missing policy_id');
    }
    if (this.byId.has(p.policy_id)) {
      throw new Error(
        `L10.5 contradiction registry: duplicate policy_id '${p.policy_id}'`,
      );
    }
    if (this.byCandidate.has(p.hypothesis_candidate_id)) {
      throw new Error(
        `L10.5 contradiction registry: duplicate contradiction policy for ` +
          `candidate '${p.hypothesis_candidate_id}'`,
      );
    }
    this.byId.set(p.policy_id, p);
    this.byCandidate.set(p.hypothesis_candidate_id, p);
  }

  has(policy_id: string): boolean { return this.byId.has(policy_id); }
  get(policy_id: string): L10HypothesisContradictionPolicy | undefined {
    return this.byId.get(policy_id);
  }
  getForCandidate(
    hypothesis_candidate_id: string,
  ): L10HypothesisContradictionPolicy | undefined {
    return this.byCandidate.get(hypothesis_candidate_id);
  }
  size(): number { return this.byId.size; }
  list(): readonly L10HypothesisContradictionPolicy[] {
    return Array.from(this.byId.values());
  }
  clear(): void { this.byId.clear(); this.byCandidate.clear(); }
}

let _default: L10HypothesisContradictionPolicyRegistry | null = null;
export function getDefaultL10ContradictionPolicyRegistry(): L10HypothesisContradictionPolicyRegistry {
  if (!_default) _default = new L10HypothesisContradictionPolicyRegistry();
  return _default;
}

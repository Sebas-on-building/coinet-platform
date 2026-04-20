/**
 * L10.5 — HypothesisSupportPolicy Registry
 *
 * §10.5.9.1 — Holds support-policy declarations for candidates.
 * Rejects duplicate policy registrations per (candidate, version).
 */

import { L10HypothesisSupportPolicy } from '../contracts/hypothesis-support-policy';

export class L10HypothesisSupportPolicyRegistry {
  private readonly byId = new Map<string, L10HypothesisSupportPolicy>();
  private readonly byCandidate = new Map<string, L10HypothesisSupportPolicy>();

  register(p: L10HypothesisSupportPolicy): void {
    if (!p.policy_id) {
      throw new Error('L10.5 support registry: missing policy_id');
    }
    if (this.byId.has(p.policy_id)) {
      throw new Error(
        `L10.5 support registry: duplicate policy_id '${p.policy_id}'`,
      );
    }
    if (this.byCandidate.has(p.hypothesis_candidate_id)) {
      throw new Error(
        `L10.5 support registry: duplicate support policy for candidate ` +
          `'${p.hypothesis_candidate_id}'`,
      );
    }
    this.byId.set(p.policy_id, p);
    this.byCandidate.set(p.hypothesis_candidate_id, p);
  }

  has(policy_id: string): boolean { return this.byId.has(policy_id); }
  get(policy_id: string): L10HypothesisSupportPolicy | undefined {
    return this.byId.get(policy_id);
  }
  getForCandidate(
    hypothesis_candidate_id: string,
  ): L10HypothesisSupportPolicy | undefined {
    return this.byCandidate.get(hypothesis_candidate_id);
  }
  size(): number { return this.byId.size; }
  list(): readonly L10HypothesisSupportPolicy[] {
    return Array.from(this.byId.values());
  }
  clear(): void { this.byId.clear(); this.byCandidate.clear(); }
}

let _default: L10HypothesisSupportPolicyRegistry | null = null;
export function getDefaultL10SupportPolicyRegistry(): L10HypothesisSupportPolicyRegistry {
  if (!_default) _default = new L10HypothesisSupportPolicyRegistry();
  return _default;
}

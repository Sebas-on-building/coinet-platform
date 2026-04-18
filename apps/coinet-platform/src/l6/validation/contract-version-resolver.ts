/**
 * L6.3 — Contract Version Resolver
 *
 * §6.3.7.2 — Deterministic resolver that, given a registered set of contract
 * versions for one primitive, returns:
 *   - the latest version
 *   - the compatibility classification between two specific versions
 *   - a deterministic ordering of all known versions
 */

import {
  compareContractVersions,
  parseContractVersion,
  resolveLatestVersion,
  classifyVersionDelta,
  L6ContractCompatibilityClass,
  SemanticVersion,
  ContractVersionDelta,
} from '../contracts/contract-versioning';

export interface RegisteredContractVersion {
  readonly primitive_id: string;
  readonly version: string;
  readonly registeredAt: string;
}

export class ContractVersionResolver {
  private readonly registry = new Map<string, RegisteredContractVersion[]>();

  register(entry: RegisteredContractVersion): void {
    const parsed = parseContractVersion(entry.version);
    if (!parsed) throw new Error(`[L6.3] Invalid contract version "${entry.version}".`);
    const list = this.registry.get(entry.primitive_id) ?? [];
    if (list.some(l => l.version === entry.version)) return;
    list.push(entry);
    list.sort((a, b) => compareContractVersions(
      parseContractVersion(a.version) as SemanticVersion,
      parseContractVersion(b.version) as SemanticVersion,
    ));
    this.registry.set(entry.primitive_id, list);
  }

  list(primitive_id: string): readonly RegisteredContractVersion[] {
    return this.registry.get(primitive_id) ?? [];
  }

  latest(primitive_id: string): string | null {
    const list = this.registry.get(primitive_id) ?? [];
    return resolveLatestVersion(list.map(l => l.version));
  }

  classify(primitive_id: string, from: string, to: string): ContractVersionDelta {
    return classifyVersionDelta(from, to);
  }

  isCompatible(primitive_id: string, from: string, to: string): boolean {
    const delta = classifyVersionDelta(from, to);
    return delta.classification === L6ContractCompatibilityClass.COMPATIBLE
        || delta.classification === L6ContractCompatibilityClass.MINOR_CHANGE;
  }

  clear(): void {
    this.registry.clear();
  }
}

export function createContractVersionResolver(): ContractVersionResolver {
  return new ContractVersionResolver();
}

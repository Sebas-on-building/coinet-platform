/**
 * L14.1 — Capability Policy Map
 *
 * §14.1.6 / §14.1.7 — Frozen capability policy. The full
 * allowed-capability set is enumerated and grouped; any
 * unrecognized capability claim must be rejected by validators.
 */

import {
  ALL_L14_ALLOWED_CAPABILITIES,
  L14_CAPABILITY_GROUP_OF,
  L14AllowedCapability,
  L14CapabilityGroup,
} from '../contracts/l14-capability-policy';

const ALLOWED_SET: ReadonlySet<L14AllowedCapability> =
  new Set(ALL_L14_ALLOWED_CAPABILITIES);

export function l14CapabilityAllowed(c: L14AllowedCapability): boolean {
  return ALLOWED_SET.has(c);
}

export function l14CapabilityGroupOf(
  c: L14AllowedCapability,
): L14CapabilityGroup {
  return L14_CAPABILITY_GROUP_OF[c];
}

export function getL14CapabilitiesInGroup(
  group: L14CapabilityGroup,
): readonly L14AllowedCapability[] {
  return ALL_L14_ALLOWED_CAPABILITIES.filter(
    c => L14_CAPABILITY_GROUP_OF[c] === group,
  );
}

/**
 * L14.2 — Deliverable Source Artifact Registry
 *
 * §14.2.10 — Frozen set of source artifact classes Layer 14 may
 * consume. Provides per-channel admissibility queries.
 */

import {
  ALL_L14_DELIVERABLE_SOURCE_ARTIFACT_CLASSES,
  L14DeliverableSourceArtifactClass,
} from '../contracts/deliverable-source-artifact';
import { L14DeliveryChannel } from '../contracts/delivery-channel';
import { getL14DeliveryChannelDefinition } from './delivery-channel.registry';

const REGISTERED: ReadonlySet<L14DeliverableSourceArtifactClass> =
  new Set(ALL_L14_DELIVERABLE_SOURCE_ARTIFACT_CLASSES);

export function l14SourceArtifactRegistered(
  cls: L14DeliverableSourceArtifactClass,
): boolean {
  return REGISTERED.has(cls);
}

export function l14SourceArtifactAllowedForChannel(
  cls: L14DeliverableSourceArtifactClass,
  channel: L14DeliveryChannel,
): boolean {
  const def = getL14DeliveryChannelDefinition(channel);
  if (!def) return false;
  return def.allowed_source_artifact_classes.includes(cls);
}

/**
 * L5.4 Universal Write Contract — Producer Registry
 *
 * §5.4.7 — Producer Registry and Ingress Legality
 */

import { L5ProducerLayer } from './producer-layer';
import { L5WriteClass } from './write-class';
import { L5IngressMode } from './ingress-mode';
import { L5DerivationKind } from './derivation-kind';

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCER PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProducerProfile {
  readonly producer_service: string;
  readonly producer_capability_id: string;
  readonly producer_layer: L5ProducerLayer;
  readonly allowed_write_classes: readonly L5WriteClass[];
  readonly allowed_source_classes: readonly string[];
  readonly requires_canonical_refs: boolean;
  readonly archive_default: boolean;
  readonly replay_default: boolean;
  readonly max_payload_bytes: number;
  readonly allowed_ingress_modes: readonly L5IngressMode[];
  readonly allowed_derivation_kinds: readonly L5DerivationKind[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

const _producers = new Map<string, ProducerProfile>();

export function registerProducer(profile: ProducerProfile): void {
  _producers.set(profile.producer_service, profile);
}

export function getProducer(producerService: string): ProducerProfile | undefined {
  return _producers.get(producerService);
}

export function isRegisteredProducer(producerService: string): boolean {
  return _producers.has(producerService);
}

export function getAllProducers(): readonly ProducerProfile[] {
  return [..._producers.values()];
}

export function resetProducerRegistry(): void {
  _producers.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCER LEGALITY CHECK
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProducerLegalityResult {
  readonly legal: boolean;
  readonly violations: readonly string[];
}

export function checkProducerLegality(
  producerService: string,
  writeClass: L5WriteClass,
  sourceClass: string,
  ingressMode: L5IngressMode,
  derivationKind: L5DerivationKind,
  payloadSizeBytes: number,
): ProducerLegalityResult {
  const profile = _producers.get(producerService);
  const violations: string[] = [];

  if (!profile) {
    return { legal: false, violations: [`Producer '${producerService}' is not registered`] };
  }

  if (!profile.allowed_write_classes.includes(writeClass)) {
    violations.push(`Write class '${writeClass}' not allowed for producer '${producerService}'`);
  }

  if (profile.allowed_source_classes.length > 0 && !profile.allowed_source_classes.includes(sourceClass)) {
    violations.push(`Source class '${sourceClass}' not allowed for producer '${producerService}'`);
  }

  if (!profile.allowed_ingress_modes.includes(ingressMode)) {
    violations.push(`Ingress mode '${ingressMode}' not allowed for producer '${producerService}'`);
  }

  if (!profile.allowed_derivation_kinds.includes(derivationKind)) {
    violations.push(`Derivation kind '${derivationKind}' not allowed for producer '${producerService}'`);
  }

  if (payloadSizeBytes > profile.max_payload_bytes) {
    violations.push(`Payload ${payloadSizeBytes} bytes exceeds max ${profile.max_payload_bytes} for producer '${producerService}'`);
  }

  return { legal: violations.length === 0, violations };
}

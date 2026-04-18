/**
 * L6.2 — Primitive Class Identity Contract
 *
 * §6.2.2.4 / §6.2.3.4 — Every primitive has a stable, versioned identity.
 * Re-exports L6PrimitiveClass from the L6.1 constitutional type system and
 * defines the universal identity fields every feature/event contract must declare.
 */

import { L6PrimitiveClass } from './l6-constitutional-types';

export { L6PrimitiveClass };

export interface L6PrimitiveIdentity {
  readonly primitive_id: string;
  readonly primitive_class: L6PrimitiveClass;
  readonly family: string;
  readonly name: string;
  readonly version: string;
}

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

export function isValidVersionTag(v: string): boolean {
  return /^v\d+(\.\d+){0,2}(-[a-z0-9._-]+)?$/i.test(v);
}

export function isValidPrimitiveId(id: string): boolean {
  return /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.v\d+(\.\d+){0,2}$/i.test(id);
}

export function isValidFamilyName(family: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(family);
}

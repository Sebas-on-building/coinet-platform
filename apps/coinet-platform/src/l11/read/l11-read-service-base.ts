/**
 * L11.8 — Read service base
 *
 * Common admission pipeline for governed L11 read services.
 * Each concrete service supplies its expected surface and calls
 * `admitL11Read`, which validates the request and confirms the
 * surface match. Services are stateless and do not touch storage;
 * they return a structured admission result that adapters use to
 * dispatch to L5 storage backends.
 */

import {
  L11ReadRequest,
  L11ReadSurfaceId,
  L11ReadSurfaceDescriptor,
} from '../contracts/l11-read-surface';
import {
  getL11ReadSurfaceDescriptor,
} from '../registry/l11-read-surface.registry';
import {
  validateL11ReadRequest,
} from './l11-read-surface.validator';
import {
  L11PersistenceIssue,
  L11PersistenceViolationCode,
  makeL11PersistenceIssue,
} from '../persistence/l11-persistence-violation-codes';

export interface L11ReadAdmission {
  readonly admitted: boolean;
  readonly issues: readonly L11PersistenceIssue[];
  readonly descriptor: L11ReadSurfaceDescriptor | null;
}

export function admitL11Read(args: {
  request: L11ReadRequest;
  expected_surface: L11ReadSurfaceId;
}): L11ReadAdmission {
  const issues: L11PersistenceIssue[] = [];
  if (args.request?.read_surface_id !== args.expected_surface) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_READ_SURFACE_UNREGISTERED,
      `service expects surface ${args.expected_surface} but request had ${args.request?.read_surface_id ?? '(missing)'}`,
      { read_request_id: args.request?.read_request_id }));
  }
  for (const i of validateL11ReadRequest(args.request)) issues.push(i);
  return {
    admitted: issues.length === 0,
    issues,
    descriptor: getL11ReadSurfaceDescriptor(args.expected_surface),
  };
}

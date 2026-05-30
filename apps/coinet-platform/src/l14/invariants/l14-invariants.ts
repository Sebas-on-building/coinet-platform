/**
 * L14 — Final Layer Invariants
 *
 * §14.10.44 — INV-14-A through INV-14-L.
 *
 * These derive truth from each sublayer's invariants — Layer 14 holds
 * only if every sublayer law holds.
 */

import {
  ALL_L14_FINAL_INVARIANTS,
  L14FinalInvariantId,
} from '../contracts/l14-completion-standard';
import { runAllL14_1Invariants } from './l14_1-invariants';
import { runAllL14_2Invariants } from './l14_2-invariants';
import { runAllL14_3Invariants } from './l14_3-invariants';
import { runAllL14_4Invariants } from './l14_4-invariants';
import { runAllL14_5Invariants } from './l14_5-invariants';
import { runAllL14_6Invariants } from './l14_6-invariants';
import { runAllL14_7Invariants } from './l14_7-invariants';
import { runAllL14_8Invariants } from './l14_8-invariants';
import { runAllL14_9Invariants } from './l14_9-invariants';

export interface L14FinalInvariantCheck {
  readonly invariant_id: L14FinalInvariantId;
  readonly name: string;
  readonly holds: boolean;
  readonly blocking: boolean;
  readonly evidence: string;
}

function allHold(results: readonly { holds: boolean }[]): boolean {
  return results.every(r => r.holds);
}

function summary(label: string, results: readonly { holds: boolean }[]): string {
  const held = results.filter(r => r.holds).length;
  return `${label}=${held}/${results.length}`;
}

// ── INV-14-A : No lower-layer truth rebuild ──────────────────────

export function checkINV_14_A(): L14FinalInvariantCheck {
  // L14.1 (constitution boundary) + L14.7 (proposals not mutate) carry this.
  const l1 = runAllL14_1Invariants();
  const l7 = runAllL14_7Invariants();
  const holds = allHold(l1) && allHold(l7);
  return {
    invariant_id: L14FinalInvariantId.INV_14_A,
    name: 'no-lower-layer-truth-rebuild',
    holds,
    blocking: true,
    evidence: `${summary('L14.1', l1)} ${summary('L14.7', l7)}`,
  };
}

// ── INV-14-B : Engagement cannot impersonate correctness ─────────

export function checkINV_14_B(): L14FinalInvariantCheck {
  // L14.4 (interaction truth) + L14.6 (alert usefulness separation) + L14.9 (exp metrics).
  const l4 = runAllL14_4Invariants();
  const l6 = runAllL14_6Invariants();
  const l9 = runAllL14_9Invariants();
  const holds = allHold(l4) && allHold(l6) && allHold(l9);
  return {
    invariant_id: L14FinalInvariantId.INV_14_B,
    name: 'engagement-not-correctness',
    holds,
    blocking: true,
    evidence: `${summary('L14.4', l4)} ${summary('L14.6', l6)} ${summary('L14.9', l9)}`,
  };
}

// ── INV-14-C : Feedback may not silently mutate truth ────────────

export function checkINV_14_C(): L14FinalInvariantCheck {
  const l4 = runAllL14_4Invariants();
  const l6 = runAllL14_6Invariants();
  const holds = allHold(l4) && allHold(l6);
  return {
    invariant_id: L14FinalInvariantId.INV_14_C,
    name: 'feedback-not-truth-mutation',
    holds,
    blocking: true,
    evidence: `${summary('L14.4', l4)} ${summary('L14.6', l6)}`,
  };
}

// ── INV-14-D : Delivery cannot bypass preferences/restrictions ───

export function checkINV_14_D(): L14FinalInvariantCheck {
  const l2 = runAllL14_2Invariants();
  const l3 = runAllL14_3Invariants();
  const l9 = runAllL14_9Invariants();
  const holds = allHold(l2) && allHold(l3) && allHold(l9);
  return {
    invariant_id: L14FinalInvariantId.INV_14_D,
    name: 'delivery-respects-preference-and-restriction',
    holds,
    blocking: true,
    evidence: `${summary('L14.2', l2)} ${summary('L14.3', l3)} ${summary('L14.9', l9)}`,
  };
}

// ── INV-14-E : Alerts require governed source artifacts ──────────

export function checkINV_14_E(): L14FinalInvariantCheck {
  const l2 = runAllL14_2Invariants();
  const l3 = runAllL14_3Invariants();
  const holds = allHold(l2) && allHold(l3);
  return {
    invariant_id: L14FinalInvariantId.INV_14_E,
    name: 'alert-requires-governed-source',
    holds,
    blocking: true,
    evidence: `${summary('L14.2', l2)} ${summary('L14.3', l3)}`,
  };
}

// ── INV-14-F : Outcome evaluation respects horizons/semantics ────

export function checkINV_14_F(): L14FinalInvariantCheck {
  const l5 = runAllL14_5Invariants();
  const holds = allHold(l5);
  return {
    invariant_id: L14FinalInvariantId.INV_14_F,
    name: 'outcome-respects-horizon-and-semantics',
    holds,
    blocking: true,
    evidence: `${summary('L14.5', l5)}`,
  };
}

// ── INV-14-G : Calibration evidence sample-aware + lineage-bound ─

export function checkINV_14_G(): L14FinalInvariantCheck {
  const l6 = runAllL14_6Invariants();
  const holds = allHold(l6);
  return {
    invariant_id: L14FinalInvariantId.INV_14_G,
    name: 'evidence-sample-aware-and-lineage-bound',
    holds,
    blocking: true,
    evidence: `${summary('L14.6', l6)}`,
  };
}

// ── INV-14-H : Calibration proposals never auto-apply ────────────

export function checkINV_14_H(): L14FinalInvariantCheck {
  const l7 = runAllL14_7Invariants();
  const holds = allHold(l7);
  return {
    invariant_id: L14FinalInvariantId.INV_14_H,
    name: 'proposals-never-auto-apply',
    holds,
    blocking: true,
    evidence: `${summary('L14.7', l7)}`,
  };
}

// ── INV-14-I : Experiments never weaken truth/safety/grounding/disclosure ──

export function checkINV_14_I(): L14FinalInvariantCheck {
  const l9 = runAllL14_9Invariants();
  const holds = allHold(l9);
  return {
    invariant_id: L14FinalInvariantId.INV_14_I,
    name: 'experiments-non-corruption',
    holds,
    blocking: true,
    evidence: `${summary('L14.9', l9)}`,
  };
}

// ── INV-14-J : Persistence/replay/repair preserve auditability ───

export function checkINV_14_J(): L14FinalInvariantCheck {
  const l8 = runAllL14_8Invariants();
  const holds = allHold(l8);
  return {
    invariant_id: L14FinalInvariantId.INV_14_J,
    name: 'persistence-replay-repair-audit-safe',
    holds,
    blocking: true,
    evidence: `${summary('L14.8', l8)}`,
  };
}

// ── INV-14-K : Channels stay legal/non-spammy ────────────────────

export function checkINV_14_K(): L14FinalInvariantCheck {
  const l2 = runAllL14_2Invariants();
  const l3 = runAllL14_3Invariants();
  const l9 = runAllL14_9Invariants();
  const holds = allHold(l2) && allHold(l3) && allHold(l9);
  return {
    invariant_id: L14FinalInvariantId.INV_14_K,
    name: 'channel-legality-and-non-spam',
    holds,
    blocking: true,
    evidence: `${summary('L14.2', l2)} ${summary('L14.3', l3)} ${summary('L14.9', l9)}`,
  };
}

// ── INV-14-L : Compounding loop closed without truth corruption ──

export function checkINV_14_L(): L14FinalInvariantCheck {
  // Aggregate over all 9 sublayers.
  const all = [
    ...runAllL14_1Invariants(),
    ...runAllL14_2Invariants(),
    ...runAllL14_3Invariants(),
    ...runAllL14_4Invariants(),
    ...runAllL14_5Invariants(),
    ...runAllL14_6Invariants(),
    ...runAllL14_7Invariants(),
    ...runAllL14_8Invariants(),
    ...runAllL14_9Invariants(),
  ];
  const holds = allHold(all);
  return {
    invariant_id: L14FinalInvariantId.INV_14_L,
    name: 'compounding-loop-closed-without-truth-corruption',
    holds,
    blocking: true,
    evidence: `${summary('L14.*', all)}`,
  };
}

export function runAllL14FinalInvariants(): readonly L14FinalInvariantCheck[] {
  return [
    checkINV_14_A(),
    checkINV_14_B(),
    checkINV_14_C(),
    checkINV_14_D(),
    checkINV_14_E(),
    checkINV_14_F(),
    checkINV_14_G(),
    checkINV_14_H(),
    checkINV_14_I(),
    checkINV_14_J(),
    checkINV_14_K(),
    checkINV_14_L(),
  ];
}

export const L14_TOTAL_FINAL_INVARIANTS = ALL_L14_FINAL_INVARIANTS.length;

/**
 * 13.4 PQC Migration Tracker
 *
 * Tracks research signals, proposals, merged code, testnet activation,
 * mainnet deployment, and actual operational adoption.
 *
 * Preserves the difference between: intent | implementation | deployment | adoption.
 */

import type { PqcSupportStatus, PqcMigrationStage, MigrationVelocity, UpgradeDependencyRisk, PqcMigrationState, EvidenceMode } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// KNOWN MIGRATION POSTURES
// ═══════════════════════════════════════════════════════════════════════════════

interface KnownMigrationPosture {
  support_status: PqcSupportStatus;
  migration_stage: PqcMigrationStage;
  velocity: MigrationVelocity;
  upgrade_risk: UpgradeDependencyRisk;
  evidence_sources: string[];
  notes: string[];
}

const KNOWN_POSTURES: Record<string, KnownMigrationPosture> = {
  bitcoin: {
    support_status: 'research_only',
    migration_stage: 'conceptual',
    velocity: 'slow',
    upgrade_risk: 'high',
    evidence_sources: ['Bitcoin Core mailing list', 'BIP proposals', 'academic research'],
    notes: [
      'Soft-fork upgrade path exists via new output types',
      'UTXO model provides natural hiding of unspent keys',
      'Consensus change requires extreme social coordination',
      'No formal PQC BIP has reached deployment stage',
    ],
  },
  ethereum: {
    support_status: 'research_only',
    migration_stage: 'governance_discussion',
    velocity: 'slow',
    upgrade_risk: 'critical',
    evidence_sources: ['EF research blog', 'EIP drafts', 'Vitalik Buterin publications'],
    notes: [
      'Account abstraction (EIP-4337, EIP-7702) may ease migration path',
      'All existing EOA accounts have permanently exposed public keys',
      'Beacon chain BLS keys also require PQC migration',
      'Migration requires coordinated hard fork and wallet ecosystem update',
    ],
  },
  solana: {
    support_status: 'none',
    migration_stage: 'no_path',
    velocity: 'stalled',
    upgrade_risk: 'high',
    evidence_sources: ['Solana documentation', 'Solana Labs communications'],
    notes: [
      'ed25519 is deeply embedded in account model',
      'No public PQC research track from core team',
      'Account model permanently exposes public keys',
    ],
  },
  polkadot: {
    support_status: 'research_only',
    migration_stage: 'conceptual',
    velocity: 'slow',
    upgrade_risk: 'moderate',
    evidence_sources: ['W3F research', 'Substrate framework documentation'],
    notes: [
      'Substrate framework supports pluggable cryptographic primitives',
      'On-chain governance enables forkless upgrades',
      'No deployed PQC scheme yet',
    ],
  },
  cardano: {
    support_status: 'research_only',
    migration_stage: 'conceptual',
    velocity: 'slow',
    upgrade_risk: 'moderate',
    evidence_sources: ['IOHK research papers', 'Cardano roadmap'],
    notes: [
      'Academic research team has published PQC-related work',
      'eUTXO model provides some exposure protection',
      'Hard fork combinator allows staged migration',
    ],
  },
  zcash: {
    support_status: 'partial',
    migration_stage: 'implementation_in_progress',
    velocity: 'moderate',
    upgrade_risk: 'moderate',
    evidence_sources: ['Zcash Foundation', 'ECC engineering updates'],
    notes: [
      'Halo 2 (used in Orchard) removes trusted setup dependency',
      'Transparent addresses still use secp256k1 ECDSA',
      'Shielded pool migration path is more advanced than most chains',
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

export function trackPqcMigration(
  entityId: string,
  rawSignals: string[] = [],
): PqcMigrationState {
  const normalized = entityId.toLowerCase().replace(/[^a-z0-9]/g, '');

  const known = Object.entries(KNOWN_POSTURES).find(
    ([k]) => normalized.includes(k) || k.includes(normalized),
  );

  if (known) {
    const [, p] = known;
    return {
      support_status: p.support_status,
      migration_stage: p.migration_stage,
      velocity: p.velocity,
      upgrade_risk: p.upgrade_risk,
      evidence_sources: p.evidence_sources,
      evidence_mode: 'reconciled',
      confidence: 0.8,
    };
  }

  return inferFromSignals(rawSignals);
}

function inferFromSignals(signals: string[]): PqcMigrationState {
  const combined = signals.join(' ').toLowerCase();

  let support: PqcSupportStatus = 'unknown';
  let stage: PqcMigrationStage = 'unresolved';
  let velocity: MigrationVelocity = 'unknown';

  if (/deployed|mainnet.*live|production.*pq/i.test(combined)) {
    support = 'deployed';
    stage = 'mainnet_live';
    velocity = 'fast';
  } else if (/hybrid.*signature|hybrid.*pq/i.test(combined)) {
    support = 'hybrid';
    stage = 'implementation_in_progress';
    velocity = 'moderate';
  } else if (/testnet.*pq|pq.*testnet/i.test(combined)) {
    support = 'partial';
    stage = 'testnet';
    velocity = 'moderate';
  } else if (/proposal|eip|bip|governance.*discuss/i.test(combined)) {
    support = 'proposed';
    stage = 'governance_discussion';
    velocity = 'slow';
  } else if (/research|paper|academic|study/i.test(combined)) {
    support = 'research_only';
    stage = 'conceptual';
    velocity = 'slow';
  }

  return {
    support_status: support,
    migration_stage: stage,
    velocity,
    upgrade_risk: 'unresolved',
    evidence_sources: signals.length > 0 ? ['raw_signal_inference'] : [],
    evidence_mode: signals.length > 0 ? 'inferred' : 'modeled',
    confidence: signals.length > 0 ? 0.4 : 0.2,
  };
}

export function getKnownMigrationPostures(): string[] {
  return Object.keys(KNOWN_POSTURES);
}

export function getMigrationRiskScore(state: PqcMigrationState): number {
  const stageScores: Record<PqcMigrationStage, number> = {
    no_path: 0.95,
    conceptual: 0.8,
    governance_discussion: 0.7,
    implementation_in_progress: 0.5,
    testnet: 0.35,
    mainnet_partial: 0.2,
    mainnet_live: 0.1,
    operationally_adopted: 0.05,
    unresolved: 0.6,
  };
  return stageScores[state.migration_stage] ?? 0.6;
}

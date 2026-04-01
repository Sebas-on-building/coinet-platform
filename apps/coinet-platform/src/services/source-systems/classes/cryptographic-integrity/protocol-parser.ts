/**
 * 13.1 Protocol Structure Parser
 *
 * Parses protocol docs, specs, audits, repos to identify:
 *  - signature scheme family and variant
 *  - trusted setup dependencies
 *  - explicit PQC language
 *  - governance or upgrade path references
 *
 * Outputs structured fields with evidence excerpts, confidence, and uncertainty flags.
 */

import type {
  SignatureSchemeFamily,
  SignatureSchemeVariant,
  TrustedSetupDependency,
  ValidatorKeyModel,
  AdminKeyModel,
  PqcSupportStatus,
  ProtocolStructureParsed,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// KNOWN CHAIN/PROTOCOL STRUCTURES — canonical ground-truth registry
// ═══════════════════════════════════════════════════════════════════════════════

interface KnownStructure {
  scheme_family: SignatureSchemeFamily;
  scheme_variant: SignatureSchemeVariant;
  trusted_setup: TrustedSetupDependency;
  validator_model: ValidatorKeyModel;
  admin_model: AdminKeyModel;
  pqc_status: PqcSupportStatus;
  notes: string[];
}

const KNOWN_STRUCTURES: Record<string, KnownStructure> = {
  bitcoin: {
    scheme_family: 'ECDSA',
    scheme_variant: 'secp256k1_ecdsa',
    trusted_setup: 'none',
    validator_model: 'single_key',
    admin_model: 'none',
    pqc_status: 'research_only',
    notes: ['Taproot adds Schnorr (secp256k1_schnorr) as alternative path', 'UTXO model hides pubkey until spend for P2PKH/P2WPKH'],
  },
  ethereum: {
    scheme_family: 'ECDSA',
    scheme_variant: 'secp256k1_ecdsa',
    trusted_setup: 'none',
    validator_model: 'distributed_validator_set',
    admin_model: 'none',
    pqc_status: 'research_only',
    notes: ['Account model exposes public keys permanently', 'Beacon chain validators use BLS12-381', 'EIP-7702 and account abstraction may change exposure model'],
  },
  solana: {
    scheme_family: 'EdDSA',
    scheme_variant: 'ed25519',
    trusted_setup: 'none',
    validator_model: 'rotating_key',
    admin_model: 'none',
    pqc_status: 'none',
    notes: ['Account model: public key is the address', 'Always-exposed exposure model'],
  },
  polkadot: {
    scheme_family: 'Schnorr',
    scheme_variant: 'sr25519',
    trusted_setup: 'none',
    validator_model: 'rotating_key',
    admin_model: 'dao_gated',
    pqc_status: 'research_only',
    notes: ['Substrate framework uses sr25519 (Schnorr over Ristretto)', 'On-chain governance for upgrades'],
  },
  cosmos: {
    scheme_family: 'ECDSA',
    scheme_variant: 'secp256k1_ecdsa',
    trusted_setup: 'none',
    validator_model: 'distributed_validator_set',
    admin_model: 'dao_gated',
    pqc_status: 'none',
    notes: ['Tendermint BFT consensus', 'SDK supports ed25519 and secp256k1'],
  },
  avalanche: {
    scheme_family: 'ECDSA',
    scheme_variant: 'secp256k1_ecdsa',
    trusted_setup: 'none',
    validator_model: 'distributed_validator_set',
    admin_model: 'none',
    pqc_status: 'none',
    notes: ['C-Chain is EVM-compatible (secp256k1)', 'Snowman consensus'],
  },
  zcash: {
    scheme_family: 'ECDSA',
    scheme_variant: 'secp256k1_ecdsa',
    trusted_setup: 'active',
    validator_model: 'single_key',
    admin_model: 'none',
    pqc_status: 'research_only',
    notes: ['Groth16 proofs depend on trusted setup (Powers of Tau + Sapling)', 'Transparent addresses use standard ECDSA', 'Orchard circuit uses Halo 2 (no trusted setup)'],
  },
  cardano: {
    scheme_family: 'EdDSA',
    scheme_variant: 'ed25519',
    trusted_setup: 'none',
    validator_model: 'distributed_validator_set',
    admin_model: 'dao_gated',
    pqc_status: 'research_only',
    notes: ['Extended Ed25519 for HD wallets', 'Ouroboros Praos consensus', 'UTXO model (eUTXO)'],
  },
  near: {
    scheme_family: 'EdDSA',
    scheme_variant: 'ed25519',
    trusted_setup: 'none',
    validator_model: 'rotating_key',
    admin_model: 'none',
    pqc_status: 'none',
    notes: ['Account-based model with named accounts', 'Nightshade sharding'],
  },
};

const SCHEME_KEYWORDS: Array<{ pattern: RegExp; family: SignatureSchemeFamily; variant: SignatureSchemeVariant }> = [
  { pattern: /secp256k1.*ecdsa|ecdsa.*secp256k1/i, family: 'ECDSA', variant: 'secp256k1_ecdsa' },
  { pattern: /schnorr.*secp256k1|secp256k1.*schnorr|taproot/i, family: 'Schnorr', variant: 'secp256k1_schnorr' },
  { pattern: /ed25519|eddsa/i, family: 'EdDSA', variant: 'ed25519' },
  { pattern: /bls12.?381|bls\s+signature/i, family: 'BLS', variant: 'bls12_381' },
  { pattern: /sr25519|ristretto/i, family: 'Schnorr', variant: 'sr25519' },
  { pattern: /dilithium|crystals.*dilithium/i, family: 'lattice_based', variant: 'dilithium_hybrid' },
  { pattern: /falcon/i, family: 'lattice_based', variant: 'falcon_hybrid' },
  { pattern: /sphincs\+|sphincs_plus/i, family: 'hash_based', variant: 'sphincs_plus' },
];

const PQC_KEYWORDS = [
  /post.?quantum/i,
  /quantum.?resist/i,
  /pqc/i,
  /lattice.?based/i,
  /nist.*pq/i,
  /dilithium/i,
  /falcon/i,
  /sphincs/i,
  /kyber/i,
  /ml.?kem/i,
  /ml.?dsa/i,
];

const TRUSTED_SETUP_KEYWORDS = [
  /trusted.?setup/i,
  /powers.?of.?tau/i,
  /ceremony/i,
  /groth16/i,
  /sapling/i,
];

// ═══════════════════════════════════════════════════════════════════════════════
// PARSER
// ═══════════════════════════════════════════════════════════════════════════════

export function parseProtocolStructure(
  entityId: string,
  rawTexts: string[] = [],
): ProtocolStructureParsed {
  const normalized = entityId.toLowerCase().replace(/[^a-z0-9]/g, '');

  const known = Object.entries(KNOWN_STRUCTURES).find(
    ([k]) => normalized.includes(k) || k.includes(normalized),
  );

  if (known) {
    const [, s] = known;
    const pqcDetected = rawTexts.some(t => PQC_KEYWORDS.some(p => p.test(t)));
    return {
      scheme_family: s.scheme_family,
      scheme_variant: s.scheme_variant,
      trusted_setup: s.trusted_setup,
      validator_model: s.validator_model,
      admin_model: s.admin_model,
      pqc_language_detected: pqcDetected || s.pqc_status !== 'none',
      pqc_status_parsed: s.pqc_status,
      evidence_excerpts: s.notes,
      parser_confidence: 0.9,
      uncertainty_flags: [],
    };
  }

  return parseFromRawText(rawTexts);
}

function parseFromRawText(texts: string[]): ProtocolStructureParsed {
  const combined = texts.join(' ');
  const uncertaintyFlags: string[] = [];
  const excerpts: string[] = [];

  let family: SignatureSchemeFamily = 'unknown';
  let variant: SignatureSchemeVariant = 'unknown';
  for (const sk of SCHEME_KEYWORDS) {
    if (sk.pattern.test(combined)) {
      family = sk.family;
      variant = sk.variant;
      const match = combined.match(sk.pattern);
      if (match) excerpts.push(`Detected: ${match[0]}`);
      break;
    }
  }
  if (family === 'unknown') uncertaintyFlags.push('signature_scheme_not_detected');

  let trusted_setup: TrustedSetupDependency = 'uncertain';
  if (TRUSTED_SETUP_KEYWORDS.some(p => p.test(combined))) {
    trusted_setup = 'active';
    excerpts.push('Trusted setup language detected');
  } else if (family !== 'unknown') {
    trusted_setup = 'none';
  }

  const pqcDetected = PQC_KEYWORDS.some(p => p.test(combined));
  let pqcStatus: PqcSupportStatus = 'unknown';
  if (pqcDetected) {
    if (/deployed|mainnet.*live|production/i.test(combined)) pqcStatus = 'deployed';
    else if (/hybrid/i.test(combined)) pqcStatus = 'hybrid';
    else if (/partial|testnet/i.test(combined)) pqcStatus = 'partial';
    else if (/proposed|proposal|eip|bip/i.test(combined)) pqcStatus = 'proposed';
    else pqcStatus = 'research_only';
  } else {
    pqcStatus = 'none';
  }

  let validator_model: ValidatorKeyModel = 'unknown';
  if (/dvt|distributed.*validator/i.test(combined)) validator_model = 'distributed_validator_set';
  else if (/threshold.*key/i.test(combined)) validator_model = 'threshold_key';
  else if (/rotating.*key|key.*rotation/i.test(combined)) validator_model = 'rotating_key';
  else if (/multisig.*validator/i.test(combined)) validator_model = 'multisig_controlled';
  else uncertaintyFlags.push('validator_key_model_not_detected');

  let admin_model: AdminKeyModel = 'unknown';
  if (/no.*admin|immutable|non.*upgradeable/i.test(combined)) admin_model = 'none';
  else if (/dao.*govern|governance.*vote/i.test(combined)) admin_model = 'dao_gated';
  else if (/multisig.*admin|admin.*multisig/i.test(combined)) admin_model = 'multisig';
  else if (/single.*operator|owner.*key/i.test(combined)) admin_model = 'single_operator';
  else uncertaintyFlags.push('admin_key_model_not_detected');

  const confidence = Math.max(
    0.2,
    1.0 - uncertaintyFlags.length * 0.2,
  );

  return {
    scheme_family: family,
    scheme_variant: variant,
    trusted_setup,
    validator_model,
    admin_model,
    pqc_language_detected: pqcDetected,
    pqc_status_parsed: pqcStatus,
    evidence_excerpts: excerpts,
    parser_confidence: confidence,
    uncertainty_flags: uncertaintyFlags,
  };
}

export function getKnownChains(): string[] {
  return Object.keys(KNOWN_STRUCTURES);
}

export function getKnownStructure(chainId: string): KnownStructure | undefined {
  return KNOWN_STRUCTURES[chainId.toLowerCase()];
}

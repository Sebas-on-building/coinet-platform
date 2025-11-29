/**
 * Vesting Contract ABIs
 * Enterprise-grade ABI definitions for all major vesting contract types
 * 
 * Supports:
 * - OpenZeppelin TokenVesting (v4.x)
 * - Sablier v2 (Lockup Linear, Lockup Dynamic)
 * - Hedgey Finance (TokenLockups)
 * - LlamaPay (Streaming)
 * - Team Finance (Token Locks)
 * - Generic ERC20 vesting patterns
 */

// =============================================================================
// OPENZEPPELIN VESTING CONTRACTS
// =============================================================================

export const OPENZEPPELIN_VESTING_ABI = [
  // Core functions
  {
    "inputs": [],
    "name": "beneficiary",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "start",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "duration",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "cliff",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "released",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "releasable",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "vestedAmount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "release",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "ERC20Released",
    "type": "event"
  },
] as const;

// =============================================================================
// SABLIER V2 CONTRACTS
// =============================================================================

export const SABLIER_V2_LOCKUP_LINEAR_ABI = [
  // Stream info
  {
    "inputs": [{ "internalType": "uint256", "name": "streamId", "type": "uint256" }],
    "name": "getStream",
    "outputs": [{
      "components": [
        { "internalType": "address", "name": "sender", "type": "address" },
        { "internalType": "address", "name": "recipient", "type": "address" },
        { "internalType": "uint128", "name": "depositAmount", "type": "uint128" },
        { "internalType": "address", "name": "asset", "type": "address" },
        { "internalType": "bool", "name": "cancelable", "type": "bool" },
        { "internalType": "bool", "name": "transferable", "type": "bool" },
        { "internalType": "uint40", "name": "startTime", "type": "uint40" },
        { "internalType": "uint40", "name": "cliffTime", "type": "uint40" },
        { "internalType": "uint40", "name": "endTime", "type": "uint40" },
        { "internalType": "bool", "name": "isDepleted", "type": "bool" },
        { "internalType": "bool", "name": "isStream", "type": "bool" },
        { "internalType": "bool", "name": "isCancelable", "type": "bool" }
      ],
      "internalType": "struct LockupLinear.Stream",
      "name": "stream",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "streamId", "type": "uint256" }],
    "name": "withdrawableAmountOf",
    "outputs": [{ "internalType": "uint128", "name": "", "type": "uint128" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "streamId", "type": "uint256" }],
    "name": "withdrawnAmountOf",
    "outputs": [{ "internalType": "uint128", "name": "", "type": "uint128" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "streamId", "type": "uint256" }],
    "name": "streamedAmountOf",
    "outputs": [{ "internalType": "uint128", "name": "", "type": "uint128" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "streamId", "type": "uint256" }],
    "name": "refundableAmountOf",
    "outputs": [{ "internalType": "uint128", "name": "", "type": "uint128" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextStreamId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "streamId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "asset", "type": "address" },
      { "indexed": false, "internalType": "uint128", "name": "amount", "type": "uint128" }
    ],
    "name": "WithdrawFromLockupStream",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "streamId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "asset", "type": "address" },
      { "indexed": false, "internalType": "uint128", "name": "depositAmount", "type": "uint128" }
    ],
    "name": "CreateLockupLinearStream",
    "type": "event"
  },
] as const;

// =============================================================================
// HEDGEY FINANCE CONTRACTS
// =============================================================================

export const HEDGEY_TOKEN_LOCKUPS_ABI = [
  {
    "inputs": [{ "internalType": "uint256", "name": "planId", "type": "uint256" }],
    "name": "plans",
    "outputs": [{
      "components": [
        { "internalType": "address", "name": "token", "type": "address" },
        { "internalType": "uint256", "name": "amount", "type": "uint256" },
        { "internalType": "uint256", "name": "start", "type": "uint256" },
        { "internalType": "uint256", "name": "cliff", "type": "uint256" },
        { "internalType": "uint256", "name": "rate", "type": "uint256" },
        { "internalType": "uint256", "name": "period", "type": "uint256" },
        { "internalType": "address", "name": "vestingAdmin", "type": "address" },
        { "internalType": "bool", "name": "adminTransferOBO", "type": "bool" }
      ],
      "internalType": "struct Plan",
      "name": "",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "planId", "type": "uint256" }],
    "name": "planBalanceOf",
    "outputs": [
      { "internalType": "uint256", "name": "balance", "type": "uint256" },
      { "internalType": "uint256", "name": "remainder", "type": "uint256" },
      { "internalType": "uint256", "name": "latestUnlock", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "holder", "type": "address" }],
    "name": "lockedBalances",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "start", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "cliff", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "end", "type": "uint256" }
    ],
    "name": "PlanCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amountRedeemed", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "planRemainder", "type": "uint256" }
    ],
    "name": "PlanRedeemed",
    "type": "event"
  },
] as const;

// =============================================================================
// LLAMAPAY STREAMING CONTRACTS
// =============================================================================

export const LLAMAPAY_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "from", "type": "address" },
      { "internalType": "address", "name": "to", "type": "address" }
    ],
    "name": "streamToStart",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "from", "type": "address" },
      { "internalType": "address", "name": "to", "type": "address" }
    ],
    "name": "withdrawable",
    "outputs": [
      { "internalType": "uint256", "name": "withdrawableAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "lastUpdate", "type": "uint256" },
      { "internalType": "uint256", "name": "owed", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "payer", "type": "address" }],
    "name": "balances",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": false, "internalType": "uint216", "name": "amountPerSec", "type": "uint216" }
    ],
    "name": "StreamCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "Withdraw",
    "type": "event"
  },
] as const;

// =============================================================================
// TEAM FINANCE TOKEN LOCK
// =============================================================================

export const TEAM_FINANCE_LOCK_ABI = [
  {
    "inputs": [{ "internalType": "uint256", "name": "lockId", "type": "uint256" }],
    "name": "getLockById",
    "outputs": [{
      "components": [
        { "internalType": "uint256", "name": "id", "type": "uint256" },
        { "internalType": "address", "name": "tokenAddress", "type": "address" },
        { "internalType": "address", "name": "withdrawalAddress", "type": "address" },
        { "internalType": "uint256", "name": "tokenAmount", "type": "uint256" },
        { "internalType": "uint256", "name": "unlockTime", "type": "uint256" },
        { "internalType": "bool", "name": "withdrawn", "type": "bool" }
      ],
      "internalType": "struct TokenLock",
      "name": "",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "getLocksForToken",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "allLockIds",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "tokenAddress", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "withdrawalAddress", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "unlockTime", "type": "uint256" }
    ],
    "name": "TokensLocked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "tokenAddress", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "withdrawalAddress", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "TokensWithdrawn",
    "type": "event"
  },
] as const;

// =============================================================================
// GENERIC ERC20 (for token balance checks)
// =============================================================================

export const ERC20_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "Transfer",
    "type": "event"
  },
] as const;

// =============================================================================
// KNOWN CONTRACT ADDRESSES
// =============================================================================

export const KNOWN_VESTING_CONTRACTS: Record<string, {
  chain: string;
  type: 'openzeppelin' | 'sablier' | 'hedgey' | 'llamapay' | 'teamfinance';
  name: string;
  token?: string;
}> = {
  // Sablier V2 (Ethereum)
  '0xAFb979d9afAd1aD27C5eFf4E27226E3AB9e5dCC9': {
    chain: 'ethereum',
    type: 'sablier',
    name: 'Sablier V2 LockupLinear',
  },
  '0x39EFdC3dbB57B2388CcC4bb40aC4CF4F0A7BaaB7': {
    chain: 'ethereum',
    type: 'sablier',
    name: 'Sablier V2 LockupDynamic',
  },
  // Sablier V2 (Polygon)
  '0x67422C3E36A908d5c3237e9cFfeb40bde7060f6e': {
    chain: 'polygon',
    type: 'sablier',
    name: 'Sablier V2 LockupLinear (Polygon)',
  },
  // Sablier V2 (Arbitrum)
  '0xFDD9d122B451F549f48c4942c6fa6646D849e8C1': {
    chain: 'arbitrum',
    type: 'sablier',
    name: 'Sablier V2 LockupLinear (Arbitrum)',
  },
  // Hedgey (Ethereum)
  '0x2CDE9919e81b20B4B33DD562a48a84b54C48F00C': {
    chain: 'ethereum',
    type: 'hedgey',
    name: 'Hedgey TokenLockups',
  },
  // Team Finance (Ethereum)
  '0xE2fE530C047f2d85298b07D9333C05737f1435fB': {
    chain: 'ethereum',
    type: 'teamfinance',
    name: 'Team Finance Token Lock',
  },
  // LlamaPay (Ethereum)
  '0xde1C04855c2828431ba637675B6929A684f84C7F': {
    chain: 'ethereum',
    type: 'llamapay',
    name: 'LlamaPay Factory',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getAbiForContractType(type: string): readonly any[] {
  switch (type) {
    case 'openzeppelin':
      return OPENZEPPELIN_VESTING_ABI;
    case 'sablier':
      return SABLIER_V2_LOCKUP_LINEAR_ABI;
    case 'hedgey':
      return HEDGEY_TOKEN_LOCKUPS_ABI;
    case 'llamapay':
      return LLAMAPAY_ABI;
    case 'teamfinance':
      return TEAM_FINANCE_LOCK_ABI;
    default:
      return ERC20_ABI;
  }
}

export function getKnownContract(address: string): {
  chain: string;
  type: string;
  name: string;
  token?: string;
} | null {
  return KNOWN_VESTING_CONTRACTS[address.toLowerCase()] || 
         KNOWN_VESTING_CONTRACTS[address] || 
         null;
}


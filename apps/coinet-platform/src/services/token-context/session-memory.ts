/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧠 TOKEN SESSION MEMORY - Prevents Re-Asking for Same Token              ║
 * ║                                                                               ║
 * ║   Implements Section 7 of COINET_TOKEN_RESOLUTION_POLICY:                    ║
 * ║   - Stores last_resolved_token per conversation                              ║
 * ║   - TTL-based expiration (30 min for tickers, 24h for addresses)             ║
 * ║   - Prevents redundant clarification questions                               ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production-ready session memory                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ResolvedToken, ChainId, ConfidenceLevel } from './types';
import { logger } from '../../utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * TTL values in seconds (from policy)
 */
export const RESOLUTION_TTL = {
  TICKER: 30 * 60,       // 30 minutes for ticker/name resolution
  ADDRESS: 24 * 60 * 60, // 24 hours for address resolution
  CONFIRMED: 60 * 60,    // 1 hour for user-confirmed resolutions
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface ResolvedTokenRecord {
  /** Original user input normalized (e.g., "PENGUIN", "$PENGUIN") */
  tokenRefSignature: string;
  
  /** Resolved token data */
  chain: ChainId;
  address: string;
  symbol: string;
  name: string;
  
  /** Resolution metadata */
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  resolvedAt: number;        // Unix timestamp ms
  expiresAt: number;         // Unix timestamp ms
  ttlSeconds: number;
  
  /** Source of resolution */
  resolutionSource: 'auto' | 'user_confirmed' | 'address_direct';
  
  /** For cache invalidation */
  candidateListHash?: string;
}

export interface SessionTokenMemory {
  conversationId: string;
  resolvedTokens: Map<string, ResolvedTokenRecord>;
  lastUpdated: number;
}

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

/**
 * Simple in-memory storage for session token memory
 * In production, this should be backed by Redis or similar
 */
const sessionStore = new Map<string, SessionTokenMemory>();

// Cleanup old sessions periodically
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanupInterval() {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      for (const [conversationId, session] of sessionStore.entries()) {
        // Remove sessions older than 24 hours
        if (now - session.lastUpdated > maxAge) {
          sessionStore.delete(conversationId);
        } else {
          // Clean up expired tokens within active sessions
          for (const [sig, record] of session.resolvedTokens.entries()) {
            if (now > record.expiresAt) {
              session.resolvedTokens.delete(sig);
            }
          }
        }
      }
    }, CLEANUP_INTERVAL_MS);
  }
}

// Start cleanup on module load
startCleanupInterval();

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Normalize a token reference to a signature for lookup
 */
export function normalizeTokenRefSignature(ref: string): string {
  return ref
    .toUpperCase()
    .replace(/^\$/, '')  // Remove leading $
    .trim();
}

/**
 * Get a previously resolved token from session memory
 * Returns null if not found or expired
 */
export function getResolvedToken(
  conversationId: string,
  tokenRefSignature: string
): ResolvedTokenRecord | null {
  const session = sessionStore.get(conversationId);
  if (!session) return null;
  
  const normalizedSig = normalizeTokenRefSignature(tokenRefSignature);
  const record = session.resolvedTokens.get(normalizedSig);
  
  if (!record) return null;
  
  // Check if expired
  if (Date.now() > record.expiresAt) {
    session.resolvedTokens.delete(normalizedSig);
    logger.debug('🧠 Token resolution expired', { 
      conversationId: conversationId.slice(0, 8),
      signature: normalizedSig,
    });
    return null;
  }
  
  logger.debug('🧠 Retrieved cached token resolution', {
    conversationId: conversationId.slice(0, 8),
    signature: normalizedSig,
    chain: record.chain,
    address: record.address.slice(0, 10),
  });
  
  return record;
}

/**
 * Store a resolved token in session memory
 */
export function storeResolvedToken(
  conversationId: string,
  tokenRefSignature: string,
  resolved: ResolvedToken,
  source: 'auto' | 'user_confirmed' | 'address_direct' = 'auto'
): void {
  // Get or create session
  let session = sessionStore.get(conversationId);
  if (!session) {
    session = {
      conversationId,
      resolvedTokens: new Map(),
      lastUpdated: Date.now(),
    };
    sessionStore.set(conversationId, session);
  }
  
  const normalizedSig = normalizeTokenRefSignature(tokenRefSignature);
  const now = Date.now();
  
  // Determine TTL based on resolution type
  let ttlSeconds: number;
  if (source === 'address_direct') {
    ttlSeconds = RESOLUTION_TTL.ADDRESS;
  } else if (source === 'user_confirmed') {
    ttlSeconds = RESOLUTION_TTL.CONFIRMED;
  } else {
    ttlSeconds = RESOLUTION_TTL.TICKER;
  }
  
  const record: ResolvedTokenRecord = {
    tokenRefSignature: normalizedSig,
    chain: resolved.chain,
    address: resolved.address,
    symbol: resolved.symbol,
    name: resolved.name,
    confidence: resolved.resolutionConfidence,
    confidenceLevel: resolved.confidenceLevel || 'medium',
    resolvedAt: now,
    expiresAt: now + (ttlSeconds * 1000),
    ttlSeconds,
    resolutionSource: source,
  };
  
  session.resolvedTokens.set(normalizedSig, record);
  session.lastUpdated = now;
  
  logger.info('🧠 Stored token resolution', {
    conversationId: conversationId.slice(0, 8),
    signature: normalizedSig,
    chain: resolved.chain,
    address: resolved.address.slice(0, 10),
    ttlMinutes: Math.round(ttlSeconds / 60),
    source,
  });
}

/**
 * Extend TTL for a token being discussed
 */
export function extendTokenTTL(
  conversationId: string,
  tokenRefSignature: string
): void {
  const session = sessionStore.get(conversationId);
  if (!session) return;
  
  const normalizedSig = normalizeTokenRefSignature(tokenRefSignature);
  const record = session.resolvedTokens.get(normalizedSig);
  
  if (record) {
    const now = Date.now();
    record.expiresAt = now + (record.ttlSeconds * 1000);
    session.lastUpdated = now;
    
    logger.debug('🧠 Extended token TTL', {
      conversationId: conversationId.slice(0, 8),
      signature: normalizedSig,
    });
  }
}

/**
 * Invalidate a specific token resolution
 * Call this when user provides conflicting info
 */
export function invalidateToken(
  conversationId: string,
  tokenRefSignature: string
): void {
  const session = sessionStore.get(conversationId);
  if (!session) return;
  
  const normalizedSig = normalizeTokenRefSignature(tokenRefSignature);
  session.resolvedTokens.delete(normalizedSig);
  
  logger.debug('🧠 Invalidated token resolution', {
    conversationId: conversationId.slice(0, 8),
    signature: normalizedSig,
  });
}

/**
 * Check if we should reuse a cached resolution
 * Implements re-ask conditions from policy
 */
export function shouldReuseCachedResolution(
  cached: ResolvedTokenRecord,
  newRef: { chain?: ChainId; raw: string }
): { reuse: boolean; reason?: string } {
  // Condition 1: User explicitly changed chain
  if (newRef.chain && newRef.chain !== 'unknown' && newRef.chain !== cached.chain) {
    return { reuse: false, reason: 'User specified different chain' };
  }
  
  // Condition 2: Check if TTL expired (already handled in getResolvedToken)
  
  // Condition 3: Very low confidence → maybe re-resolve
  if (cached.confidenceLevel === 'low' && cached.resolutionSource === 'auto') {
    return { reuse: false, reason: 'Previous resolution was low confidence' };
  }
  
  // Safe to reuse
  return { reuse: true };
}

/**
 * Get all resolved tokens for a conversation (for debugging/display)
 */
export function getSessionTokens(conversationId: string): ResolvedTokenRecord[] {
  const session = sessionStore.get(conversationId);
  if (!session) return [];
  
  const now = Date.now();
  const activeTokens: ResolvedTokenRecord[] = [];
  
  for (const record of session.resolvedTokens.values()) {
    if (now <= record.expiresAt) {
      activeTokens.push(record);
    }
  }
  
  return activeTokens;
}

/**
 * Clear entire session (for testing or logout)
 */
export function clearSession(conversationId: string): void {
  sessionStore.delete(conversationId);
}

/**
 * Get session store stats (for monitoring)
 */
export function getSessionStoreStats(): { sessions: number; totalTokens: number } {
  let totalTokens = 0;
  for (const session of sessionStore.values()) {
    totalTokens += session.resolvedTokens.size;
  }
  return {
    sessions: sessionStore.size,
    totalTokens,
  };
}

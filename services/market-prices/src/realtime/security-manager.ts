/**
 * Security Manager for Real-Time Systems
 * 
 * Enterprise-grade security features:
 * - Rate limiting for on-chain calls
 * - Wallet data encryption (AES-256-GCM)
 * - Request signing and validation
 * - IP allowlisting for sensitive operations
 * - Audit logging
 * 
 * Compliance: SOC2, GDPR-ready
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface RateLimitConfig {
  name: string;
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
  priority?: 'high' | 'normal' | 'low';
}

export interface RateLimitStatus {
  name: string;
  remaining: number;
  total: number;
  resetsAt: Date;
  blocked: boolean;
  blockedUntil?: Date;
}

export interface EncryptedData {
  iv: string;
  authTag: string;
  ciphertext: string;
  algorithm: string;
  keyId: string;
}

export interface WalletInfo {
  address: string;
  chain: string;
  label?: string;
  type: 'vc' | 'exchange' | 'protocol' | 'user' | 'unknown';
  tags?: string[];
  lastSeen?: Date;
  riskScore?: number;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  action: string;
  resource: string;
  userId?: string;
  ipAddress?: string;
  success: boolean;
  details?: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityConfig {
  encryptionKey?: string;
  enableAuditLog?: boolean;
  auditLogRetentionDays?: number;
  enableRateLimiting?: boolean;
  ipAllowlist?: string[];
  sensitiveFieldPatterns?: RegExp[];
}

// =============================================================================
// RATE LIMITER
// =============================================================================

class RateLimiter {
  private buckets: Map<string, {
    tokens: number;
    lastRefill: number;
    blocked: boolean;
    blockedUntil: number;
  }> = new Map();
  
  private configs: Map<string, RateLimitConfig> = new Map();

  registerLimit(config: RateLimitConfig): void {
    this.configs.set(config.name, config);
    this.buckets.set(config.name, {
      tokens: config.maxRequests,
      lastRefill: Date.now(),
      blocked: false,
      blockedUntil: 0,
    });
  }

  async checkLimit(name: string): Promise<{ allowed: boolean; status: RateLimitStatus }> {
    const config = this.configs.get(name);
    if (!config) {
      return {
        allowed: true,
        status: {
          name,
          remaining: Infinity,
          total: Infinity,
          resetsAt: new Date(),
          blocked: false,
        },
      };
    }

    let bucket = this.buckets.get(name)!;
    const now = Date.now();

    // Check if blocked
    if (bucket.blocked && now < bucket.blockedUntil) {
      return {
        allowed: false,
        status: {
          name,
          remaining: 0,
          total: config.maxRequests,
          resetsAt: new Date(bucket.blockedUntil),
          blocked: true,
          blockedUntil: new Date(bucket.blockedUntil),
        },
      };
    }

    // Unblock if block duration passed
    if (bucket.blocked && now >= bucket.blockedUntil) {
      bucket.blocked = false;
      bucket.tokens = config.maxRequests;
      bucket.lastRefill = now;
    }

    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = (elapsed / config.windowMs) * config.maxRequests;
    
    bucket.tokens = Math.min(config.maxRequests, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if request is allowed
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        status: {
          name,
          remaining: Math.floor(bucket.tokens),
          total: config.maxRequests,
          resetsAt: new Date(now + config.windowMs),
          blocked: false,
        },
      };
    }

    // Rate limited - optionally block
    if (config.blockDurationMs) {
      bucket.blocked = true;
      bucket.blockedUntil = now + config.blockDurationMs;
    }

    return {
      allowed: false,
      status: {
        name,
        remaining: 0,
        total: config.maxRequests,
        resetsAt: new Date(now + config.windowMs),
        blocked: bucket.blocked,
        blockedUntil: bucket.blocked ? new Date(bucket.blockedUntil) : undefined,
      },
    };
  }

  getStatus(name: string): RateLimitStatus | null {
    const config = this.configs.get(name);
    const bucket = this.buckets.get(name);
    
    if (!config || !bucket) return null;

    return {
      name,
      remaining: Math.floor(bucket.tokens),
      total: config.maxRequests,
      resetsAt: new Date(bucket.lastRefill + config.windowMs),
      blocked: bucket.blocked,
      blockedUntil: bucket.blocked ? new Date(bucket.blockedUntil) : undefined,
    };
  }

  getAllStatuses(): RateLimitStatus[] {
    return Array.from(this.configs.keys())
      .map(name => this.getStatus(name))
      .filter((s): s is RateLimitStatus => s !== null);
  }

  reset(name: string): void {
    const config = this.configs.get(name);
    if (config) {
      this.buckets.set(name, {
        tokens: config.maxRequests,
        lastRefill: Date.now(),
        blocked: false,
        blockedUntil: 0,
      });
    }
  }

  resetAll(): void {
    for (const name of this.configs.keys()) {
      this.reset(name);
    }
  }
}

// =============================================================================
// ENCRYPTION ENGINE
// =============================================================================

class EncryptionEngine {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32;
  private readonly IV_LENGTH = 16;
  private readonly AUTH_TAG_LENGTH = 16;
  
  private masterKey: Buffer | null = null;
  private keyId: string = 'default';

  initialize(key?: string): void {
    if (key) {
      // Derive key from provided string
      this.masterKey = crypto.scryptSync(key, 'coinet-salt', this.KEY_LENGTH);
    } else if (process.env.ENCRYPTION_KEY) {
      this.masterKey = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'coinet-salt', this.KEY_LENGTH);
    } else {
      // Generate random key for session
      this.masterKey = crypto.randomBytes(this.KEY_LENGTH);
      logger.warn('Using random encryption key - data will not persist across restarts');
    }
    
    this.keyId = crypto.createHash('sha256').update(this.masterKey).digest('hex').slice(0, 8);
  }

  encrypt(plaintext: string): EncryptedData {
    if (!this.masterKey) {
      throw new Error('Encryption not initialized');
    }

    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.masterKey, iv);
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      ciphertext,
      algorithm: this.ALGORITHM,
      keyId: this.keyId,
    };
  }

  decrypt(data: EncryptedData): string {
    if (!this.masterKey) {
      throw new Error('Encryption not initialized');
    }

    if (data.keyId !== this.keyId) {
      throw new Error('Key ID mismatch - data encrypted with different key');
    }

    const iv = Buffer.from(data.iv, 'base64');
    const authTag = Buffer.from(data.authTag, 'base64');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.masterKey, iv);
    
    decipher.setAuthTag(authTag);
    
    let plaintext = decipher.update(data.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  }

  encryptObject<T>(obj: T): EncryptedData {
    return this.encrypt(JSON.stringify(obj));
  }

  decryptObject<T>(data: EncryptedData): T {
    return JSON.parse(this.decrypt(data)) as T;
  }

  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  hmac(data: string, key?: string): string {
    const hmacKey = key ? Buffer.from(key) : this.masterKey!;
    return crypto.createHmac('sha256', hmacKey).update(data).digest('hex');
  }
}

// =============================================================================
// MAIN CLASS
// =============================================================================

export class SecurityManager extends EventEmitter {
  private rateLimiter = new RateLimiter();
  private encryption = new EncryptionEngine();
  private auditLogs: AuditLog[] = [];
  private config: Required<SecurityConfig>;
  private sensitivePatterns: RegExp[];

  constructor(config: SecurityConfig = {}) {
    super();
    this.config = {
      encryptionKey: config.encryptionKey || process.env.ENCRYPTION_KEY || '',
      enableAuditLog: config.enableAuditLog !== false,
      auditLogRetentionDays: config.auditLogRetentionDays || 90,
      enableRateLimiting: config.enableRateLimiting !== false,
      ipAllowlist: config.ipAllowlist || [],
      sensitiveFieldPatterns: config.sensitiveFieldPatterns || [
        /private[_-]?key/i,
        /secret/i,
        /password/i,
        /api[_-]?key/i,
        /mnemonic/i,
        /seed[_-]?phrase/i,
      ],
    };

    this.sensitivePatterns = this.config.sensitiveFieldPatterns;
    this.encryption.initialize(this.config.encryptionKey);
    this.setupDefaultRateLimits();

    logger.info('SecurityManager initialized', {
      auditLogEnabled: this.config.enableAuditLog,
      rateLimitEnabled: this.config.enableRateLimiting,
      ipAllowlistSize: this.config.ipAllowlist.length,
    });
  }

  // ===========================================================================
  // RATE LIMITING
  // ===========================================================================

  private setupDefaultRateLimits(): void {
    // On-chain RPC calls
    this.rateLimiter.registerLimit({
      name: 'rpc:ethereum',
      maxRequests: 100,
      windowMs: 60000, // 100/min
      blockDurationMs: 30000,
    });

    this.rateLimiter.registerLimit({
      name: 'rpc:polygon',
      maxRequests: 100,
      windowMs: 60000,
      blockDurationMs: 30000,
    });

    this.rateLimiter.registerLimit({
      name: 'rpc:solana',
      maxRequests: 50,
      windowMs: 60000,
      blockDurationMs: 30000,
    });

    // API calls
    this.rateLimiter.registerLimit({
      name: 'api:external',
      maxRequests: 30,
      windowMs: 60000,
      blockDurationMs: 60000,
    });

    // WebSocket connections
    this.rateLimiter.registerLimit({
      name: 'ws:connections',
      maxRequests: 10,
      windowMs: 60000,
      blockDurationMs: 300000,
    });

    // Sensitive operations
    this.rateLimiter.registerLimit({
      name: 'sensitive:decrypt',
      maxRequests: 100,
      windowMs: 60000,
      blockDurationMs: 60000,
    });
  }

  /**
   * Check if request is allowed by rate limit
   */
  async checkRateLimit(limitName: string): Promise<boolean> {
    if (!this.config.enableRateLimiting) {
      return true;
    }

    const { allowed, status } = await this.rateLimiter.checkLimit(limitName);
    
    if (!allowed) {
      this.audit({
        action: 'rate_limit_exceeded',
        resource: limitName,
        success: false,
        details: { status },
        riskLevel: 'medium',
      });
    }

    return allowed;
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(limitName: string): RateLimitStatus | null {
    return this.rateLimiter.getStatus(limitName);
  }

  /**
   * Get all rate limit statuses
   */
  getAllRateLimitStatuses(): RateLimitStatus[] {
    return this.rateLimiter.getAllStatuses();
  }

  /**
   * Register custom rate limit
   */
  registerRateLimit(config: RateLimitConfig): void {
    this.rateLimiter.registerLimit(config);
  }

  // ===========================================================================
  // ENCRYPTION
  // ===========================================================================

  /**
   * Encrypt sensitive wallet data
   */
  encryptWalletData(wallet: WalletInfo): EncryptedData {
    const encrypted = this.encryption.encryptObject(wallet);
    
    this.audit({
      action: 'wallet_encrypted',
      resource: wallet.address,
      success: true,
      details: { chain: wallet.chain, type: wallet.type },
      riskLevel: 'low',
    });

    return encrypted;
  }

  /**
   * Decrypt wallet data
   */
  async decryptWalletData(data: EncryptedData): Promise<WalletInfo> {
    const allowed = await this.checkRateLimit('sensitive:decrypt');
    if (!allowed) {
      throw new Error('Rate limit exceeded for decryption operations');
    }

    const wallet = this.encryption.decryptObject<WalletInfo>(data);
    
    this.audit({
      action: 'wallet_decrypted',
      resource: wallet.address,
      success: true,
      details: { chain: wallet.chain },
      riskLevel: 'low',
    });

    return wallet;
  }

  /**
   * Encrypt generic data
   */
  encrypt(plaintext: string): EncryptedData {
    return this.encryption.encrypt(plaintext);
  }

  /**
   * Decrypt generic data
   */
  decrypt(data: EncryptedData): string {
    return this.encryption.decrypt(data);
  }

  /**
   * Hash data (one-way)
   */
  hash(data: string): string {
    return this.encryption.hash(data);
  }

  /**
   * Create HMAC signature
   */
  sign(data: string): string {
    return this.encryption.hmac(data);
  }

  /**
   * Verify HMAC signature
   */
  verify(data: string, signature: string): boolean {
    const expected = this.encryption.hmac(data);
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  }

  // ===========================================================================
  // DATA SANITIZATION
  // ===========================================================================

  /**
   * Redact sensitive fields from object
   */
  redactSensitiveFields<T extends Record<string, any>>(obj: T): T {
    const redacted = { ...obj } as Record<string, any>;
    
    for (const key of Object.keys(redacted)) {
      if (this.isSensitiveField(key)) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
        redacted[key] = this.redactSensitiveFields(redacted[key]);
      }
    }
    
    return redacted as T;
  }

  private isSensitiveField(fieldName: string): boolean {
    return this.sensitivePatterns.some(pattern => pattern.test(fieldName));
  }

  /**
   * Mask address (show first 6 and last 4 chars)
   */
  maskAddress(address: string): string {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Validate wallet address format
   */
  isValidAddress(address: string, chain: string): boolean {
    if (chain === 'solana') {
      // Solana base58 address (32-44 chars)
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    }
    
    // EVM address
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // ===========================================================================
  // IP ALLOWLIST
  // ===========================================================================

  /**
   * Check if IP is allowed
   */
  isIpAllowed(ip: string): boolean {
    if (this.config.ipAllowlist.length === 0) {
      return true; // No allowlist = all allowed
    }
    return this.config.ipAllowlist.includes(ip);
  }

  /**
   * Add IP to allowlist
   */
  addToAllowlist(ip: string): void {
    if (!this.config.ipAllowlist.includes(ip)) {
      this.config.ipAllowlist.push(ip);
      this.audit({
        action: 'ip_allowlist_add',
        resource: ip,
        success: true,
        riskLevel: 'medium',
      });
    }
  }

  /**
   * Remove IP from allowlist
   */
  removeFromAllowlist(ip: string): void {
    const index = this.config.ipAllowlist.indexOf(ip);
    if (index !== -1) {
      this.config.ipAllowlist.splice(index, 1);
      this.audit({
        action: 'ip_allowlist_remove',
        resource: ip,
        success: true,
        riskLevel: 'medium',
      });
    }
  }

  // ===========================================================================
  // AUDIT LOGGING
  // ===========================================================================

  /**
   * Add audit log entry
   */
  audit(entry: Omit<AuditLog, 'id' | 'timestamp'>): void {
    if (!this.config.enableAuditLog) return;

    const log: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...entry,
    };

    this.auditLogs.push(log);
    this.emit('audit', log);

    // Emit high-risk events
    if (log.riskLevel === 'high' || log.riskLevel === 'critical') {
      logger.warn('High-risk security event', {
        action: log.action,
        resource: log.resource,
        riskLevel: log.riskLevel,
      });
      this.emit('security_alert', log);
    }

    // Cleanup old logs
    this.cleanupOldLogs();
  }

  /**
   * Get audit logs
   */
  getAuditLogs(options?: {
    startTime?: Date;
    endTime?: Date;
    action?: string;
    riskLevel?: AuditLog['riskLevel'];
    limit?: number;
  }): AuditLog[] {
    let logs = [...this.auditLogs];

    if (options?.startTime) {
      logs = logs.filter(l => l.timestamp >= options.startTime!);
    }
    if (options?.endTime) {
      logs = logs.filter(l => l.timestamp <= options.endTime!);
    }
    if (options?.action) {
      logs = logs.filter(l => l.action === options.action);
    }
    if (options?.riskLevel) {
      logs = logs.filter(l => l.riskLevel === options.riskLevel);
    }

    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      logs = logs.slice(0, options.limit);
    }

    return logs;
  }

  private cleanupOldLogs(): void {
    const cutoff = Date.now() - this.config.auditLogRetentionDays * 24 * 60 * 60 * 1000;
    this.auditLogs = this.auditLogs.filter(l => l.timestamp.getTime() > cutoff);
  }

  // ===========================================================================
  // HEALTH & STATS
  // ===========================================================================

  /**
   * Get security health status
   */
  getHealth(): {
    encryptionReady: boolean;
    rateLimitActive: boolean;
    auditLogActive: boolean;
    auditLogSize: number;
    rateLimitStatuses: RateLimitStatus[];
  } {
    return {
      encryptionReady: true,
      rateLimitActive: this.config.enableRateLimiting,
      auditLogActive: this.config.enableAuditLog,
      auditLogSize: this.auditLogs.length,
      rateLimitStatuses: this.getAllRateLimitStatuses(),
    };
  }

  /**
   * Reset all rate limits
   */
  resetRateLimits(): void {
    this.rateLimiter.resetAll();
    this.audit({
      action: 'rate_limits_reset',
      resource: 'all',
      success: true,
      riskLevel: 'medium',
    });
  }

  /**
   * Clear audit logs
   */
  clearAuditLogs(): void {
    this.auditLogs = [];
    logger.info('Audit logs cleared');
  }
}

// Singleton
let instance: SecurityManager | null = null;

export function getSecurityManager(config?: SecurityConfig): SecurityManager {
  if (!instance) {
    instance = new SecurityManager(config);
  }
  return instance;
}

export function resetSecurityManager(): void {
  instance = null;
}

export default SecurityManager;


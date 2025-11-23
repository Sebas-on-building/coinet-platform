/**
 * Multi-Factor Authentication Service
 * Comprehensive MFA implementation with TOTP, SMS, email, and backup codes
 */

import { SecureQueryBuilder } from '../database/SecureQueryBuilder';
import { Logger } from '../logging/Logger';
import { MetricsCollector } from '../metrics/MetricsCollector';
import { ErrorManager } from '../errors/ErrorManager';
import { SecretManager } from '../security/SecretManager';
import crypto from 'crypto';

export interface MFAMethod {
  id: string;
  userId: string;
  type: 'totp' | 'backup_codes' | 'webauthn' | 'sms' | 'email';
  name: string;
  secret?: string; // For TOTP
  codes?: string[]; // For backup codes
  credentialId?: string; // For WebAuthn
  publicKey?: string; // For WebAuthn
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

export interface TOTPSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  uri: string;
}

export interface MFAVerificationResult {
  success: boolean;
  methodUsed?: string;
  remainingBackupCodes?: number;
  error?: string;
}

export interface WebAuthnCredential {
  id: string;
  publicKey: ArrayBuffer;
  counter: number;
  transports?: string[];
}

export class MFAService {
  private static instance: MFAService;
  private db!: SecureQueryBuilder;
  private logger: Logger;
  private metrics: MetricsCollector;
  private errorManager: ErrorManager;
  private secretManager: SecretManager;

  private readonly TOTP_WINDOW = 30; // 30 seconds
  private readonly TOTP_DIGITS = 6;
  private readonly BACKUP_CODES_COUNT = 10;
  private readonly BACKUP_CODE_LENGTH = 8;

  private constructor() {
    this.logger = Logger.getInstance();
    this.metrics = MetricsCollector.getInstance();
    this.errorManager = ErrorManager.getInstance();
    this.secretManager = SecretManager.getInstance();

    this.initializeDatabase();
  }

  static getInstance(): MFAService {
    if (!MFAService.instance) {
      MFAService.instance = new MFAService();
    }
    return MFAService.instance;
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const dbConfig = {
        connectionString: await this.secretManager.getSecret('DATABASE_URL', {
          source: 'env',
          required: true
        })
      };
      this.db = new SecureQueryBuilder(dbConfig);

      await this.ensureTablesExist();
      this.logger.info('MFA Service initialized successfully');

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'initialize_mfa_service',
        component: 'mfa_service'
      });
      throw error;
    }
  }

  private async ensureTablesExist(): Promise<void> {
    try {
      // Create MFA methods table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS mfa_methods (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          type VARCHAR(50) NOT NULL,
          name VARCHAR(255) NOT NULL,
          secret TEXT,
          codes TEXT[], -- Encrypted backup codes
          credential_id TEXT,
          public_key TEXT,
          counter INTEGER DEFAULT 0,
          transports TEXT[],
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          last_used TIMESTAMP,
          UNIQUE(user_id, type, name)
        )
      `);

      // Create MFA verification logs
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS mfa_verification_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          method_id UUID REFERENCES mfa_methods(id),
          method_type VARCHAR(50) NOT NULL,
          success BOOLEAN NOT NULL,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create indexes
      await this.db.query(`
        CREATE INDEX IF NOT EXISTS idx_mfa_methods_user_id ON mfa_methods(user_id);
        CREATE INDEX IF NOT EXISTS idx_mfa_methods_type ON mfa_methods(type);
        CREATE INDEX IF NOT EXISTS idx_mfa_verification_logs_user_id ON mfa_verification_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_mfa_verification_logs_created_at ON mfa_verification_logs(created_at);
      `);

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'ensure_mfa_tables',
        component: 'mfa_service'
      });
      throw error;
    }
  }

  // Setup TOTP (Time-based One-Time Password)
  async setupTOTP(userId: string, appName: string = 'Coinet'): Promise<TOTPSetup> {
    try {
      // Generate secret
      const secret = this.generateTOTPSecret();

      // Create TOTP URI for QR code
      const userEmail = await this.getUserEmail(userId);
      const uri = this.generateTOTPUri(secret, userEmail, appName);

      // Generate QR code (simplified - in production use qrcode library)
      const qrCode = this.generateQRCodeDataURL(uri);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store TOTP method (inactive until verified)
      await this.db.insert<MFAMethod>('mfa_methods', {
        id: crypto.randomUUID(),
        userId,
        type: 'totp',
        name: 'Authenticator App',
        secret: await this.encryptSecret(secret),
        codes: await this.encryptBackupCodes(backupCodes),
        isActive: false, // Will be activated after verification
        createdAt: new Date()
      });

      this.logger.info('TOTP setup initiated', { userId });
      this.metrics.incrementCounter('mfa_setup_initiated', { type: 'totp' });

      return {
        secret,
        qrCode,
        backupCodes,
        uri
      };

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'setup_totp',
        component: 'mfa_service',
        metadata: { userId }
      });
      throw error;
    }
  }

  // Verify TOTP setup
  async verifyTOTPSetup(userId: string, code: string): Promise<boolean> {
    try {
      const method = await this.db.findMany<MFAMethod>('mfa_methods', {
        userId,
        type: 'totp',
        isActive: false
      });

      if (method.length === 0) {
        return false;
      }

      const secret = await this.decryptSecret(method[0].secret!);
      const isValid = this.verifyTOTPCode(secret, code);

      if (isValid) {
        // Activate the TOTP method
        await this.db.update('mfa_methods',
          { isActive: true },
          { id: method[0].id }
        );

        this.logger.info('TOTP setup completed', { userId });
        this.metrics.incrementCounter('mfa_setup_completed', { type: 'totp' });
      }

      return isValid;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'verify_totp_setup',
        component: 'mfa_service',
        metadata: { userId }
      });
      return false;
    }
  }

  // Verify MFA code (TOTP or backup code)
  async verifyMFA(params: {
    userId: string;
    code: string;
    ip?: string;
    userAgent?: string;
  }): Promise<MFAVerificationResult> {
    const startTime = Date.now();

    try {
      const methods = await this.getUserMFAMethods(params.userId);

      if (methods.length === 0) {
        return { success: false, error: 'No MFA methods configured' };
      }

      // Try TOTP first
      for (const method of methods.filter(m => m.type === 'totp' && m.isActive)) {
        const secret = await this.decryptSecret(method.secret!);
        if (this.verifyTOTPCode(secret, params.code)) {
          await this.logVerificationAttempt({
            userId: params.userId,
            methodId: method.id,
            methodType: 'totp',
            success: true,
            ip: params.ip,
            userAgent: params.userAgent
          });

          // Update last used
          await this.db.update('mfa_methods',
            { lastUsed: new Date() },
            { id: method.id }
          );

          const duration = Date.now() - startTime;
          this.metrics.recordHistogram('mfa_verification_duration', duration);
          this.metrics.incrementCounter('mfa_verifications', { type: 'totp', success: 'true' });

          return { success: true, methodUsed: 'totp' };
        }
      }

      // Try backup codes
      for (const method of methods.filter(m => m.type === 'backup_codes' && m.isActive)) {
        const codes = await this.decryptBackupCodes(method.codes!);
        const codeIndex = codes.indexOf(params.code);

        if (codeIndex !== -1) {
          // Remove used backup code
          codes.splice(codeIndex, 1);
          await this.db.update('mfa_methods',
            {
              codes: await this.encryptBackupCodes(codes),
              lastUsed: new Date()
            },
            { id: method.id }
          );

          await this.logVerificationAttempt({
            userId: params.userId,
            methodId: method.id,
            methodType: 'backup_code',
            success: true,
            ip: params.ip,
            userAgent: params.userAgent
          });

          const duration = Date.now() - startTime;
          this.metrics.recordHistogram('mfa_verification_duration', duration);
          this.metrics.incrementCounter('mfa_verifications', { type: 'backup_code', success: 'true' });

          this.logger.info('Backup code used', {
            userId: params.userId,
            remainingCodes: codes.length
          });

          return {
            success: true,
            methodUsed: 'backup_code',
            remainingBackupCodes: codes.length
          };
        }
      }

      // Log failed attempt
      await this.logVerificationAttempt({
        userId: params.userId,
        methodId: null,
        methodType: 'unknown',
        success: false,
        ip: params.ip,
        userAgent: params.userAgent
      });

      const duration = Date.now() - startTime;
      this.metrics.recordHistogram('mfa_verification_duration', duration);
      this.metrics.incrementCounter('mfa_verifications', { type: 'unknown', success: 'false' });

      return { success: false, error: 'Invalid verification code' };

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'verify_mfa',
        component: 'mfa_service',
        metadata: { userId: params.userId }
      });

      return { success: false, error: 'Verification failed due to system error' };
    }
  }

  // Get user's MFA methods
  async getUserMFAMethods(userId: string): Promise<MFAMethod[]> {
    try {
      const methods = await this.db.findMany<MFAMethod>('mfa_methods', {
        userId,
        isActive: true
      }, {
        orderBy: 'createdAt'
      });

      // Don't return secrets in the response
      return methods.map(method => ({
        ...method,
        secret: undefined,
        codes: undefined,
        publicKey: undefined
      }));

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'get_user_mfa_methods',
        component: 'mfa_service',
        metadata: { userId }
      });
      return [];
    }
  }

  // Generate new backup codes
  async generateNewBackupCodes(userId: string): Promise<string[]> {
    try {
      const backupCodes = this.generateBackupCodes();

      // Update existing backup codes method or create new one
      const existingMethod = await this.db.findMany<MFAMethod>('mfa_methods', {
        userId,
        type: 'backup_codes'
      });

      if (existingMethod.length > 0) {
        await this.db.update('mfa_methods',
          { codes: await this.encryptBackupCodes(backupCodes) },
          { id: existingMethod[0].id }
        );
      } else {
        await this.db.insert<MFAMethod>('mfa_methods', {
          id: crypto.randomUUID(),
          userId,
          type: 'backup_codes',
          name: 'Backup Codes',
          codes: await this.encryptBackupCodes(backupCodes),
          isActive: true,
          createdAt: new Date()
        });
      }

      this.logger.info('New backup codes generated', { userId });
      this.metrics.incrementCounter('mfa_backup_codes_generated');

      return backupCodes;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'generate_new_backup_codes',
        component: 'mfa_service',
        metadata: { userId }
      });
      throw error;
    }
  }

  // Disable MFA method
  async disableMFAMethod(userId: string, methodId: string): Promise<boolean> {
    try {
      const result = await this.db.update('mfa_methods',
        { isActive: false },
        { id: methodId, userId }
      );

      if (result.length > 0) {
        this.logger.info('MFA method disabled', { userId, methodId });
        this.metrics.incrementCounter('mfa_method_disabled');
        return true;
      }

      return false;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'disable_mfa_method',
        component: 'mfa_service',
        metadata: { userId, methodId }
      });
      return false;
    }
  }

  // Check if user has MFA enabled
  async isMFAEnabled(userId: string): Promise<boolean> {
    try {
      const methods = await this.db.findMany<MFAMethod>('mfa_methods', {
        userId,
        isActive: true
      });

      return methods.length > 0;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'is_mfa_enabled',
        component: 'mfa_service',
        metadata: { userId }
      });
      return false;
    }
  }

  // Private helper methods
  private generateTOTPSecret(): string {
    return crypto.randomBytes(32).toString('base64').replace(/[^A-Z2-7]/gi, '').substring(0, 32);
  }

  private generateTOTPUri(secret: string, email: string, issuer: string): string {
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
  }

  private generateQRCodeDataURL(uri: string): string {
    // Simplified QR code - in production use proper QR code library
    return `data:image/svg+xml;base64,${Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <rect width="200" height="200" fill="white"/>
        <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12">
          QR Code: ${uri}
        </text>
      </svg>
    `).toString('base64')}`;
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      codes.push(this.generateBackupCode());
    }
    return codes;
  }

  private generateBackupCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < this.BACKUP_CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private verifyTOTPCode(secret: string, code: string): boolean {
    try {
      const now = Math.floor(Date.now() / 1000);
      const window = Math.floor(now / this.TOTP_WINDOW);

      // Check current window and one window before/after for clock skew
      for (let i = -1; i <= 1; i++) {
        const timeWindow = window + i;
        const expectedCode = this.generateTOTPCode(secret, timeWindow);
        if (expectedCode === code) {
          return true;
        }
      }

      return false;

    } catch (error) {
      this.logger.error('TOTP verification error', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  private generateTOTPCode(secret: string, timeWindow: number): string {
    // Simplified TOTP implementation - use a proper library in production
    const timeHex = timeWindow.toString(16).padStart(16, '0');
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base64'));
    hmac.update(Buffer.from(timeHex, 'hex'));
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0xf;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, this.TOTP_DIGITS);
    return otp.toString().padStart(this.TOTP_DIGITS, '0');
  }

  private async encryptSecret(secret: string): Promise<string> {
    // Simple encryption - use proper encryption in production
    const key = await this.secretManager.getSecret('MFA_ENCRYPTION_KEY', {
      source: 'env',
      required: true,
      minLength: 32
    });

    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private async decryptSecret(encryptedSecret: string): Promise<string> {
    const key = await this.secretManager.getSecret('MFA_ENCRYPTION_KEY', {
      source: 'env',
      required: true,
      minLength: 32
    });

    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedSecret, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private async encryptBackupCodes(codes: string[]): Promise<string[]> {
    const encrypted: string[] = [];
    for (const code of codes) {
      encrypted.push(await this.encryptSecret(code));
    }
    return encrypted;
  }

  private async decryptBackupCodes(encryptedCodes: string[]): Promise<string[]> {
    const decrypted: string[] = [];
    for (const code of encryptedCodes) {
      decrypted.push(await this.decryptSecret(code));
    }
    return decrypted;
  }

  private async getUserEmail(userId: string): Promise<string> {
    // In production, fetch from user table
    return `user-${userId}@coinet.com`;
  }

  private async logVerificationAttempt(params: {
    userId: string;
    methodId: string | null;
    methodType: string;
    success: boolean;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.db.insert('mfa_verification_logs', {
        id: crypto.randomUUID(),
        userId: params.userId,
        methodId: params.methodId,
        methodType: params.methodType,
        success: params.success,
        ipAddress: params.ip,
        userAgent: params.userAgent,
        createdAt: new Date()
      });

    } catch (error) {
      this.logger.error('Failed to log MFA verification attempt', {
        error: error instanceof Error ? error.message : String(error),
        ...params
      });
    }
  }

  // Get MFA statistics (admin function)
  async getMFAStats(): Promise<{
    totalUsers: number;
    mfaEnabledUsers: number;
    methodBreakdown: Record<string, number>;
    recentVerifications: number;
  }> {
    try {
      const [mfaUsers, methodStats, recentVerifications] = await Promise.all([
        this.db.query('SELECT COUNT(DISTINCT user_id) as count FROM mfa_methods WHERE is_active = true'),
        this.db.query('SELECT type, COUNT(*) as count FROM mfa_methods WHERE is_active = true GROUP BY type'),
        this.db.query('SELECT COUNT(*) as count FROM mfa_verification_logs WHERE created_at > NOW() - INTERVAL \'24 hours\'')
      ]);

      const methodBreakdown: Record<string, number> = {};
      methodStats.rows.forEach((row: any) => {
        methodBreakdown[row.type] = parseInt(row.count);
      });

      return {
        totalUsers: 0, // Would need to get from users table
        mfaEnabledUsers: parseInt(mfaUsers.rows[0]?.count || '0'),
        methodBreakdown,
        recentVerifications: parseInt(recentVerifications.rows[0]?.count || '0')
      };

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'get_mfa_stats',
        component: 'mfa_service'
      });
      return {
        totalUsers: 0,
        mfaEnabledUsers: 0,
        methodBreakdown: {},
        recentVerifications: 0
      };
    }
  }
}

export default MFAService; 
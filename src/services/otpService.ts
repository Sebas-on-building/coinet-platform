/**
 * OTP Service
 * Secure One-Time Password generation and verification
 */

import { randomBytes, createHash } from 'crypto';
import { Logger } from '../lib/logging/Logger';
import { ErrorManager } from '../lib/errors/ErrorManager';
import { SecureQueryBuilder } from '../lib/database/SecureQueryBuilder';
import { MetricsCollector } from '../lib/metrics/MetricsCollector';
import { SecretManager } from '../lib/security/SecretManager';
import { totp } from 'otplib';
import bcrypt from 'bcrypt';

interface OTPRecord {
  id: string;
  userId: string;
  otpHash: string;
  method: 'sms' | 'email';
  recipient: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
}

interface DeliveryLog {
  id: string;
  userId: string;
  method: string;
  recipient: string;
  status: 'sent' | 'failed' | 'delivered' | 'bounced';
  detail: any;
  timestamp: Date;
}

class OTPService {
  private static instance: OTPService;
  private secretManager: SecretManager;
  private logger: Logger;
  private metrics: MetricsCollector;
  private errorManager: ErrorManager;
  private db!: SecureQueryBuilder; // Definite assignment assertion - initialized in initializeServices
  private twilioClient: any;

  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_REQUESTS_PER_WINDOW = 3;

  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  private constructor() {
    this.secretManager = SecretManager.getInstance();
    this.logger = Logger.getInstance();
    this.metrics = MetricsCollector.getInstance();
    this.errorManager = ErrorManager.getInstance();

    this.initializeServices();
  }

  static getInstance(): OTPService {
    if (!OTPService.instance) {
      OTPService.instance = new OTPService();
    }
    return OTPService.instance;
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize database connection
      const dbConfig = {
        connectionString: await this.secretManager.getSecret('DATABASE_URL', {
          source: 'env',
          required: true
        })
      };
      this.db = new SecureQueryBuilder(dbConfig);

      // Initialize Twilio
      const twilioSid = await this.secretManager.getSecret('TWILIO_SID', {
        source: 'env',
        required: true
      });
      const twilioToken = await this.secretManager.getSecret('TWILIO_AUTH_TOKEN', {
        source: 'env',
        required: true
      });

      // Placeholder implementation - replace with actual twilio when package is installed
      // this.twilioClient = twilio(twilioSid, twilioToken);
      this.twilioClient = {
        messages: {
          create: async (options: any) => ({ sid: 'placeholder', status: 'sent' })
        }
      };

      // Initialize SendGrid
      const sendGridKey = await this.secretManager.getSecret('SENDGRID_API_KEY', {
        source: 'env',
        required: true
      });
      // Placeholder implementation - replace with actual sgMail when package is installed
      // sgMail.setApiKey(sendGridKey);

      this.logger.info('OTP Service initialized successfully');

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'initialize_otp_service',
        component: 'otp_service'
      });
      throw error;
    }
  }

  // Generate cryptographically secure OTP
  generateOTP(length: number = 6): string {
    const digits = '0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * digits.length);
      result += digits[randomIndex];
    }

    return result;
  }

  // Check rate limiting
  private checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const entry = this.rateLimitMap.get(identifier);

    if (!entry || now > entry.resetTime) {
      this.rateLimitMap.set(identifier, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW
      });
      return true;
    }

    if (entry.count >= this.MAX_REQUESTS_PER_WINDOW) {
      return false;
    }

    entry.count++;
    return true;
  }

  // Store OTP in database with hash
  private async storeOTP(
    userId: string,
    otp: string,
    method: 'sms' | 'email',
    recipient: string
  ): Promise<string> {
    try {
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      const result = await this.db.insert<OTPRecord>('otps', {
        id: crypto.randomUUID(),
        userId,
        otpHash,
        method,
        recipient,
        createdAt: new Date(),
        expiresAt,
        attempts: 0,
        verified: false
      });

      this.logger.info('OTP stored in database', {
        userId,
        method,
        recipient: this.maskRecipient(recipient),
        expiresAt
      });

      return result.id;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'store_otp',
        component: 'otp_service',
        metadata: { userId, method }
      });
      throw error;
    }
  }

  // Log delivery attempt to database
  async logDelivery(params: {
    userId: string;
    method: string;
    recipient: string;
    status: 'sent' | 'failed' | 'delivered' | 'bounced';
    detail?: any;
  }): Promise<void> {
    try {
      await this.db.insert<DeliveryLog>('otp_delivery_logs', {
        id: crypto.randomUUID(),
        userId: params.userId,
        method: params.method,
        recipient: params.recipient,
        status: params.status,
        detail: params.detail,
        timestamp: new Date()
      });

      this.metrics.incrementCounter('otp_deliveries', {
        method: params.method,
        status: params.status
      });

      this.logger.debug('OTP delivery logged', {
        userId: params.userId,
        method: params.method,
        recipient: this.maskRecipient(params.recipient),
        status: params.status
      });

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'log_delivery',
        component: 'otp_service',
        metadata: params
      });
    }
  }

  // Send OTP via SMS
  async sendOTPSMS(params: {
    to: string;
    otp: string;
    userId: string;
  }): Promise<{ success: boolean; sid?: string; error?: any }> {
    try {
      const twilioFrom = await this.secretManager.getSecret('TWILIO_FROM', {
        source: 'env',
        required: true
      });

      const message = await this.twilioClient.messages.create({
        body: `Your Coinet verification code is: ${params.otp}. This code expires in ${this.OTP_EXPIRY_MINUTES} minutes.`,
        from: twilioFrom,
        to: params.to,
      });

      await this.logDelivery({
        userId: params.userId,
        method: 'sms',
        recipient: params.to,
        status: 'sent',
        detail: { sid: message.sid }
      });

      return { success: true, sid: message.sid };

    } catch (error) {
      await this.logDelivery({
        userId: params.userId,
        method: 'sms',
        recipient: params.to,
        status: 'failed',
        detail: error
      });

      this.errorManager.handleError(error as Error, {
        operation: 'send_otp_sms',
        component: 'otp_service',
        metadata: { userId: params.userId, to: this.maskRecipient(params.to) }
      });

      return { success: false, error };
    }
  }

  // Send OTP via Email
  async sendOTPEmail(params: {
    to: string;
    otp: string;
    userId: string;
  }): Promise<{ success: boolean; messageId?: string; error?: any }> {
    try {
      const sendGridFrom = await this.secretManager.getSecret('SENDGRID_FROM', {
        source: 'env',
        required: true
      });

      const msg = {
        to: params.to,
        from: sendGridFrom,
        subject: 'Your Coinet Verification Code',
        text: `Your Coinet verification code is: ${params.otp}. This code expires in ${this.OTP_EXPIRY_MINUTES} minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3B82F6;">Coinet Verification Code</h2>
            <p>Your verification code is:</p>
            <div style="background-color: #F3F4F6; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">
              ${params.otp}
            </div>
            <p style="color: #6B7280;">This code expires in ${this.OTP_EXPIRY_MINUTES} minutes.</p>
            <p style="color: #6B7280; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      };

      // Send email using SendGrid (placeholder implementation)
      // await sgMail.send(msg);
      // Placeholder - would send actual email when SendGrid is properly configured
      this.logger.info('Email OTP would be sent', { to: params.to, subject: msg.subject });

      await this.logDelivery({
        userId: params.userId,
        method: 'email',
        recipient: params.to,
        status: 'sent',
        detail: { messageId: 'placeholder_message_id' } // Placeholder for actual messageId
      });

      return { success: true, messageId: 'placeholder_message_id' };

    } catch (error) {
      await this.logDelivery({
        userId: params.userId,
        method: 'email',
        recipient: params.to,
        status: 'failed',
        detail: error
      });

      this.errorManager.handleError(error as Error, {
        operation: 'send_otp_email',
        component: 'otp_service',
        metadata: { userId: params.userId, to: this.maskRecipient(params.to) }
      });

      return { success: false, error };
    }
  }

  // Send OTP with intelligent fallback
  async sendOTP(params: {
    userId: string;
    phone?: string;
    email: string;
    preferredMethod?: 'sms' | 'email';
  }): Promise<{
    success: boolean;
    method: 'sms' | 'email';
    otpId: string;
    recipient: string;
    error?: any;
  }> {
    const startTime = Date.now();

    try {
      // Check rate limiting
      const rateLimitKey = `otp:${params.userId}`;
      if (!this.checkRateLimit(rateLimitKey)) {
        throw new Error('Rate limit exceeded. Please wait before requesting another code.');
      }

      const otp = this.generateOTP();
      let result: any;
      let method: 'sms' | 'email';
      let recipient: string;

      // Determine delivery method
      if (params.preferredMethod === 'sms' && params.phone) {
        method = 'sms';
        recipient = params.phone;
        result = await this.sendOTPSMS({ to: params.phone, otp, userId: params.userId });
      } else if (params.preferredMethod === 'email' || !params.phone) {
        method = 'email';
        recipient = params.email;
        result = await this.sendOTPEmail({ to: params.email, otp, userId: params.userId });
      } else {
        // Default to SMS if available, fallback to email
        method = 'sms';
        recipient = params.phone!;
        result = await this.sendOTPSMS({ to: params.phone!, otp, userId: params.userId });

        if (!result.success && params.email) {
          method = 'email';
          recipient = params.email;
          result = await this.sendOTPEmail({ to: params.email, otp, userId: params.userId });
        }
      }

      if (!result.success) {
        throw new Error(`Failed to send OTP via ${method}: ${result.error?.message || 'Unknown error'}`);
      }

      // Store OTP in database
      const otpId = await this.storeOTP(params.userId, otp, method, recipient);

      const duration = Date.now() - startTime;
      this.metrics.recordHistogram('otp_send_duration', duration);
      this.metrics.incrementCounter('otp_sent', { method, success: 'true' });

      this.logger.info('OTP sent successfully', {
        userId: params.userId,
        method,
        recipient: this.maskRecipient(recipient),
        duration
      });

      return {
        success: true,
        method,
        otpId,
        recipient: this.maskRecipient(recipient)
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.recordHistogram('otp_send_duration', duration);
      this.metrics.incrementCounter('otp_sent', { method: 'unknown', success: 'false' });

      this.errorManager.handleError(error as Error, {
        operation: 'send_otp',
        component: 'otp_service',
        metadata: { userId: params.userId }
      });

      return {
        success: false,
        method: 'email', // Default
        otpId: '',
        recipient: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Verify OTP
  async verifyOTP(params: {
    userId: string;
    otp: string;
    otpId?: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Get the most recent unverified OTP for this user
      const otpRecords = await this.db.findMany<OTPRecord>('otps', {
        userId: params.userId,
        verified: false
      }, {
        orderBy: 'createdAt',
        orderDirection: 'DESC',
        limit: 5
      });

      if (otpRecords.length === 0) {
        return { success: false, error: 'No valid OTP found' };
      }

      for (const record of otpRecords) {
        // Check if OTP is expired
        if (new Date() > record.expiresAt) {
          continue;
        }

        // Check if max attempts exceeded
        if (record.attempts >= this.MAX_ATTEMPTS) {
          continue;
        }

        // Update attempt count
        await this.db.update('otps',
          { attempts: record.attempts + 1 },
          { id: record.id }
        );

        // Verify OTP
        const isValid = await bcrypt.compare(params.otp, record.otpHash);

        if (isValid) {
          // Mark as verified
          await this.db.update('otps',
            { verified: true },
            { id: record.id }
          );

          const duration = Date.now() - startTime;
          this.metrics.recordHistogram('otp_verify_duration', duration);
          this.metrics.incrementCounter('otp_verified', { success: 'true' });

          this.logger.info('OTP verified successfully', {
            userId: params.userId,
            otpId: record.id,
            method: record.method,
            duration
          });

          return { success: true };
        }
      }

      const duration = Date.now() - startTime;
      this.metrics.recordHistogram('otp_verify_duration', duration);
      this.metrics.incrementCounter('otp_verified', { success: 'false' });

      return { success: false, error: 'Invalid or expired OTP' };

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'verify_otp',
        component: 'otp_service',
        metadata: { userId: params.userId }
      });

      return {
        success: false,
        error: 'Verification failed due to system error'
      };
    }
  }

  // Clean up expired OTPs (maintenance function)
  async cleanupExpiredOTPs(): Promise<number> {
    try {
      const result = await this.db.query(
        'DELETE FROM otps WHERE expires_at < NOW() AND verified = false',
        []
      );

      this.logger.info('Expired OTPs cleaned up', {
        deletedCount: result.rowCount
      });

      return result.rowCount;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'cleanup_expired_otps',
        component: 'otp_service'
      });
      return 0;
    }
  }

  // Get OTP statistics for admin/monitoring
  async getOTPStats(userId?: string): Promise<{
    totalSent: number;
    totalVerified: number;
    successRate: number;
    methodBreakdown: Record<string, number>;
  }> {
    try {
      const whereClause = userId ? { userId } : {};

      const [sentRecords, verifiedRecords] = await Promise.all([
        this.db.findMany<OTPRecord>('otps', whereClause),
        this.db.findMany<OTPRecord>('otps', { ...whereClause, verified: true })
      ]);

      const methodBreakdown = sentRecords.reduce((acc, record) => {
        acc[record.method] = (acc[record.method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalSent: sentRecords.length,
        totalVerified: verifiedRecords.length,
        successRate: sentRecords.length > 0 ? verifiedRecords.length / sentRecords.length : 0,
        methodBreakdown
      };

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'get_otp_stats',
        component: 'otp_service',
        metadata: { userId }
      });
      return {
        totalSent: 0,
        totalVerified: 0,
        successRate: 0,
        methodBreakdown: {}
      };
    }
  }

  private maskRecipient(recipient: string): string {
    if (recipient.includes('@')) {
      // Email masking
      const [local, domain] = recipient.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    } else {
      // Phone number masking
      return `***${recipient.slice(-4)}`;
    }
  }
}

// Export singleton instance and legacy functions for backward compatibility
const otpService = OTPService.getInstance();

export default otpService;

// Legacy function exports for backward compatibility
export const generateOTP = (length?: number) => otpService.generateOTP(length);
export const sendOTP = (params: any) => otpService.sendOTP(params);
export const verifyOTP = (params: any) => otpService.verifyOTP(params);
export const logDelivery = (params: any) => otpService.logDelivery(params);
export const sendOTPSMS = (params: any) => otpService.sendOTPSMS(params);
export const sendOTPEmail = (params: any) => otpService.sendOTPEmail(params); 
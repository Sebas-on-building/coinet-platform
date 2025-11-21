import { ErrorManager } from '../errors/ErrorManager';
import { Logger } from '../logging/Logger';
import { MetricsCollector } from '../metrics/MetricsCollector';
import { SecretManager } from '../security/SecretManager';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export interface LoginCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  session?: Session;
  requires2FA?: boolean;
  twoFactorSecret?: string;
  qrCode?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  password?: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  role: 'user' | 'premium' | 'admin';
  createdAt: Date;
  lastLogin?: Date;
}

export interface Session {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress: string;
  userAgent: string;
}

export interface PasswordResetRequest {
  email: string;
  resetToken: string;
  expiresAt: Date;
}

export class AuthService {
  private static instance: AuthService;
  private errorManager: ErrorManager;
  private logger: Logger;
  private metrics: MetricsCollector;
  private secretManager: SecretManager;
  private jwtSecret: string | null = null;
  private jwtRefreshSecret: string | null = null;

  private readonly SALT_ROUNDS = 12;
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '30d';

  private constructor() {
    this.errorManager = ErrorManager.getInstance();
    this.logger = Logger.getInstance();
    this.metrics = MetricsCollector.getInstance();
    this.secretManager = SecretManager.getInstance();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async getJWTSecret(): Promise<string> {
    if (!this.jwtSecret) {
      this.jwtSecret = await this.secretManager.getSecret('JWT_SECRET', {
        source: 'env',
        required: true,
        minLength: 64
      });
    }
    return this.jwtSecret;
  }

  private async getRefreshSecret(): Promise<string> {
    if (!this.jwtRefreshSecret) {
      this.jwtRefreshSecret = await this.secretManager.getSecret('JWT_REFRESH_SECRET', {
        source: 'env',
        required: true,
        minLength: 64
      });
    }
    return this.jwtRefreshSecret;
  }

  async generateToken(payload: any): Promise<string> {
    try {
      const secret = await this.getJWTSecret();

      const token = jwt.sign(payload, secret, {
        expiresIn: this.ACCESS_TOKEN_EXPIRY,
        issuer: 'coinet-platform',
        audience: 'coinet-users',
        algorithm: 'HS256'
      });

      this.logger.info('Access token generated', {
        userId: payload.userId,
        expiresIn: this.ACCESS_TOKEN_EXPIRY
      });

      this.metrics.incrementCounter('auth_tokens_generated', { type: 'access' });

      return token;
    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'generate_access_token',
        component: 'auth_service',
        metadata: { userId: payload.userId }
      });
      throw error;
    }
  }

  async generateRefreshToken(payload: any): Promise<string> {
    try {
      const secret = await this.getRefreshSecret();

      const token = jwt.sign(payload, secret, {
        expiresIn: this.REFRESH_TOKEN_EXPIRY,
        issuer: 'coinet-platform',
        audience: 'coinet-users',
        algorithm: 'HS256'
      });

      this.logger.info('Refresh token generated', {
        userId: payload.userId,
        expiresIn: this.REFRESH_TOKEN_EXPIRY
      });

      this.metrics.incrementCounter('auth_tokens_generated', { type: 'refresh' });

      return token;
    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'generate_refresh_token',
        component: 'auth_service',
        metadata: { userId: payload.userId }
      });
      throw error;
    }
  }

  async verifyToken(token: string, type: 'access' | 'refresh' = 'access'): Promise<any> {
    try {
      const secret = type === 'access'
        ? await this.getJWTSecret()
        : await this.getRefreshSecret();

      const decoded = jwt.verify(token, secret, {
        issuer: 'coinet-platform',
        audience: 'coinet-users',
        algorithms: ['HS256']
      });

      this.metrics.incrementCounter('auth_tokens_verified', { type, result: 'success' });

      return decoded;
    } catch (error) {
      this.metrics.incrementCounter('auth_tokens_verified', { type, result: 'failure' });

      this.errorManager.handleError(error as Error, {
        operation: 'verify_token',
        component: 'auth_service',
        metadata: { type }
      });

      throw error;
    }
  }

  async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, this.SALT_ROUNDS);

      this.metrics.incrementCounter('passwords_hashed');

      return hash;
    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'hash_password',
        component: 'auth_service'
      });
      throw error;
    }
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hash);

      this.metrics.incrementCounter('passwords_verified', {
        result: isValid ? 'success' : 'failure'
      });

      return isValid;
    } catch (error) {
      this.metrics.incrementCounter('passwords_verified', { result: 'error' });

      this.errorManager.handleError(error as Error, {
        operation: 'verify_password',
        component: 'auth_service'
      });
      throw error;
    }
  }

  async revokeToken(token: string): Promise<void> {
    // Implementation for token revocation (blacklist)
    // This would typically involve storing revoked tokens in Redis
    this.logger.info('Token revoked', { token: token.substring(0, 20) + '...' });
    this.metrics.incrementCounter('auth_tokens_revoked');
  }

  // Clear cached secrets (for rotation scenarios)
  clearSecrets(): void {
    this.jwtSecret = null;
    this.jwtRefreshSecret = null;
    this.secretManager.clearCache();
  }

  /**
   * User Registration with comprehensive validation
   */
  async register(userData: {
    email: string;
    password: string;
    username: string;
  }): Promise<AuthResult> {
    const startTime = Date.now();

    try {
      // 1. Validate input
      this.validateRegistrationData(userData);

      // 2. Check if user exists
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('USER_ALREADY_EXISTS');
      }

      // 3. Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // 4. Create user
      const user = await this.createUser({
        ...userData,
        password: hashedPassword,
      });

      // 5. Generate tokens
      const tokens = await this.generateTokens(user);

      // 6. Create session
      const session = await this.createSession(user, tokens);

      this.metrics.incrementCounter('auth.register.success');
      this.metrics.recordHistogram('auth.register.duration', Date.now() - startTime);

      this.logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      return {
        success: true,
        user,
        tokens,
        session,
      };

    } catch (error) {
      this.metrics.incrementCounter('auth.register.error');
      this.errorManager.handleError(error as Error, {
        operation: 'register',
        email: userData.email,
      });

      return {
        success: false,
      };
    }
  }

  /**
   * User Login with 2FA support
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const startTime = Date.now();

    try {
      // 1. Validate credentials
      const user = await this.validateCredentials(credentials);

      // 2. Check 2FA if enabled
      if (user.twoFactorEnabled) {
        if (!credentials.twoFactorCode) {
          return {
            success: false,
            requires2FA: true,
          };
        }

        const isValid2FA = await this.verify2FA(user, credentials.twoFactorCode);
        if (!isValid2FA) {
          throw new Error('INVALID_2FA_CODE');
        }
      }

      // 3. Generate tokens
      const tokens = await this.generateTokens(user);

      // 4. Create session
      const session = await this.createSession(user, tokens);

      // 5. Update last login
      await this.updateLastLogin(user.id);

      this.metrics.incrementCounter('auth.login.success');
      this.metrics.recordHistogram('auth.login.duration', Date.now() - startTime);

      this.logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
      });

      return {
        success: true,
        user,
        tokens,
        session,
      };

    } catch (error) {
      this.metrics.incrementCounter('auth.login.error');
      this.errorManager.handleError(error as Error, {
        operation: 'login',
        email: credentials.email,
      });

      return {
        success: false,
      };
    }
  }

  /**
   * Setup 2FA for user (simplified version)
   */
  async setup2FA(userId: string): Promise<{
    secret: string;
    qrCode: string;
  }> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // Generate a simple secret (would use speakeasy in production)
      const secret = this.generateSimpleSecret();

      // Store secret temporarily (user needs to verify)
      await this.storeTempSecret(userId, secret);

      // Generate a placeholder QR code URL (would use qrcode library in production)
      const qrCode = `data:image/svg+xml;base64,${Buffer.from(`
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
          <rect width="200" height="200" fill="white"/>
          <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12">
            2FA Setup - Secret: ${secret}
          </text>
        </svg>
      `).toString('base64')}`;

      this.logger.info('2FA setup initiated', { userId });

      return {
        secret,
        qrCode,
      };

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'setup2FA',
        userId,
      });
      throw error;
    }
  }

  /**
   * Verify and enable 2FA
   */
  async verify2FASetup(userId: string, code: string): Promise<boolean> {
    try {
      const tempSecret = await this.getTempSecret(userId);
      if (!tempSecret) {
        throw new Error('No 2FA setup in progress');
      }

      // Simplified verification (would use speakeasy in production)
      const isValid = this.verifySimpleTOTP(tempSecret, code);

      if (isValid) {
        await this.enable2FA(userId, tempSecret);
        await this.removeTempSecret(userId);
        this.logger.info('2FA enabled successfully', { userId });
        return true;
      }

      return false;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'verify2FASetup',
        userId,
      });
      return false;
    }
  }

  /**
   * Verify 2FA code
   */
  private async verify2FA(user: User, code: string): Promise<boolean> {
    if (!user.twoFactorSecret) {
      return false;
    }

    // Simplified verification (would use speakeasy in production)
    return this.verifySimpleTOTP(user.twoFactorSecret, code);
  }

  /**
   * Validate user credentials
   */
  private async validateCredentials(credentials: LoginCredentials): Promise<User> {
    const user = await this.getUserByEmail(credentials.email);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    if (!user.password) {
      throw new Error('INVALID_USER_DATA');
    }

    const isValidPassword = await this.verifyPassword(credentials.password, user.password);
    if (!isValidPassword) {
      throw new Error('INVALID_PASSWORD');
    }

    return user;
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = await this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = await this.generateRefreshToken({
      userId: user.id,
      type: 'refresh',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      const decoded = await this.verifyToken(refreshToken, 'refresh');

      if (decoded.type !== 'refresh') {
        throw new Error('INVALID_REFRESH_TOKEN');
      }

      const user = await this.getUserById(decoded.userId);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      const tokens = await this.generateTokens(user);

      return {
        success: true,
        user,
        tokens,
      };

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'refreshToken',
      });

      return {
        success: false,
      };
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<boolean> {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists
        return true;
      }

      const resetToken = this.generateResetToken();
      const resetRequest: PasswordResetRequest = {
        email,
        resetToken,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      };

      await this.storePasswordResetRequest(resetRequest);

      this.logger.info('Password reset requested', { email });
      return true;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'requestPasswordReset',
        email,
      });
      return false;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const resetRequest = await this.getPasswordResetRequest(token);
      if (!resetRequest || resetRequest.expiresAt < new Date()) {
        throw new Error('INVALID_OR_EXPIRED_TOKEN');
      }

      const hashedPassword = await this.hashPassword(newPassword);
      await this.updateUserPassword(resetRequest.email, hashedPassword);
      await this.removePasswordResetRequest(token);

      this.logger.info('Password reset successfully', { email: resetRequest.email });
      return true;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'resetPassword',
      });
      return false;
    }
  }

  /**
   * Logout user
   */
  async logout(sessionId: string): Promise<boolean> {
    try {
      await this.invalidateSession(sessionId);
      this.logger.info('User logged out', { sessionId });
      return true;

    } catch (error) {
      this.errorManager.handleError(error as Error, {
        operation: 'logout',
        sessionId,
      });
      return false;
    }
  }

  // Private helper methods (simplified implementations)
  private async getUserByEmail(email: string): Promise<User | null> {
    // TODO: Implement database query
    return null;
  }

  private async getUserById(id: string): Promise<User | null> {
    // TODO: Implement database query
    return null;
  }

  private async createUser(userData: any): Promise<User> {
    // TODO: Implement database insertion
    return userData as User;
  }

  private async createSession(user: User, tokens: any): Promise<Session> {
    // TODO: Implement session creation
    return {} as Session;
  }

  private validateRegistrationData(data: any): void {
    if (!data.email || !data.password || !data.username) {
      throw new Error('MISSING_REQUIRED_FIELDS');
    }

    if (data.password.length < 8) {
      throw new Error('PASSWORD_TOO_SHORT');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('INVALID_EMAIL_FORMAT');
    }
  }

  private generateResetToken(): string {
    return Math.random().toString(36).substr(2, 15);
  }

  private generateSimpleSecret(): string {
    return Math.random().toString(36).substr(2, 32);
  }

  private verifySimpleTOTP(secret: string, code: string): boolean {
    // Simplified TOTP verification - would use speakeasy in production
    const timeWindow = Math.floor(Date.now() / 30000);
    const expectedCode = (timeWindow + secret.length).toString().substr(-6);
    return code === expectedCode;
  }

  // Placeholder methods for database operations
  private async updateLastLogin(userId: string): Promise<void> { }
  private async storeTempSecret(userId: string, secret: string): Promise<void> { }
  private async getTempSecret(userId: string): Promise<string | null> { return null; }
  private async removeTempSecret(userId: string): Promise<void> { }
  private async enable2FA(userId: string, secret: string): Promise<void> { }
  private async storePasswordResetRequest(request: PasswordResetRequest): Promise<void> { }
  private async getPasswordResetRequest(token: string): Promise<PasswordResetRequest | null> { return null; }
  private async removePasswordResetRequest(token: string): Promise<void> { }
  private async updateUserPassword(email: string, hashedPassword: string): Promise<void> { }
  private async invalidateSession(sessionId: string): Promise<void> { }
} 
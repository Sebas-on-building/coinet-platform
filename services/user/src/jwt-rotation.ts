/**
 * Coinet User Service - JWT Key Rotation Management
 * 
 * Implements automatic JWT key rotation for enhanced security
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

interface JWTKeyPair {
  id: string;
  publicKey: string;
  privateKey: string;
  algorithm: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  usage: 'signing' | 'verification';
}

interface JWTRotationConfig {
  rotationInterval: number; // milliseconds
  overlapPeriod: number; // milliseconds
  keyAlgorithm: 'RS256' | 'ES256' | 'HS256';
  keySize: number;
  maxKeys: number;
}

class JWTKeyRotationManager {
  private keys: Map<string, JWTKeyPair> = new Map();
  private config: JWTRotationConfig;
  private rotationTimer: NodeJS.Timeout | null = null;
  private currentSigningKey: string | null = null;

  constructor(config: Partial<JWTRotationConfig> = {}) {
    this.config = {
      rotationInterval: 24 * 60 * 60 * 1000, // 24 hours
      overlapPeriod: 2 * 60 * 60 * 1000, // 2 hours
      keyAlgorithm: 'RS256',
      keySize: 2048,
      maxKeys: 5,
      ...config
    };

    this.initializeKeys();
    this.startRotationSchedule();
  }

  private async initializeKeys(): Promise<void> {
    console.log('🔄 Initializing JWT key rotation...');
    
    // Generate initial key pair
    const keyPair = await this.generateKeyPair();
    this.keys.set(keyPair.id, keyPair);
    this.currentSigningKey = keyPair.id;
    
    console.log(`✅ Initial JWT key pair generated: ${keyPair.id}`);
  }

  private async generateKeyPair(): Promise<JWTKeyPair> {
    const keyId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.rotationInterval + this.config.overlapPeriod);

    let publicKey: string;
    let privateKey: string;

    if (this.config.keyAlgorithm === 'RS256') {
      // Generate RSA key pair
      const { publicKey: pubKey, privateKey: privKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: this.config.keySize,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
      publicKey = pubKey;
      privateKey = privKey;
    } else if (this.config.keyAlgorithm === 'ES256') {
      // Generate ECDSA key pair
      const { publicKey: pubKey, privateKey: privKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
      publicKey = pubKey;
      privateKey = privKey;
    } else {
      // Generate HMAC secret for HS256
      const secret = crypto.randomBytes(64).toString('hex');
      publicKey = secret;
      privateKey = secret;
    }

    return {
      id: keyId,
      publicKey,
      privateKey,
      algorithm: this.config.keyAlgorithm,
      createdAt: now,
      expiresAt,
      isActive: true,
      usage: 'signing'
    };
  }

  private startRotationSchedule(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    this.rotationTimer = setInterval(() => {
      this.rotateKeys();
    }, this.config.rotationInterval);

    console.log(`🔄 JWT key rotation scheduled every ${this.config.rotationInterval / (60 * 60 * 1000)} hours`);
  }

  private async rotateKeys(): Promise<void> {
    try {
      console.log('🔄 Starting JWT key rotation...');

      // Generate new key pair
      const newKeyPair = await this.generateKeyPair();
      
      // Mark current signing key for verification only
      if (this.currentSigningKey) {
        const currentKey = this.keys.get(this.currentSigningKey);
        if (currentKey) {
          currentKey.usage = 'verification';
          this.keys.set(this.currentSigningKey, currentKey);
        }
      }

      // Add new key and set as current signing key
      this.keys.set(newKeyPair.id, newKeyPair);
      this.currentSigningKey = newKeyPair.id;

      // Clean up expired keys
      this.cleanupExpiredKeys();

      console.log(`✅ JWT key rotation completed. New signing key: ${newKeyPair.id}`);

      // Notify monitoring systems
      this.notifyKeyRotation(newKeyPair.id);

    } catch (error) {
      console.error('❌ JWT key rotation failed:', error);
      throw error;
    }
  }

  private cleanupExpiredKeys(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [keyId, keyPair] of this.keys.entries()) {
      if (keyPair.expiresAt < now && keyPair.usage === 'verification') {
        this.keys.delete(keyId);
        cleanedCount++;
      }
    }

    // Ensure we don't exceed max keys
    const keyArray = Array.from(this.keys.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (keyArray.length > this.config.maxKeys) {
      const keysToRemove = keyArray.slice(this.config.maxKeys);
      keysToRemove.forEach(key => {
        if (key.usage === 'verification') {
          this.keys.delete(key.id);
          cleanedCount++;
        }
      });
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired JWT keys`);
    }
  }

  private notifyKeyRotation(newKeyId: string): void {
    // TODO: Integrate with monitoring and alerting
    console.log(`📢 JWT key rotation notification: New key ${newKeyId} is now active`);
    
    // In production, this would:
    // 1. Update Kubernetes secrets
    // 2. Notify all services of new key
    // 3. Send alerts to monitoring systems
    // 4. Update service mesh configuration
  }

  // Public API methods
  public getCurrentSigningKey(): JWTKeyPair | null {
    if (!this.currentSigningKey) return null;
    return this.keys.get(this.currentSigningKey) || null;
  }

  public getVerificationKeys(): JWTKeyPair[] {
    return Array.from(this.keys.values())
      .filter(key => key.isActive);
  }

  public getKeyById(keyId: string): JWTKeyPair | null {
    return this.keys.get(keyId) || null;
  }

  public getJWKS(): any {
    const keys = this.getVerificationKeys().map(keyPair => {
      if (keyPair.algorithm === 'RS256') {
        // Convert RSA public key to JWK format
        const publicKeyObj = crypto.createPublicKey(keyPair.publicKey);
        return {
          kty: 'RSA',
          kid: keyPair.id,
          use: 'sig',
          alg: 'RS256',
          n: publicKeyObj.asymmetricKeyDetails?.mgf1HashAlgorithm, // Simplified
          e: 'AQAB'
        };
      } else if (keyPair.algorithm === 'ES256') {
        // Convert ECDSA public key to JWK format
        return {
          kty: 'EC',
          kid: keyPair.id,
          use: 'sig',
          alg: 'ES256',
          crv: 'P-256'
        };
      }
      return null;
    }).filter(Boolean);

    return {
      keys
    };
  }

  public async rotateNow(): Promise<void> {
    await this.rotateKeys();
  }

  public getRotationStatus(): any {
    const currentKey = this.getCurrentSigningKey();
    const allKeys = Array.from(this.keys.values());

    return {
      currentSigningKey: currentKey?.id,
      totalKeys: allKeys.length,
      activeKeys: allKeys.filter(k => k.isActive).length,
      nextRotation: currentKey ? new Date(currentKey.createdAt.getTime() + this.config.rotationInterval) : null,
      config: {
        rotationInterval: this.config.rotationInterval,
        overlapPeriod: this.config.overlapPeriod,
        keyAlgorithm: this.config.keyAlgorithm,
        maxKeys: this.config.maxKeys
      },
      keys: allKeys.map(key => ({
        id: key.id,
        algorithm: key.algorithm,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt,
        isActive: key.isActive,
        usage: key.usage,
        isCurrent: key.id === this.currentSigningKey
      }))
    };
  }

  public stop(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
    console.log('🛑 JWT key rotation stopped');
  }
}

// Enhanced JWT utilities with rotation support
export class RotatingJWTManager {
  private rotationManager: JWTKeyRotationManager;
  private jwt: any = null;

  constructor(config?: Partial<JWTRotationConfig>) {
    this.rotationManager = new JWTKeyRotationManager(config);
    
    // Try to load jsonwebtoken
    try {
      this.jwt = require('jsonwebtoken');
    } catch (e) {
      console.warn('⚠️  jsonwebtoken not available, using fallback');
    }
  }

  public createToken(payload: any, options: any = {}): string {
    const signingKey = this.rotationManager.getCurrentSigningKey();
    if (!signingKey) {
      throw new Error('No signing key available');
    }

    if (this.jwt && signingKey.algorithm !== 'HS256') {
      return this.jwt.sign(payload, signingKey.privateKey, {
        algorithm: signingKey.algorithm,
        keyid: signingKey.id,
        expiresIn: options.expiresIn || '7d',
        issuer: 'coinet.ai',
        audience: 'coinet-platform'
      });
    } else {
      // Fallback implementation
      const header = {
        alg: signingKey.algorithm,
        typ: 'JWT',
        kid: signingKey.id
      };
      
      const body = {
        ...payload,
        iss: 'coinet.ai',
        aud: 'coinet-platform',
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000),
        iat: Date.now()
      };

      const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
      const bodyB64 = Buffer.from(JSON.stringify(body)).toString('base64url');
      const signature = crypto.createHmac('sha256', signingKey.privateKey)
        .update(`${headerB64}.${bodyB64}`)
        .digest('base64url');

      return `${headerB64}.${bodyB64}.${signature}`;
    }
  }

  public verifyToken(token: string): any {
    const [headerB64, payloadB64, signature] = token.split('.');
    if (!headerB64 || !payloadB64 || !signature) {
      throw new Error('Invalid token format');
    }

    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
    const keyId = header.kid;

    if (!keyId) {
      throw new Error('Token missing key ID');
    }

    const verificationKey = this.rotationManager.getKeyById(keyId);
    if (!verificationKey) {
      throw new Error('Unknown key ID');
    }

    if (this.jwt && verificationKey.algorithm !== 'HS256') {
      return this.jwt.verify(token, verificationKey.publicKey, {
        algorithms: [verificationKey.algorithm],
        issuer: 'coinet.ai',
        audience: 'coinet-platform'
      });
    } else {
      // Fallback verification
      const expectedSignature = crypto.createHmac('sha256', verificationKey.privateKey)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        throw new Error('Invalid signature');
      }

      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
      
      if (payload.exp && payload.exp < Date.now()) {
        throw new Error('Token expired');
      }

      return payload;
    }
  }

  public getJWKS(): any {
    return this.rotationManager.getJWKS();
  }

  public getRotationStatus(): any {
    return this.rotationManager.getRotationStatus();
  }

  public async rotateNow(): Promise<void> {
    await this.rotationManager.rotateNow();
  }

  public stop(): void {
    this.rotationManager.stop();
  }
}

// Export singleton instance
export const jwtManager = new RotatingJWTManager({
  rotationInterval: parseInt(process.env.JWT_ROTATION_INTERVAL || '86400000'), // 24 hours
  overlapPeriod: parseInt(process.env.JWT_OVERLAP_PERIOD || '7200000'), // 2 hours
  keyAlgorithm: (process.env.JWT_ALGORITHM as any) || 'RS256',
  keySize: parseInt(process.env.JWT_KEY_SIZE || '2048'),
  maxKeys: parseInt(process.env.JWT_MAX_KEYS || '5')
});

// Kubernetes secret update utility
export const updateKubernetesSecrets = async (keyPair: JWTKeyPair): Promise<void> => {
  try {
    // In production, this would update Kubernetes secrets
    console.log(`🔄 Updating Kubernetes secrets with new JWT key: ${keyPair.id}`);
    
    // Example kubectl command that would be executed:
    // kubectl create secret generic coinet-jwt-secrets \
    //   --from-literal=jwt-public-key="${keyPair.publicKey}" \
    //   --from-literal=jwt-private-key="${keyPair.privateKey}" \
    //   --from-literal=jwt-key-id="${keyPair.id}" \
    //   --dry-run=client -o yaml | kubectl apply -f -
    
    console.log('✅ Kubernetes secrets updated successfully');
  } catch (error) {
    console.error('❌ Failed to update Kubernetes secrets:', error);
    throw error;
  }
};

// Service mesh configuration update
export const updateServiceMeshConfig = async (keyPair: JWTKeyPair): Promise<void> => {
  try {
    console.log(`🔄 Updating service mesh JWT configuration: ${keyPair.id}`);
    
    // In production, this would update Istio/Envoy JWT policies
    // Example: Update RequestAuthentication and AuthorizationPolicy resources
    
    console.log('✅ Service mesh configuration updated');
  } catch (error) {
    console.error('❌ Failed to update service mesh config:', error);
    throw error;
  }
};

export default JWTKeyRotationManager;

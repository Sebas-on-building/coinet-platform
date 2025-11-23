import { RedisService } from "./redis";

interface ApiKeyConfig {
  key: string;
  rateLimit: number;
  interval: number; // in milliseconds
  weight?: number;
}

interface ApiKeyStatus {
  key: string;
  requestCount: number;
  lastReset: number;
  isBlocked: boolean;
  blockUntil?: number;
}

export class ApiKeyManager {
  private static instance: ApiKeyManager;
  private redis: RedisService;
  private keyConfigs: Map<string, ApiKeyConfig[]>;
  private currentKeyIndex: Map<string, number>;
  private readonly REDIS_KEY_PREFIX = "api:key:status:";

  private constructor() {
    this.redis = RedisService.getInstance();
    this.keyConfigs = new Map();
    this.currentKeyIndex = new Map();
  }

  public static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  public async addKeys(service: string, keys: ApiKeyConfig[]): Promise<void> {
    this.keyConfigs.set(service, keys);
    this.currentKeyIndex.set(service, 0);

    // Initialize key statuses in Redis
    for (const keyConfig of keys) {
      const status: ApiKeyStatus = {
        key: keyConfig.key,
        requestCount: 0,
        lastReset: Date.now(),
        isBlocked: false,
      };
      await this.redis.set(
        this.getRedisKey(service, keyConfig.key),
        status,
        keyConfig.interval,
      );
    }
  }

  public async getNextKey(service: string): Promise<string> {
    const keys = this.keyConfigs.get(service);
    if (!keys || keys.length === 0) {
      throw new Error(`No API keys configured for service: ${service}`);
    }

    const availableKey = await this.findAvailableKey(service, keys);
    if (!availableKey) {
      throw new Error(`No available API keys for service: ${service}`);
    }

    return availableKey;
  }

  private async findAvailableKey(
    service: string,
    keys: ApiKeyConfig[],
  ): Promise<string> {
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const currentIndex = this.currentKeyIndex.get(service) || 0;
      const keyConfig = keys[currentIndex];

      const status = await this.getKeyStatus(service, keyConfig.key);
      const now = Date.now();

      // Reset counter if interval has passed
      if (now - status.lastReset >= keyConfig.interval) {
        await this.resetKeyStatus(service, keyConfig.key);
        return keyConfig.key;
      }

      // Check if key is available
      if (!status.isBlocked && status.requestCount < keyConfig.rateLimit) {
        await this.incrementRequestCount(service, keyConfig.key);
        return keyConfig.key;
      }

      // Move to next key
      this.currentKeyIndex.set(service, (currentIndex + 1) % keys.length);
    }

    return "";
  }

  private async getKeyStatus(
    service: string,
    key: string,
  ): Promise<ApiKeyStatus> {
    const status = await this.redis.get<ApiKeyStatus>(
      this.getRedisKey(service, key),
    );
    if (!status) {
      return {
        key,
        requestCount: 0,
        lastReset: Date.now(),
        isBlocked: false,
      };
    }
    return status;
  }

  private async incrementRequestCount(
    service: string,
    key: string,
  ): Promise<void> {
    const status = await this.getKeyStatus(service, key);
    status.requestCount++;

    const keyConfig = this.keyConfigs.get(service)?.find((k) => k.key === key);
    if (status.requestCount >= (keyConfig?.rateLimit || 0)) {
      status.isBlocked = true;
      status.blockUntil = Date.now() + (keyConfig?.interval || 0);
    }

    await this.redis.set(
      this.getRedisKey(service, key),
      status,
      Math.ceil((keyConfig?.interval || 0) / 1000),
    );
  }

  private async resetKeyStatus(service: string, key: string): Promise<void> {
    const status: ApiKeyStatus = {
      key,
      requestCount: 1, // Start with 1 as we're using the key
      lastReset: Date.now(),
      isBlocked: false,
    };

    const keyConfig = this.keyConfigs.get(service)?.find((k) => k.key === key);
    await this.redis.set(
      this.getRedisKey(service, key),
      status,
      Math.ceil((keyConfig?.interval || 0) / 1000),
    );
  }

  private getRedisKey(service: string, key: string): string {
    return `${this.REDIS_KEY_PREFIX}${service}:${key}`;
  }

  public async getKeyMetrics(service: string): Promise<{
    totalKeys: number;
    availableKeys: number;
    blockedKeys: number;
    totalRequests: number;
  }> {
    const keys = this.keyConfigs.get(service) || [];
    let availableKeys = 0;
    let blockedKeys = 0;
    let totalRequests = 0;

    for (const keyConfig of keys) {
      const status = await this.getKeyStatus(service, keyConfig.key);
      if (status.isBlocked) {
        blockedKeys++;
      } else {
        availableKeys++;
      }
      totalRequests += status.requestCount;
    }

    return {
      totalKeys: keys.length,
      availableKeys,
      blockedKeys,
      totalRequests,
    };
  }
}

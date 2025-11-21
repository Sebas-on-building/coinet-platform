export class MemoryPolicyManager {
  static getMaxMemoryConfig(serviceName: string) {
    // Custom per-service memory limits
    return {
      maxmemory: '2gb',
      maxmemoryPolicy: 'allkeys-lru',
    };
  }
} 
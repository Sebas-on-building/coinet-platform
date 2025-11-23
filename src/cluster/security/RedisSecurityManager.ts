export class RedisSecurityManager {
  static getACLConfig(serviceName: string) {
    // Generate ACL rules per service
    return {
      user: serviceName,
      password: process.env[`REDIS_${serviceName.toUpperCase()}_PASSWORD`],
      commands: ['+@all'],
      keys: [`${KeyPrefixManager.getPrefix(serviceName)}*`],
    };
  }

  static getNetworkConfig() {
    return {
      bind: '127.0.0.1', // Internal only
      tls: true,
      allowedIPs: ['10.0.0.0/8', '192.168.0.0/16'],
    };
  }
} 
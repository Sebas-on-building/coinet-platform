export class KeyPrefixManager {
  static getPrefix(serviceName: string): string {
    return `co_${serviceName}:`;
  }

  static prefixKey(serviceName: string, key: string): string {
    return `${this.getPrefix(serviceName)}${key}`;
  }
} 
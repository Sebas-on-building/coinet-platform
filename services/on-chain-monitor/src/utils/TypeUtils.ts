/**
 * =========================================
 * TYPE UTILITIES
 * =========================================
 * Helper functions for type conversions and safe casting
 */

import { Logger } from './Logger';

const logger = new Logger('TypeUtils');

/**
 * Safely casts a value to a specified type. Logs a warning if the cast is potentially unsafe.
 * This is a temporary utility to bypass strict type checking during complex library integrations.
 */
export function safeCast<T>(value: any, targetTypeName: string, propertyName: string): T {
  if (typeof value === 'bigint' && targetTypeName === 'number') {
    logger.warn(`Unsafe cast: Converting bigint to number for property '${propertyName}'. Consider explicit conversion.`);
    return Number(value) as T;
  }
  if (value === null || value === undefined) {
    logger.debug(`Casting null/undefined to ${targetTypeName} for property '${propertyName}'.`);
    return undefined as T; // Explicitly return undefined for null/undefined
  }
  // Add more specific checks if needed
  return value as T;
}

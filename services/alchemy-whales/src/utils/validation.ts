/**
 * Input validation utilities
 */

import { z } from 'zod';
import { ValidationError } from '../types';

/**
 * Validate input against Zod schema
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Validation failed', error);
    }
    throw error;
  }
}

/**
 * Check if string is valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if string is valid transaction hash
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Normalize address to lowercase with 0x prefix
 */
export function normalizeAddress(address: string): string {
  if (!address) return address;
  const normalized = address.toLowerCase();
  return normalized.startsWith('0x') ? normalized : `0x${normalized}`;
}

/**
 * Format large numbers with comma separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * Format USD value
 */
export function formatUsd(value: number): string {
  return `$${formatNumber(value)}`;
}

/**
 * Format large number with K, M, B suffixes
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
}

/**
 * Sanitize string for SQL/NoSQL injection prevention
 */
export function sanitizeString(str: string): string {
  if (!str) return str;
  return str
    .replace(/['"\\]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

/**
 * Parse block number (string or number) to number
 */
export function parseBlockNumber(block: string | number | 'latest'): number | 'latest' {
  if (block === 'latest') return 'latest';
  if (typeof block === 'number') return block;
  
  // Handle hex string
  if (block.startsWith('0x')) {
    return parseInt(block, 16);
  }
  
  return parseInt(block, 10);
}


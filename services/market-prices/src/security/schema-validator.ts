/**
 * ============================================
 * API RESPONSE SCHEMA VALIDATOR
 * ============================================
 * 
 * Enterprise-grade schema validation for API responses:
 * - Detects API breaking changes
 * - Graceful degradation on schema mismatches
 * - Auto-learning of new fields
 * - Alert generation for schema violations
 * 
 * Ensures system stability when APIs evolve.
 */

import { EventEmitter } from 'eventemitter3';
import { logger } from '../utils/logger';
import { getPrometheusMetrics } from '../monitoring/prometheus-metrics';

/**
 * Field schema definition
 */
export interface FieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'any';
  required: boolean;
  nullable?: boolean;
  nested?: Record<string, FieldSchema>;
  itemSchema?: FieldSchema;
  validator?: (value: any) => boolean;
  transformer?: (value: any) => any;
}

/**
 * Schema definition
 */
export interface SchemaDefinition {
  name: string;
  version: string;
  fields: Record<string, FieldSchema>;
  strict?: boolean; // Fail on unknown fields
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  unknownFields: string[];
  missingOptionalFields: string[];
  transformedData?: any;
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  expected: string;
  received: string;
  message: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Schema validation metrics
 */
export interface SchemaMetrics {
  schemaName: string;
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  unknownFieldsDetected: number;
  transformationsApplied: number;
  lastValidation: Date;
}

/**
 * API Response Schema Validator
 */
export class SchemaValidator extends EventEmitter {
  private schemas: Map<string, SchemaDefinition> = new Map();
  private schemaMetrics: Map<string, SchemaMetrics> = new Map();
  private learnedFields: Map<string, Set<string>> = new Map();
  private readonly metrics = getPrometheusMetrics();

  constructor() {
    super();
    this.registerMetrics();
    this.registerDefaultSchemas();
    logger.info('Schema Validator initialized');
  }

  /**
   * Register Prometheus metrics
   */
  private registerMetrics(): void {
    this.metrics.register({
      name: 'schema_validations_total',
      help: 'Total number of schema validations',
      type: 'counter',
      labels: ['schema', 'status'],
    });

    this.metrics.register({
      name: 'schema_unknown_fields_total',
      help: 'Total unknown fields detected',
      type: 'counter',
      labels: ['schema'],
    });

    this.metrics.register({
      name: 'schema_validation_errors_total',
      help: 'Total schema validation errors',
      type: 'counter',
      labels: ['schema', 'field'],
    });
  }

  /**
   * Register default schemas for known APIs
   */
  private registerDefaultSchemas(): void {
    // CoinGecko price schema
    this.registerSchema({
      name: 'coingecko_price',
      version: '1.0.0',
      strict: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      fields: {
        id: { name: 'id', type: 'string', required: true },
        symbol: { name: 'symbol', type: 'string', required: true },
        name: { name: 'name', type: 'string', required: true },
        current_price: { name: 'current_price', type: 'number', required: true, nullable: true },
        market_cap: { name: 'market_cap', type: 'number', required: false, nullable: true },
        market_cap_rank: { name: 'market_cap_rank', type: 'number', required: false, nullable: true },
        total_volume: { name: 'total_volume', type: 'number', required: false, nullable: true },
        price_change_24h: { name: 'price_change_24h', type: 'number', required: false, nullable: true },
        price_change_percentage_24h: { name: 'price_change_percentage_24h', type: 'number', required: false, nullable: true },
        circulating_supply: { name: 'circulating_supply', type: 'number', required: false, nullable: true },
        total_supply: { name: 'total_supply', type: 'number', required: false, nullable: true },
        max_supply: { name: 'max_supply', type: 'number', required: false, nullable: true },
        ath: { name: 'ath', type: 'number', required: false, nullable: true },
        atl: { name: 'atl', type: 'number', required: false, nullable: true },
        last_updated: { name: 'last_updated', type: 'string', required: false, nullable: true },
      },
    });

    // CoinMarketCap quote schema
    this.registerSchema({
      name: 'coinmarketcap_quote',
      version: '1.0.0',
      strict: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      fields: {
        id: { name: 'id', type: 'number', required: true },
        name: { name: 'name', type: 'string', required: true },
        symbol: { name: 'symbol', type: 'string', required: true },
        slug: { name: 'slug', type: 'string', required: false },
        cmc_rank: { name: 'cmc_rank', type: 'number', required: false, nullable: true },
        circulating_supply: { name: 'circulating_supply', type: 'number', required: false, nullable: true },
        total_supply: { name: 'total_supply', type: 'number', required: false, nullable: true },
        max_supply: { name: 'max_supply', type: 'number', required: false, nullable: true },
        quote: {
          name: 'quote',
          type: 'object',
          required: true,
          nested: {
            USD: {
              name: 'USD',
              type: 'object',
              required: true,
              nested: {
                price: { name: 'price', type: 'number', required: true, nullable: true },
                volume_24h: { name: 'volume_24h', type: 'number', required: false, nullable: true },
                percent_change_24h: { name: 'percent_change_24h', type: 'number', required: false, nullable: true },
                market_cap: { name: 'market_cap', type: 'number', required: false, nullable: true },
              },
            },
          },
        },
      },
    });

    // DexScreener pair schema
    this.registerSchema({
      name: 'dexscreener_pair',
      version: '1.0.0',
      strict: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      fields: {
        chainId: { name: 'chainId', type: 'string', required: true },
        dexId: { name: 'dexId', type: 'string', required: true },
        pairAddress: { name: 'pairAddress', type: 'string', required: true },
        baseToken: {
          name: 'baseToken',
          type: 'object',
          required: true,
          nested: {
            address: { name: 'address', type: 'string', required: true },
            name: { name: 'name', type: 'string', required: false },
            symbol: { name: 'symbol', type: 'string', required: true },
          },
        },
        quoteToken: {
          name: 'quoteToken',
          type: 'object',
          required: true,
          nested: {
            address: { name: 'address', type: 'string', required: true },
            symbol: { name: 'symbol', type: 'string', required: true },
          },
        },
        priceNative: { name: 'priceNative', type: 'string', required: false },
        priceUsd: { name: 'priceUsd', type: 'string', required: false, nullable: true },
        liquidity: {
          name: 'liquidity',
          type: 'object',
          required: false,
          nested: {
            usd: { name: 'usd', type: 'number', required: false, nullable: true },
          },
        },
        volume: {
          name: 'volume',
          type: 'object',
          required: false,
          nested: {
            h24: { name: 'h24', type: 'number', required: false, nullable: true },
          },
        },
      },
    });

    // DeFiLlama protocol schema
    this.registerSchema({
      name: 'defillama_protocol',
      version: '1.0.0',
      strict: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      fields: {
        id: { name: 'id', type: 'string', required: true },
        name: { name: 'name', type: 'string', required: true },
        slug: { name: 'slug', type: 'string', required: false },
        chain: { name: 'chain', type: 'string', required: false },
        chains: { name: 'chains', type: 'array', required: false },
        tvl: { name: 'tvl', type: 'number', required: false, nullable: true },
        change_1h: { name: 'change_1h', type: 'number', required: false, nullable: true },
        change_1d: { name: 'change_1d', type: 'number', required: false, nullable: true },
        change_7d: { name: 'change_7d', type: 'number', required: false, nullable: true },
        category: { name: 'category', type: 'string', required: false },
      },
    });

    // CryptoPanic news schema
    this.registerSchema({
      name: 'cryptopanic_news',
      version: '1.0.0',
      strict: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      fields: {
        id: { name: 'id', type: 'number', required: true },
        title: { name: 'title', type: 'string', required: true },
        published_at: { name: 'published_at', type: 'string', required: true },
        url: { name: 'url', type: 'string', required: true },
        source: {
          name: 'source',
          type: 'object',
          required: true,
          nested: {
            title: { name: 'title', type: 'string', required: true },
            domain: { name: 'domain', type: 'string', required: false },
          },
        },
        currencies: { name: 'currencies', type: 'array', required: false, nullable: true },
        votes: {
          name: 'votes',
          type: 'object',
          required: false,
          nested: {
            positive: { name: 'positive', type: 'number', required: false },
            negative: { name: 'negative', type: 'number', required: false },
          },
        },
      },
    });

    logger.info('Default schemas registered', {
      schemas: Array.from(this.schemas.keys()),
    });
  }

  /**
   * Register a schema
   */
  registerSchema(schema: SchemaDefinition): void {
    this.schemas.set(schema.name, schema);
    this.schemaMetrics.set(schema.name, {
      schemaName: schema.name,
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      unknownFieldsDetected: 0,
      transformationsApplied: 0,
      lastValidation: new Date(),
    });
    this.learnedFields.set(schema.name, new Set());
  }

  /**
   * Validate data against a schema
   */
  validate(schemaName: string, data: any): ValidationResult {
    const schema = this.schemas.get(schemaName);
    
    if (!schema) {
      logger.warn(`Schema not found: ${schemaName}`);
      return {
        valid: false,
        errors: [{ field: '', expected: schemaName, received: 'unknown', message: 'Schema not found' }],
        warnings: [],
        unknownFields: [],
        missingOptionalFields: [],
      };
    }

    const metrics = this.schemaMetrics.get(schemaName)!;
    metrics.totalValidations++;
    metrics.lastValidation = new Date();

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const unknownFields: string[] = [];
    const missingOptionalFields: string[] = [];
    let transformedData = { ...data };

    // Validate each field
    for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
      const result = this.validateField(fieldName, data[fieldName], fieldSchema, schemaName);
      
      if (result.error) {
        errors.push(result.error);
      }
      if (result.warning) {
        warnings.push(result.warning);
      }
      if (result.missing && !fieldSchema.required) {
        missingOptionalFields.push(fieldName);
      }
      if (result.transformed !== undefined) {
        transformedData[fieldName] = result.transformed;
        metrics.transformationsApplied++;
      }
    }

    // Detect unknown fields
    const knownFields = new Set(Object.keys(schema.fields));
    const learnedSet = this.learnedFields.get(schemaName)!;
    
    for (const key of Object.keys(data)) {
      if (!knownFields.has(key) && !learnedSet.has(key)) {
        unknownFields.push(key);
        learnedSet.add(key);
        metrics.unknownFieldsDetected++;
        
        this.metrics.incCounter('schema_unknown_fields_total', { schema: schemaName });
        
        warnings.push({
          field: key,
          message: `Unknown field detected: ${key}`,
          severity: 'low',
        });
      }
    }

    // Emit event if unknown fields detected
    if (unknownFields.length > 0) {
      this.emit('unknown_fields', {
        schema: schemaName,
        fields: unknownFields,
        timestamp: new Date(),
      });
    }

    const valid = errors.length === 0;

    if (valid) {
      metrics.successfulValidations++;
      this.metrics.incCounter('schema_validations_total', { schema: schemaName, status: 'success' });
    } else {
      metrics.failedValidations++;
      this.metrics.incCounter('schema_validations_total', { schema: schemaName, status: 'failure' });
      
      // Log validation errors
      for (const error of errors) {
        this.metrics.incCounter('schema_validation_errors_total', { schema: schemaName, field: error.field });
      }

      logger.warn(`Schema validation failed: ${schemaName}`, {
        errors: errors.slice(0, 5),
        errorCount: errors.length,
      });

      this.emit('validation_failed', {
        schema: schemaName,
        errors,
        data: this.sanitizeForLogging(data),
      });
    }

    return {
      valid,
      errors,
      warnings,
      unknownFields,
      missingOptionalFields,
      transformedData: valid ? transformedData : undefined,
    };
  }

  /**
   * Validate a single field
   */
  private validateField(
    fieldName: string,
    value: any,
    schema: FieldSchema,
    schemaName: string,
    path: string = ''
  ): {
    error?: ValidationError;
    warning?: ValidationWarning;
    missing?: boolean;
    transformed?: any;
  } {
    const fullPath = path ? `${path}.${fieldName}` : fieldName;

    // Check required
    if (value === undefined) {
      if (schema.required) {
        return {
          error: {
            field: fullPath,
            expected: schema.type,
            received: 'undefined',
            message: `Required field missing: ${fullPath}`,
          },
        };
      }
      return { missing: true };
    }

    // Check nullable
    if (value === null) {
      if (schema.nullable) {
        return {};
      }
      if (!schema.required) {
        return {};
      }
      return {
        error: {
          field: fullPath,
          expected: schema.type,
          received: 'null',
          message: `Field is null but not nullable: ${fullPath}`,
        },
      };
    }

    // Type check
    const actualType = this.getType(value);
    if (schema.type !== 'any' && actualType !== schema.type) {
      // Try to transform
      const transformed = this.tryTransform(value, schema.type);
      if (transformed !== null) {
        return {
          transformed,
          warning: {
            field: fullPath,
            message: `Type mismatch, transformed from ${actualType} to ${schema.type}`,
            severity: 'low',
          },
        };
      }

      return {
        error: {
          field: fullPath,
          expected: schema.type,
          received: actualType,
          message: `Type mismatch: expected ${schema.type}, got ${actualType}`,
        },
      };
    }

    // Validate nested object
    if (schema.type === 'object' && schema.nested && typeof value === 'object') {
      for (const [nestedField, nestedSchema] of Object.entries(schema.nested)) {
        const result = this.validateField(nestedField, value[nestedField], nestedSchema, schemaName, fullPath);
        if (result.error) {
          return result;
        }
      }
    }

    // Validate array items
    if (schema.type === 'array' && schema.itemSchema && Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const result = this.validateField(`[${i}]`, value[i], schema.itemSchema, schemaName, fullPath);
        if (result.error) {
          return result;
        }
      }
    }

    // Custom validator
    if (schema.validator && !schema.validator(value)) {
      return {
        error: {
          field: fullPath,
          expected: 'valid value',
          received: String(value),
          message: `Custom validation failed for ${fullPath}`,
        },
      };
    }

    // Custom transformer
    if (schema.transformer) {
      return { transformed: schema.transformer(value) };
    }

    return {};
  }

  /**
   * Get JavaScript type
   */
  private getType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Try to transform a value to the expected type
   */
  private tryTransform(value: any, targetType: string): any {
    try {
      switch (targetType) {
        case 'number':
          if (typeof value === 'string') {
            const num = parseFloat(value);
            if (!isNaN(num)) return num;
          }
          break;
        case 'string':
          if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
          }
          break;
        case 'boolean':
          if (typeof value === 'string') {
            if (value.toLowerCase() === 'true') return true;
            if (value.toLowerCase() === 'false') return false;
          }
          if (typeof value === 'number') {
            return value !== 0;
          }
          break;
      }
    } catch {
      // Transformation failed
    }
    return null;
  }

  /**
   * Sanitize data for logging (remove sensitive info)
   */
  private sanitizeForLogging(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };
    const sensitiveFields = ['api_key', 'apiKey', 'secret', 'password', 'token'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Get schema metrics
   */
  getMetrics(): Map<string, SchemaMetrics> {
    return new Map(this.schemaMetrics);
  }

  /**
   * Get learned fields for a schema
   */
  getLearnedFields(schemaName: string): string[] {
    return Array.from(this.learnedFields.get(schemaName) || []);
  }

  /**
   * Update schema with learned fields
   */
  promoteLearnedFields(schemaName: string): void {
    const schema = this.schemas.get(schemaName);
    const learned = this.learnedFields.get(schemaName);

    if (schema && learned) {
      for (const field of learned) {
        if (!schema.fields[field]) {
          schema.fields[field] = {
            name: field,
            type: 'any',
            required: false,
            nullable: true,
          };
        }
      }

      schema.updatedAt = new Date();
      learned.clear();

      logger.info(`Promoted learned fields for ${schemaName}`, {
        fieldCount: learned.size,
      });
    }
  }

  /**
   * Export all schemas
   */
  exportSchemas(): Record<string, SchemaDefinition> {
    const exported: Record<string, SchemaDefinition> = {};
    for (const [name, schema] of this.schemas) {
      exported[name] = { ...schema };
    }
    return exported;
  }
}

/**
 * Global instance
 */
let globalSchemaValidator: SchemaValidator | null = null;

export function getSchemaValidator(): SchemaValidator {
  if (!globalSchemaValidator) {
    globalSchemaValidator = new SchemaValidator();
  }
  return globalSchemaValidator;
}

export function resetSchemaValidator(): void {
  globalSchemaValidator = null;
}

export default SchemaValidator;


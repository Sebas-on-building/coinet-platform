/**
 * =========================================
 * ELITE DATA QUALITY VALIDATOR
 * =========================================
 * World-class data quality validation system ensuring schema consistency,
 * data accuracy, and freshness across all external data sources.
 * Implements comprehensive validation rules with sub-millisecond processing.
 */

import { EventEmitter } from 'events';
import { Logger } from '../../../utils/Logger';

export interface ValidationConfig {
  enabled: boolean;
  schemaValidation: boolean;
  freshnessThreshold: number; // seconds
  accuracyThreshold: number; // percentage
  rules: {
    priceData: {
      requiredFields: string[];
      dataTypes: Record<string, string>;
      ranges: Record<string, { min: number; max: number }>;
    };
    blockchainData: {
      requiredFields: string[];
      dataTypes: Record<string, string>;
      blockNumberRange: { min: number; max: number };
    };
    socialData: {
      requiredFields: string[];
      dataTypes: Record<string, string>;
      textLength: { min: number; max: number };
    };
    newsData: {
      requiredFields: string[];
      dataTypes: Record<string, string>;
      sentimentRange: { min: number; max: number };
    };
    defiData: {
      requiredFields: string[];
      dataTypes: Record<string, string>;
      tvlRange: { min: number; max: number };
    };
  };
  customValidators: Record<string, (data: any) => boolean>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100 quality score
  metadata: {
    validatedAt: Date;
    validationTime: number; // milliseconds
    schemaVersion: string;
  };
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  value?: any;
  expected?: any;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}

export interface DataQualityMetrics {
  totalValidations: number;
  validRecords: number;
  invalidRecords: number;
  averageScore: number;
  errorRate: number;
  validationTime: number;
  schemaViolations: number;
  dataFreshness: number;
  accuracyRate: number;
}

export class DataQualityValidator extends EventEmitter {
  private static instance: DataQualityValidator;
  private logger: Logger;
  private config: ValidationConfig;
  private metrics: DataQualityMetrics;
  private schemaCache: Map<string, any> = new Map();

  constructor(config: ValidationConfig) {
    super();
    this.logger = Logger.getInstance();
    this.config = config;
    this.metrics = this.initializeMetrics();
  }

  static getInstance(config: ValidationConfig): DataQualityValidator {
    if (!DataQualityValidator.instance) {
      DataQualityValidator.instance = new DataQualityValidator(config);
    }
    return DataQualityValidator.instance;
  }

  private initializeMetrics(): DataQualityMetrics {
    return {
      totalValidations: 0,
      validRecords: 0,
      invalidRecords: 0,
      averageScore: 0,
      errorRate: 0,
      validationTime: 0,
      schemaViolations: 0,
      dataFreshness: 0,
      accuracyRate: 0
    };
  }

  /**
   * Validate data against schema and rules
   */
  validate(data: any, source: string = 'unknown'): ValidationResult {
    if (!this.config.enabled) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        score: 100,
        metadata: {
          validatedAt: new Date(),
          validationTime: 0,
          schemaVersion: '1.0'
        }
      };
    }

    const startTime = Date.now();
    this.metrics.totalValidations++;

    try {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        score: 100,
        metadata: {
          validatedAt: new Date(),
          validationTime: 0,
          schemaVersion: '1.0'
        }
      };

      // Run validation pipeline
      result.errors.push(...this.validateSchema(data, source));
      result.warnings.push(...this.validateDataQuality(data, source));
      result.errors.push(...this.validateBusinessRules(data, source));

      // Calculate overall score
      result.score = this.calculateQualityScore(result.errors, result.warnings);

      // Update metrics
      if (result.isValid && result.errors.length === 0) {
        this.metrics.validRecords++;
      } else {
        this.metrics.invalidRecords++;
      }

      result.metadata.validationTime = Date.now() - startTime;
      this.metrics.validationTime = result.metadata.validationTime;

      return result;

    } catch (error) {
      this.logger.error('❌ Data validation failed', {
        error: error instanceof Error ? error.message : String(error),
        source,
        data: data
      });

      return {
        isValid: false,
        errors: [{
          field: 'validation',
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          severity: 'error'
        }],
        warnings: [],
        score: 0,
        metadata: {
          validatedAt: new Date(),
          validationTime: Date.now() - startTime,
          schemaVersion: '1.0'
        }
      };
    }
  }

  /**
   * Validate data against schema
   */
  private validateSchema(data: any, source: string): ValidationError[] {
    if (!this.config.schemaValidation) return [];

    const errors: ValidationError[] = [];
    const rules = this.getValidationRules(source);

    if (!rules) return errors;

    // Check required fields
    for (const field of rules.requiredFields) {
      if (!(field in data) || data[field] === null || data[field] === undefined) {
        errors.push({
          field,
          code: 'MISSING_REQUIRED_FIELD',
          message: `Required field '${field}' is missing`,
          severity: 'error'
        });
      }
    }

    // Check data types
    for (const [field, expectedType] of Object.entries(rules.dataTypes)) {
      if (field in data && data[field] !== null && data[field] !== undefined) {
        const actualType = this.getDataType(data[field]);
        if (actualType !== expectedType) {
          errors.push({
            field,
            code: 'INVALID_DATA_TYPE',
            message: `Field '${field}' has type '${actualType}', expected '${expectedType}'`,
            severity: 'error',
            value: data[field],
            expected: expectedType
          });
        }
      }
    }

    // Check value ranges
    for (const [field, range] of Object.entries(rules.ranges || {})) {
      const rangeTyped = range as { min: number; max: number };
      if (field in data && typeof data[field] === 'number') {
        if (data[field] < rangeTyped.min || data[field] > rangeTyped.max) {
          errors.push({
            field,
            code: 'VALUE_OUT_OF_RANGE',
            message: `Field '${field}' value ${data[field]} is outside range [${rangeTyped.min}, ${rangeTyped.max}]`,
            severity: 'warning',
            value: data[field],
            expected: rangeTyped
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate data quality and freshness
   */
  private validateDataQuality(data: any, source: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check data freshness
    if (data.timestamp) {
      const age = Date.now() - new Date(data.timestamp).getTime();
      if (age > this.config.freshnessThreshold * 1000) {
        warnings.push({
          field: 'timestamp',
          code: 'STALE_DATA',
          message: `Data is ${Math.round(age / 1000)}s old, exceeds freshness threshold of ${this.config.freshnessThreshold}s`,
          suggestion: 'Check data source connectivity and refresh frequency'
        });
      }
    }

    // Source-specific quality checks
    switch (source) {
      case 'websocket':
        warnings.push(...this.validatePriceDataQuality(data));
        break;
      case 'blockchain':
        warnings.push(...this.validateBlockchainDataQuality(data));
        break;
      case 'social':
        warnings.push(...this.validateSocialDataQuality(data));
        break;
      case 'news':
        warnings.push(...this.validateNewsDataQuality(data));
        break;
      case 'defi':
        warnings.push(...this.validateDeFiDataQuality(data));
        break;
    }

    return warnings;
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(data: any, source: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Run custom validators
    for (const [validatorName, validator] of Object.entries(this.config.customValidators)) {
      try {
        if (!validator(data)) {
          errors.push({
            field: 'custom',
            code: 'BUSINESS_RULE_VIOLATION',
            message: `Custom validator '${validatorName}' failed`,
            severity: 'error'
          });
        }
      } catch (error) {
        errors.push({
          field: 'custom',
          code: 'VALIDATION_ERROR',
          message: `Custom validator '${validatorName}' threw error: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'error'
        });
      }
    }

    return errors;
  }

  /**
   * Validate price data quality
   */
  private validatePriceDataQuality(data: any): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check price reasonableness
    if (data.price && (data.price <= 0 || data.price > 1000000)) {
      warnings.push({
        field: 'price',
        code: 'UNREASONABLE_PRICE',
        message: `Price ${data.price} seems unreasonable for a cryptocurrency`,
        suggestion: 'Verify price data source and conversion rates'
      });
    }

    // Check volume consistency
    if (data.volume && data.price && (data.volume * data.price > 1000000000)) {
      warnings.push({
        field: 'volume',
        code: 'HIGH_VOLUME',
        message: `Volume ${data.volume} seems unusually high`,
        suggestion: 'Check for data feed errors or unusual market activity'
      });
    }

    return warnings;
  }

  /**
   * Validate blockchain data quality
   */
  private validateBlockchainDataQuality(data: any): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check block number progression
    if (data.blockNumber && data.blockNumber < 0) {
      warnings.push({
        field: 'blockNumber',
        code: 'INVALID_BLOCK_NUMBER',
        message: `Block number ${data.blockNumber} is negative`,
        suggestion: 'Verify blockchain data source'
      });
    }

    // Check gas price reasonableness
    if (data.gasPrice && data.gasPrice > 100000000000) { // 100 gwei
      warnings.push({
        field: 'gasPrice',
        code: 'HIGH_GAS_PRICE',
        message: `Gas price ${data.gasPrice} seems unusually high`,
        suggestion: 'Check for network congestion or data feed issues'
      });
    }

    return warnings;
  }

  /**
   * Validate social media data quality
   */
  private validateSocialDataQuality(data: any): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check text length
    const rules = this.config.rules.socialData;
    if (data.text && data.text.length < rules.textLength.min) {
      warnings.push({
        field: 'text',
        code: 'TEXT_TOO_SHORT',
        message: `Text length ${data.text.length} is below minimum ${rules.textLength.min}`,
        suggestion: 'Filter out very short messages'
      });
    }

    if (data.text && data.text.length > rules.textLength.max) {
      warnings.push({
        field: 'text',
        code: 'TEXT_TOO_LONG',
        message: `Text length ${data.text.length} exceeds maximum ${rules.textLength.max}`,
        suggestion: 'Truncate or summarize long messages'
      });
    }

    return warnings;
  }

  /**
   * Validate news data quality
   */
  private validateNewsDataQuality(data: any): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check sentiment bounds
    const rules = this.config.rules.newsData;
    if (data.sentiment !== undefined && (data.sentiment < rules.sentimentRange.min || data.sentiment > rules.sentimentRange.max)) {
      warnings.push({
        field: 'sentiment',
        code: 'SENTIMENT_OUT_OF_BOUNDS',
        message: `Sentiment score ${data.sentiment} is outside expected range [${rules.sentimentRange.min}, ${rules.sentimentRange.max}]`,
        suggestion: 'Review sentiment analysis algorithm'
      });
    }

    return warnings;
  }

  /**
   * Validate DeFi data quality
   */
  private validateDeFiDataQuality(data: any): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check TVL reasonableness
    const rules = this.config.rules.defiData;
    if (data.tvl && (data.tvl < rules.tvlRange.min || data.tvl > rules.tvlRange.max)) {
      warnings.push({
        field: 'tvl',
        code: 'UNREASONABLE_TVL',
        message: `TVL ${data.tvl} is outside expected range [${rules.tvlRange.min}, ${rules.tvlRange.max}]`,
        suggestion: 'Verify DeFi protocol data source'
      });
    }

    return warnings;
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(errors: ValidationError[], warnings: ValidationWarning[]): number {
    const totalIssues = errors.length + warnings.length;
    const errorWeight = 0.7;
    const warningWeight = 0.3;

    const errorPenalty = errors.length * errorWeight * 20; // 20 points per error
    const warningPenalty = warnings.length * warningWeight * 5; // 5 points per warning

    return Math.max(0, 100 - errorPenalty - warningPenalty);
  }

  /**
   * Get data type of a value
   */
  private getDataType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'unknown';
  }

  /**
   * Get validation rules for a source
   */
  private getValidationRules(source: string): any {
    switch (source) {
      case 'websocket':
        return this.config.rules.priceData;
      case 'blockchain':
        return this.config.rules.blockchainData;
      case 'social':
        return this.config.rules.socialData;
      case 'news':
        return this.config.rules.newsData;
      case 'defi':
        return this.config.rules.defiData;
      default:
        return null;
    }
  }

  /**
   * Register custom validator
   */
  registerValidator(name: string, validator: (data: any) => boolean): void {
    this.config.customValidators[name] = validator;
  }

  /**
   * Update validation rules
   */
  updateValidationRules(source: string, rules: any): void {
    switch (source) {
      case 'websocket':
        this.config.rules.priceData = { ...this.config.rules.priceData, ...rules };
        break;
      case 'blockchain':
        this.config.rules.blockchainData = { ...this.config.rules.blockchainData, ...rules };
        break;
      case 'social':
        this.config.rules.socialData = { ...this.config.rules.socialData, ...rules };
        break;
      case 'news':
        this.config.rules.newsData = { ...this.config.rules.newsData, ...rules };
        break;
      case 'defi':
        this.config.rules.defiData = { ...this.config.rules.defiData, ...rules };
        break;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): DataQualityMetrics {
    return { ...this.metrics };
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    total: number;
    valid: number;
    invalid: number;
    errorRate: number;
    averageScore: number;
  } {
    return {
      total: this.metrics.totalValidations,
      valid: this.metrics.validRecords,
      invalid: this.metrics.invalidRecords,
      errorRate: this.metrics.errorRate,
      averageScore: this.metrics.averageScore
    };
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.schemaCache.clear();
  }

  /**
   * Export validation rules
   */
  exportValidationRules(): any {
    return { ...this.config.rules };
  }

  /**
   * Import validation rules
   */
  importValidationRules(rules: any): void {
    this.config.rules = { ...this.config.rules, ...rules };
  }
}

/**
 * ============================================
 * SECURITY MODULE EXPORTS
 * ============================================
 * 
 * Enterprise-grade security components:
 * - Key rotation management
 * - Enhanced key rotation with auto-recovery
 * - Schema validation for API changes
 */

// Key Rotation
export {
  KeyRotationManager,
  getKeyRotationManager,
  resetKeyRotationManager,
  type APIKeyConfig,
  type KeyRotationEvent,
  type KeyUsageStats,
} from './key-rotation';

// Enhanced Key Rotation
export {
  EnhancedKeyRotationManager,
  getEnhancedKeyRotation,
  resetEnhancedKeyRotation,
  type EnhancedAPIKeyConfig,
  type KeyHealthStatus,
  type RateLimitEvent,
  type AutoRotationConfig,
} from './enhanced-key-rotation';

// Schema Validation
export {
  SchemaValidator,
  getSchemaValidator,
  resetSchemaValidator,
  type FieldSchema,
  type SchemaDefinition,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type SchemaMetrics,
} from './schema-validator';

export default {
  KeyRotationManager,
  EnhancedKeyRotationManager,
  SchemaValidator,
};


/**
 * =========================================
 * ALERT EVALUATION ENGINE
 * =========================================
 * High-performance rule-based alert system with
 * AND/OR logical operators and real-time evaluation
 */

// Core classes
export { RuleParser } from './RuleParser';
export { RuleEngine } from './RuleEngine';
export { AlertAPI } from './AlertAPI';

// Types
export type {
  ASTNode,
  SignalConditionNode,
  LogicalOperatorNode,
  GroupNode,
  AlertRule,
  RuleEvaluationContext,
  RuleEvaluationResult,
  AlertNotification,
  RuleTemplate,
  AlertStudioState,
  AlertEngineConfig,
  AlertEngineMetrics,
  CreateRuleRequest,
  UpdateRuleRequest,
  EvaluateRuleRequest,
  EvaluateRuleResponse,
  BulkRuleOperationRequest,
  BulkRuleOperationResponse,
  RuleValidationResult,
  RuleUpdateEvent,
  EvaluationEvent,
  AlertEvent
} from './types';

// Error types
export {
  RuleParsingError,
  RuleValidationError,
  RuleEvaluationError,
  AlertDeliveryError
} from './types';

// API interfaces
export type { AlertAPIEndpoints } from './AlertAPI';

// Default configuration factory
export { AlertAPI as default } from './AlertAPI';

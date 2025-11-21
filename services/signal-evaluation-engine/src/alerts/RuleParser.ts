/**
 * =========================================
 * RULE PARSER
 * =========================================
 * Parses logical expressions into Abstract Syntax Trees (AST)
 * for the alert evaluation engine with full operator precedence
 */

import { Logger } from '../utils/Logger';
import type { SignalType } from '../types';
import type {
  ASTNode,
  SignalConditionNode,
  LogicalOperatorNode,
  GroupNode,
  SequenceNode
} from './types';
import { RuleParsingError } from './types';

export class RuleParser {
  private logger: Logger;
  private availableSignals: SignalType[];

  constructor(availableSignals: SignalType[] = []) {
    this.logger = new Logger('RuleParser');
    this.availableSignals = availableSignals;
  }

  /**
   * Parse a logical expression into an AST
   */
  parse(expression: string): ASTNode {
    try {
      this.logger.debug('Parsing expression', { expression });

      // Remove whitespace and normalize
      const normalizedExpression = this.normalizeExpression(expression);

      if (!normalizedExpression) {
        throw new RuleParsingError('Empty expression');
      }

      // Parse the expression
      const ast = this.parseExpression(normalizedExpression);

      this.logger.debug('Expression parsed successfully', {
        expression,
        astType: ast.type,
        astId: ast.id
      });

      return ast;

    } catch (error: any) {
      if (error instanceof RuleParsingError) {
        throw error;
      }

      this.logger.error('Failed to parse expression', { expression, error: error.message });
      throw new RuleParsingError(`Parse error: ${error.message}`);
    }
  }

  /**
   * Parse expression with proper precedence handling
   */
  private parseExpression(expression: string, minPrecedence: number = 0): ASTNode {
    let left = this.parsePrimary(expression);

    while (this.hasMoreTokens(expression)) {
      const operator = this.peekOperator(expression);
      if (!operator || this.getPrecedence(operator) < minPrecedence) {
        break;
      }

      // Consume the operator
      expression = this.consumeOperator(expression);

      // Parse right side with higher precedence
      const right = this.parseExpression(expression, this.getPrecedence(operator) + 1);

      left = this.createLogicalNode(operator, left, right);
    }

    return left;
  }

  /**
   * Parse primary expressions (conditions, groups, sequences, etc.)
   */
  private parsePrimary(expression: string): ASTNode {
    // Handle parentheses
    if (this.peek(expression) === '(') {
      expression = this.consumeToken(expression, '(');
      const innerExpression = this.parseExpression(expression);
      expression = this.consumeToken(expression, ')');
      return this.createGroupNode(innerExpression);
    }

    // Handle sequence patterns
    if (this.peekWord(expression) === 'SEQUENCE') {
      return this.parseSequencePattern(expression);
    }

    // Handle NOT operator
    if (this.peek(expression) === '!' || this.peekWord(expression) === 'NOT') {
      const notToken = this.peek(expression) === '!' ? '!' : 'NOT';
      expression = this.consumeToken(expression, notToken);
      const operand = this.parsePrimary(expression);
      return this.createLogicalNode('NOT', operand);
    }

    // Parse signal condition
    return this.parseSignalCondition(expression);
  }

  /**
   * Parse a sequence pattern
   */
  private parseSequencePattern(expression: string): SequenceNode {
    const nodeId = this.generateNodeId();

    // Consume SEQUENCE keyword
    expression = this.consumeWord(expression, 'SEQUENCE');

    // Parse sequence steps
    const steps: ASTNode[] = [];
    let continueParsing = true;

    while (continueParsing && this.hasMoreTokens(expression)) {
      // Parse step
      const step = this.parseExpression(expression, 0);
      steps.push(step);

      // Check for comma or end
      const remaining = expression.trim();
      if (remaining.startsWith(',')) {
        expression = this.consumeToken(expression, ',');
      } else {
        continueParsing = false;
      }
    }

    // Parse optional parameters
    let maxGap = 300; // Default 5 minutes
    let orderSensitive = true; // Default order sensitive
    let timeWeighted = false; // Default not time weighted
    let minMatches = steps.length; // Default require all steps

    // Check for parameters
    const remaining = expression.trim();
    if (remaining.startsWith('WITH')) {
      expression = this.consumeWord(expression, 'WITH');

      // Parse parameters
      while (this.hasMoreTokens(expression)) {
        const paramName = this.peekWord(expression);
        expression = this.consumeWord(expression, paramName);

        switch (paramName.toLowerCase()) {
          case 'maxgap':
            expression = this.consumeToken(expression, '=');
            maxGap = this.parseNumber(expression) || 0; // Default to 0 if null
            expression = this.consumeNumber(expression);
            break;

          case 'ordersensitive':
            expression = this.consumeToken(expression, '=');
            orderSensitive = this.parseBoolean(expression);
            expression = this.consumeBoolean(expression);
            break;

          case 'timeweighted':
            expression = this.consumeToken(expression, '=');
            timeWeighted = this.parseBoolean(expression);
            expression = this.consumeBoolean(expression);
            break;

          case 'minmatches':
            expression = this.consumeToken(expression, '=');
            minMatches = (this.parseNumber(expression) || 0); // Default to 0 if null
            expression = this.consumeNumber(expression);
            break;

          default:
            throw new RuleParsingError(`Unknown parameter: ${paramName}`, this.getPosition(expression));
        }

        // Check for comma or end
        const next = expression.trim();
        if (next.startsWith(',')) {
          expression = this.consumeToken(expression, ',');
        } else {
          break;
        }
      }
    }

    return {
      type: 'sequence',
      id: nodeId,
      steps,
      maxGap,
      orderSensitive,
      timeWeighted,
      minMatches
    };
  }

  /**
   * Parse a signal condition
   */
  private parseSignalCondition(expression: string): SignalConditionNode {
    const nodeId = this.generateNodeId();

    // Parse signal type
    const signalType = this.parseSignalType(expression);
    if (!signalType) {
      throw new RuleParsingError('Expected signal type', this.getPosition(expression));
    }

    expression = this.consumeWord(expression, signalType);

    // Parse operator
    const operator = this.parseOperator(expression);
    if (!operator) {
      throw new RuleParsingError('Expected operator after signal type', this.getPosition(expression));
    }

    expression = this.consumeOperator(expression);

    // Parse threshold value
    const threshold = this.parseNumber(expression);
    if (threshold === null) {
      throw new RuleParsingError('Expected numeric threshold', this.getPosition(expression));
    }

    expression = this.consumeNumber(expression);

    // Check for optional window specification
    let window: number | undefined;
    if (this.peekWord(expression) === 'WITHIN') {
      expression = this.consumeWord(expression, 'WITHIN');
      window = this.parseNumber(expression) || undefined;
      expression = this.consumeNumber(expression);
    }

    return {
      type: 'signal_condition',
      id: nodeId,
      signalType,
      operator,
      threshold,
      field: 'value', // Default field, could be extended
      window
    };
  }

  /**
   * Parse signal type from expression
   */
  private parseSignalType(expression: string): SignalType | null {
    const word = this.peekWord(expression);

    if (this.availableSignals.includes(word as SignalType)) {
      return word as SignalType;
    }

    return null;
  }

  /**
   * Parse operator from expression
   */
  private parseOperator(expression: string): '>' | '<' | '>=' | '<=' | '==' | '!=' {
    const operatorRegex = /^(>|<|>=|<=|==|!=)\s*/;
    const match = expression.match(operatorRegex);
    if (!match) {
      throw new RuleParsingError('Expected an operator (>, <, >=, <=, ==, !=)', 0);
    }
    const operator = match[1];
    if (['>', '<', '>=', '<=', '==', '!='].includes(operator)) {
      return operator as '>' | '<' | '>=' | '<=' | '==' | '!=';
    }
    throw new RuleParsingError(`Invalid operator: ${operator}`, 0);
  }

  /**
   * Parse number from expression
   */
  private parseNumber(expression: string): number | null {
    const match = expression.match(/^\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  }

  /**
   * Parse boolean from expression
   */
  private parseBoolean(expression: string): boolean {
    const word = this.peekWord(expression).toLowerCase();
    if (word === 'true') return true;
    if (word === 'false') return false;
    throw new RuleParsingError('Expected true or false', this.getPosition(expression));
  }

  /**
   * Consume boolean from expression
   */
  private consumeBoolean(expression: string): string {
    const word = this.peekWord(expression);
    return this.consumeWord(expression, word);
  }

  /**
   * Create logical operator node
   */
  private createLogicalNode(operator: string, left?: ASTNode, right?: ASTNode): LogicalOperatorNode {
    const nodeType = this.mapOperatorToType(operator);
    const nodeId = this.generateNodeId();

    return {
      type: nodeType,
      id: nodeId,
      left,
      right
    };
  }

  /**
   * Create group node
   */
  private createGroupNode(expression: ASTNode): GroupNode {
    const nodeId = this.generateNodeId();

    return {
      type: 'group',
      id: nodeId,
      expression
    };
  }

  /**
   * Map operator string to AST node type
   */
  private mapOperatorToType(operator: string): 'logical_and' | 'logical_or' | 'logical_not' {
    switch (operator) {
      case 'AND':
      case '&&':
        return 'logical_and';
      case 'OR':
      case '||':
        return 'logical_or';
      case 'NOT':
      case '!':
        return 'logical_not';
      default:
        throw new RuleParsingError(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Get operator precedence
   */
  private getPrecedence(operator: string): number {
    switch (operator) {
      case 'NOT':
      case '!':
        return 4;
      case 'AND':
      case '&&':
        return 3;
      case 'OR':
      case '||':
        return 2;
      default:
        return 1;
    }
  }

  /**
   * Check if there are more tokens to parse
   */
  private hasMoreTokens(expression: string): boolean {
    return expression.trim().length > 0;
  }

  /**
   * Peek at the next operator
   */
  private peekOperator(expression: string): string | null {
    const trimmed = expression.trim();

    if (trimmed.startsWith('AND') || trimmed.startsWith('&&')) return 'AND';
    if (trimmed.startsWith('OR') || trimmed.startsWith('||')) return 'OR';
    if (trimmed.startsWith('NOT') || trimmed.startsWith('!')) return 'NOT';

    return null;
  }

  /**
   * Peek at next character
   */
  private peek(expression: string): string {
    return expression.trim().charAt(0) || '';
  }

  /**
   * Peek at next word
   */
  private peekWord(expression: string): string {
    const match = expression.trim().match(/^[A-Z_]+/);
    return match ? match[0] : '';
  }

  /**
   * Consume token from expression
   */
  private consumeToken(expression: string, token: string): string {
    const trimmed = expression.trim();

    if (!trimmed.startsWith(token)) {
      throw new RuleParsingError(`Expected '${token}'`, this.getPosition(expression));
    }

    return trimmed.substring(token.length).trim();
  }

  /**
   * Consume word from expression
   */
  private consumeWord(expression: string, word: string): string {
    const trimmed = expression.trim();

    if (!trimmed.startsWith(word)) {
      throw new RuleParsingError(`Expected '${word}'`, this.getPosition(expression));
    }

    return trimmed.substring(word.length).trim();
  }

  /**
   * Consume operator from expression
   */
  private consumeOperator(expression: string): string {
    const operatorRegex = /^(>|<|>=|<=|==|!=)\s*/;
    const match = expression.match(operatorRegex);
    if (!match) {
      throw new RuleParsingError('Expected an operator', 0);
    }
    return expression.substring(match[0].length);
  }

  /**
   * Consume number from expression
   */
  private consumeNumber(expression: string): string {
    const trimmed = expression.trim();
    const match = trimmed.match(/^\d+(\.\d+)?/);

    if (!match) {
      throw new RuleParsingError('Expected number', this.getPosition(expression));
    }

    return trimmed.substring(match[0].length).trim();
  }

  /**
   * Normalize expression (remove extra whitespace, handle case)
   */
  private normalizeExpression(expression: string): string {
    return expression
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\(\s+/g, '(') // Remove space after opening paren
      .replace(/\s+\)/g, ')') // Remove space before closing paren
      .replace(/\s*([()])/g, '$1') // Remove space around parentheses
      .replace(/\s*([><=!&|]+)/g, ' $1 ') // Add space around operators
      .trim();
  }

  /**
   * Get current position in expression (approximate)
   */
  private getPosition(expression: string): number {
    // This is a simplified position calculation
    return Math.max(0, expression.length - 10);
  }

  /**
   * Generate unique node ID
   */
  private generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate AST structure
   */
  validateAST(ast: ASTNode): boolean {
    try {
      this.validateNode(ast);
      return true;
    } catch (error: any) {
      this.logger.error('AST validation failed', { error: error.message });
      return false;
    }
  }

  /**
   * Recursively validate AST node
   */
  private validateNode(node: ASTNode): void {
    switch (node.type) {
      case 'signal_condition':
        if (!this.availableSignals.includes(node.signalType)) {
          throw new RuleParsingError(`Unknown signal type: ${node.signalType}`);
        }
        if (!['>', '<', '>=', '<=', '==', '!='].includes(node.operator)) {
          throw new RuleParsingError(`Invalid operator: ${node.operator}`);
        }
        if (typeof node.threshold !== 'number' || isNaN(node.threshold)) {
          throw new RuleParsingError(`Invalid threshold: ${node.threshold}`);
        }
        break;

      case 'logical_and':
      case 'logical_or':
        if (!node.left || !node.right) {
          throw new RuleParsingError(`Binary operator ${node.type} requires both operands`);
        }
        this.validateNode(node.left);
        this.validateNode(node.right);
        break;

      case 'logical_not':
        if (!node.left) {
          throw new RuleParsingError('NOT operator requires an operand');
        }
        this.validateNode(node.left);
        break;

      case 'group':
        if (!node.expression) {
          throw new RuleParsingError('Group node requires an expression');
        }
        this.validateNode(node.expression);
        break;

      default:
        throw new RuleParsingError(`Unknown node type: ${(node as any).type}`);
    }
  }

  /**
   * Convert AST back to expression string
   */
  astToExpression(ast: ASTNode): string {
    switch (ast.type) {
      case 'signal_condition':
        let expr = `${ast.signalType} ${ast.operator} ${ast.threshold}`;
        if (ast.window) {
          expr += ` WITHIN ${ast.window}`;
        }
        return expr;

      case 'logical_and':
        return `(${this.astToExpression(ast.left!)} AND ${this.astToExpression(ast.right!)})`;

      case 'logical_or':
        return `(${this.astToExpression(ast.left!)} OR ${this.astToExpression(ast.right!)})`;

      case 'logical_not':
        return `(NOT ${this.astToExpression(ast.left!)})`;

      case 'group':
        return `(${this.astToExpression(ast.expression)})`;

      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Get all signal types referenced in AST
   */
  getReferencedSignalTypes(ast: ASTNode): SignalType[] {
    const types = new Set<SignalType>();

    this.collectSignalTypes(ast, types);

    return Array.from(types);
  }

  /**
   * Recursively collect signal types from AST
   */
  private collectSignalTypes(node: ASTNode, types: Set<SignalType>): void {
    switch (node.type) {
      case 'signal_condition':
        types.add(node.signalType);
        break;

      case 'logical_and':
      case 'logical_or':
        if (node.left) this.collectSignalTypes(node.left, types);
        if (node.right) this.collectSignalTypes(node.right, types);
        break;

      case 'logical_not':
        if (node.left) this.collectSignalTypes(node.left, types);
        break;

      case 'group':
        if (node.expression) this.collectSignalTypes(node.expression, types);
        break;
    }
  }

  /**
   * Calculate AST complexity
   */
  calculateComplexity(ast: ASTNode): number {
    let complexity = 0;

    switch (ast.type) {
      case 'signal_condition':
        complexity = 1;
        break;

      case 'logical_and':
      case 'logical_or':
        complexity = 1 + this.calculateComplexity(ast.left!) + this.calculateComplexity(ast.right!);
        break;

      case 'logical_not':
        complexity = 1 + this.calculateComplexity(ast.left!);
        break;

      case 'group':
        complexity = this.calculateComplexity(ast.expression);
        break;
    }

    return complexity;
  }

  /**
   * Estimate evaluation performance
   */
  estimatePerformance(ast: ASTNode): {
    complexity: 'simple' | 'moderate' | 'complex';
    estimatedLatency: number; // milliseconds
    memoryUsage: number; // KB
  } {
    const complexity = this.calculateComplexity(ast);
    const signalTypes = this.getReferencedSignalTypes(ast);

    let estimatedLatency = 10; // Base latency
    estimatedLatency += complexity * 5; // Complexity factor
    estimatedLatency += signalTypes.length * 2; // Signal type factor

    let memoryUsage = 1; // Base memory
    memoryUsage += complexity * 0.1; // Complexity factor
    memoryUsage += signalTypes.length * 0.5; // Signal type factor

    let complexityLevel: 'simple' | 'moderate' | 'complex';
    if (complexity <= 3) complexityLevel = 'simple';
    else if (complexity <= 8) complexityLevel = 'moderate';
    else complexityLevel = 'complex';

    return {
      complexity: complexityLevel,
      estimatedLatency,
      memoryUsage
    };
  }
}

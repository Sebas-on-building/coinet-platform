/**
 * Strategy Compiler
 * 
 * Converts visual node-based trading strategies into executable TypeScript/JavaScript code.
 * Handles validation, optimization, and code generation for the Visual Strategy Builder.
 */

// Import types from a module declaration to avoid direct dependency on ReactFlow
// This allows us to use type checking without needing ReactFlow at runtime
export interface Node<T = any> {
  id: string;
  position: {
    x: number;
    y: number;
  };
  data: T;
  type?: string;
}

export interface Edge<T = any> {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  data?: T;
}

// Node data interface
export interface NodeData {
  id: string;
  label: string;
  type?: string;
  params?: Record<string, any>;
  inputs?: string[];
  outputs?: string[];
}

// Strategy validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Validate a strategy graph
 * 
 * Checks for common errors like:
 * - Disconnected nodes
 * - Missing required connections
 * - Circular dependencies
 * - Invalid parameter values
 * - Input/output type mismatches
 * 
 * @param nodes The strategy nodes
 * @param edges The connections between nodes
 * @returns Validation result with any errors
 */
export function validateStrategy(nodes: Node[], edges: Edge[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Early return if no nodes
  if (nodes.length === 0) {
    return {
      valid: false,
      errors: ['Strategy has no nodes. Add at least one indicator and one action.']
    };
  }

  // Check for node types
  const indicatorNodes = nodes.filter(node => node.type === 'indicatorNode');
  const conditionNodes = nodes.filter(node => node.type === 'conditionNode');
  const actionNodes = nodes.filter(node => node.type === 'actionNode');
  const outputNodes = nodes.filter(node => node.type === 'outputNode');

  // Check for required node types
  if (indicatorNodes.length === 0) {
    errors.push('Strategy requires at least one indicator node');
  }

  if (actionNodes.length === 0 && outputNodes.length === 0) {
    errors.push('Strategy requires at least one action or output node');
  }

  // Check for disconnected nodes
  const connectedNodeIds = new Set<string>();

  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  const disconnectedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));

  if (disconnectedNodes.length > 0) {
    errors.push(`${disconnectedNodes.length} disconnected node(s) found. All nodes must be connected.`);
  }

  // Check for circular references
  try {
    const sortedNodes = topologicalSort(nodes, edges);
    if (!sortedNodes) {
      errors.push('Circular dependency detected in strategy flow. Signals cannot loop back.');
    }
  } catch (error) {
    errors.push('Error in strategy flow: ' + (error as Error).message);
  }

  // Check for valid connections between different node types
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (sourceNode && targetNode) {
      // Check for invalid connections
      if (targetNode.type === 'indicatorNode' && sourceNode.type !== 'indicatorNode') {
        errors.push(`Invalid connection: ${sourceNode.data.label} cannot connect to indicator ${targetNode.data.label}`);
      }

      // Check if action nodes are receiving inputs
      if (targetNode.type === 'actionNode' &&
        !['conditionNode', 'indicatorNode'].includes(sourceNode.type as string)) {
        warnings.push(`Unusual connection: ${sourceNode.data.label} connecting to action ${targetNode.data.label}`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Topological sort to detect circular dependencies
 */
function topologicalSort(nodes: Node[], edges: Edge[]): Node[] | null {
  // Create adjacency list
  const graph: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};

  // Initialize
  nodes.forEach(node => {
    graph[node.id] = [];
    inDegree[node.id] = 0;
  });

  // Build graph
  edges.forEach(edge => {
    graph[edge.source].push(edge.target);
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  });

  // Find nodes with no incoming edges
  const queue = nodes.filter(node => inDegree[node.id] === 0).map(node => node.id);
  const result: Node[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      result.push(node);

      graph[nodeId].forEach(neighbor => {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) {
          queue.push(neighbor);
        }
      });
    }
  }

  // If not all nodes are visited, there's a cycle
  return result.length === nodes.length ? result : null;
}

// Code generation interface for TypeScript type safety
interface CodeGenerator {
  generateIndicatorCode(indicatorNodes: Node[]): string;
  generateConditionCode(conditionNodes: Node[], allNodes: Node[], edges: Edge[]): string;
  generateActionCode(actionNodes: Node[], allNodes: Node[], edges: Edge[]): string;
}

/**
 * Generate executable code from a strategy
 * 
 * @param nodes The strategy nodes
 * @param edges The connections between nodes
 * @returns Generated TypeScript code
 */
export function generateStrategyCode(nodes: Node[], edges: Edge[]): string {
  // First validate the strategy
  const validation = validateStrategy(nodes, edges);
  if (!validation.valid) {
    throw new Error(`Cannot generate code for invalid strategy: ${validation.errors.join(', ')}`);
  }

  // Sort nodes in execution order
  const sortedNodes = topologicalSort(nodes, edges) || [];

  // Create generator object with proper this context
  const generator: CodeGenerator = {
    generateIndicatorCode,
    generateConditionCode,
    generateActionCode
  };

  // Code generation
  let code = `/**
 * Auto-generated Trading Strategy
 * Created with Coinet Visual Strategy Builder
 * 
 * This strategy combines various technical indicators and conditions
 * to generate trading signals.
 */

import { OHLCV, Signal, Strategy, StrategyContext } from '@/lib/strategy/types';

export class GeneratedStrategy implements Strategy {
  private indicators: Record<string, any> = {};
  private conditions: Record<string, boolean> = {};
  private signals: Signal[] = [];
  
  constructor() {
    // Initialize strategy components
    this.reset();
  }

  reset(): void {
    this.indicators = {};
    this.conditions = {};
    this.signals = [];
  }

  /**
   * Execute the strategy on each candle update
   */
  update(context: StrategyContext): void {
    const { ohlcv, time } = context;
    
    // Clear previous signals
    this.signals = [];
    
    // Calculate indicators
${generator.generateIndicatorCode(sortedNodes.filter(n => n.type === 'indicatorNode'))}
    
    // Evaluate conditions
${generator.generateConditionCode(
    sortedNodes.filter(n => n.type === 'conditionNode'),
    nodes,
    edges
  )}
    
    // Execute actions
${generator.generateActionCode(
    sortedNodes.filter(n => n.type === 'actionNode' || n.type === 'outputNode'),
    nodes,
    edges
  )}
  }
  
  /**
   * Get generated trading signals
   */
  getSignals(): Signal[] {
    return this.signals;
  }
}`;

  return code;
}

/**
 * Generate code for indicator nodes
 */
function generateIndicatorCode(this: CodeGenerator | void, indicatorNodes: Node[]): string {
  if (indicatorNodes.length === 0) return '    // No indicators defined';

  return indicatorNodes.map(node => {
    const { id, label, params = {} } = node.data;
    const nodeType = node.data.id;

    switch (nodeType) {
      case 'sma':
        return `    this.indicators['${id}'] = calculateSMA(ohlcv.close, ${params.period || 20});`;

      case 'ema':
        return `    this.indicators['${id}'] = calculateEMA(ohlcv.close, ${params.period || 20});`;

      case 'rsi':
        return `    this.indicators['${id}'] = calculateRSI(ohlcv.close, ${params.period || 14});`;

      case 'macd':
        return `    const macd${id} = calculateMACD(ohlcv.close, {
      fast: ${params.fast || 12},
      slow: ${params.slow || 26},
      signal: ${params.signal || 9}
    });
    this.indicators['${id}'] = macd${id}.macd;
    this.indicators['${id}_signal'] = macd${id}.signal;
    this.indicators['${id}_histogram'] = macd${id}.histogram;`;

      default:
        return `    // Unknown indicator type: ${nodeType}
    this.indicators['${id}'] = null;`;
    }
  }).join('\n');
}

/**
 * Generate code for condition nodes
 */
function generateConditionCode(this: CodeGenerator | void, conditionNodes: Node[], allNodes: Node[], edges: Edge[]): string {
  if (conditionNodes.length === 0) return '    // No conditions defined';

  return conditionNodes.map(node => {
    const { id, label, params = {} } = node.data;
    const conditionType = node.data.id;

    // Find inputs to this condition
    const inputEdges = edges.filter(edge => edge.target === node.id);
    const inputs = inputEdges.map(edge => {
      const sourceNode = allNodes.find(n => n.id === edge.source);
      return sourceNode ? { id: sourceNode.id, data: sourceNode.data } : null;
    }).filter(Boolean) as Array<{ id: string, data: any }>;

    if (inputs.length < 1) {
      return `    // Condition ${label} has no inputs
    this.conditions['${id}'] = false;`;
    }

    const input1 = `this.indicators['${inputs[0]?.id}']`;
    const input2 = inputs[1] ? `this.indicators['${inputs[1].id}']` : null;

    switch (conditionType) {
      case 'crossOver':
        if (!input2) {
          return `    // Condition ${label} requires two inputs
    this.conditions['${id}'] = false;`;
        }
        return `    this.conditions['${id}'] = crossOver(${input1}, ${input2});`;

      case 'crossUnder':
        if (!input2) {
          return `    // Condition ${label} requires two inputs
    this.conditions['${id}'] = false;`;
        }
        return `    this.conditions['${id}'] = crossUnder(${input1}, ${input2});`;

      case 'greaterThan':
        const compareValue1 = input2 ? input2 : params.value || 0;
        return `    this.conditions['${id}'] = ${input1} > ${compareValue1};`;

      case 'lessThan':
        const compareValue2 = input2 ? input2 : params.value || 0;
        return `    this.conditions['${id}'] = ${input1} < ${compareValue2};`;

      default:
        return `    // Unknown condition type: ${conditionType}
    this.conditions['${id}'] = false;`;
    }
  }).join('\n');
}

/**
 * Generate code for action nodes
 */
function generateActionCode(this: CodeGenerator | void, actionNodes: Node[], allNodes: Node[], edges: Edge[]): string {
  if (actionNodes.length === 0) return '    // No actions defined';

  return actionNodes.map(node => {
    const { id, label, params = {} } = node.data;
    const actionType = node.data.id;

    // Find condition that triggers this action
    const inputEdges = edges.filter(edge => edge.target === node.id);
    const conditionInputs = inputEdges
      .map(edge => {
        const sourceNode = allNodes.find(n => n.id === edge.source);
        return sourceNode?.type === 'conditionNode' ? sourceNode : null;
      })
      .filter(Boolean) as Node[];

    // Generate condition check
    let conditionCheck: string;
    if (conditionInputs.length === 0) {
      conditionCheck = 'true';  // Always execute if no condition
    } else if (conditionInputs.length === 1) {
      conditionCheck = `this.conditions['${conditionInputs[0]?.id}']`;
    } else {
      // If multiple conditions, require all to be true (AND)
      conditionCheck = conditionInputs
        .map(condition => `this.conditions['${condition?.id}']`)
        .join(' && ');
    }

    let actionCode: string;
    switch (actionType) {
      case 'buyMarket':
        actionCode = `this.signals.push({
        type: 'buy',
        price: ohlcv.close[ohlcv.close.length - 1],
        time,
        size: ${params.size || 100},
        reason: '${label}'
      });`;
        break;

      case 'sellMarket':
        actionCode = `this.signals.push({
        type: 'sell',
        price: ohlcv.close[ohlcv.close.length - 1],
        time,
        size: ${params.size || 100},
        reason: '${label}'
      });`;
        break;

      case 'setStopLoss':
        actionCode = `this.signals.push({
        type: 'stopLoss',
        price: ohlcv.close[ohlcv.close.length - 1] * (1 - ${params.percent || 5} / 100),
        time,
        reason: '${label}'
      });`;
        break;

      case 'setTakeProfit':
        actionCode = `this.signals.push({
        type: 'takeProfit',
        price: ohlcv.close[ohlcv.close.length - 1] * (1 + ${params.percent || 10} / 100),
        time,
        reason: '${label}'
      });`;
        break;

      case 'signalOutput':
        actionCode = `context.onSignal({
        type: 'info',
        price: ohlcv.close[ohlcv.close.length - 1],
        time,
        reason: '${label}'
      });`;
        break;

      case 'alertOutput':
        actionCode = `context.onAlert({
        message: '${params.message || 'Strategy alert triggered'}',
        level: 'info',
        time
      });`;
        break;

      default:
        actionCode = `// Unknown action type: ${actionType}`;
    }

    return `    if (${conditionCheck}) {
      // Execute ${label}
      ${actionCode}
    }`;
  }).join('\n\n');
}

/**
 * Get pretty-printed strategy representation
 */
export function getStrategyDescription(nodes: Node[], edges: Edge[]): string {
  // Get nodes by type
  const indicators = nodes.filter(n => n.type === 'indicatorNode');
  const conditions = nodes.filter(n => n.type === 'conditionNode');
  const actions = nodes.filter(n => n.type === 'actionNode');
  const outputs = nodes.filter(n => n.type === 'outputNode');

  // Build description
  let description = '# Strategy Summary\n\n';

  // Indicators
  description += '## Indicators\n';
  if (indicators.length === 0) {
    description += '- No indicators defined\n';
  } else {
    indicators.forEach(indicator => {
      description += `- ${indicator.data.label}\n`;
    });
  }

  // Conditions
  description += '\n## Conditions\n';
  if (conditions.length === 0) {
    description += '- No conditions defined\n';
  } else {
    conditions.forEach(condition => {
      description += `- ${condition.data.label}\n`;
    });
  }

  // Actions
  description += '\n## Actions\n';
  if (actions.length === 0) {
    description += '- No actions defined\n';
  } else {
    actions.forEach(action => {
      description += `- ${action.data.label}\n`;
    });
  }

  // Outputs
  if (outputs.length > 0) {
    description += '\n## Outputs\n';
    outputs.forEach(output => {
      description += `- ${output.data.label}\n`;
    });
  }

  return description;
} 
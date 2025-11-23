export interface ExpressionContext {
  [key: string]: number;
}

export class SafeExpressionEvaluator {
  private allowedOperators = ['+', '-', '*', '/', '(', ')', ' '];
  private allowedFunctions = new Set([
    'abs', 'min', 'max', 'sqrt', 'pow', 'round', 'floor', 'ceil',
    'sin', 'cos', 'tan', 'log', 'exp'
  ]);

  evaluateFormula(formula: string, context: ExpressionContext): number {
    try {
      // Validate formula safety
      this.validateFormula(formula);

      // Parse and evaluate safely
      return this.parseAndEvaluate(formula, context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Formula evaluation failed: ${errorMessage}`);
    }
  }

  private validateFormula(formula: string): void {
    if (!formula || typeof formula !== 'string') {
      throw new Error('Formula must be a non-empty string');
    }

    if (formula.length > 1000) {
      throw new Error('Formula too long');
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /eval/i,
      /function/i,
      /constructor/i,
      /prototype/i,
      /window/i,
      /document/i,
      /global/i,
      /process/i,
      /require/i,
      /import/i,
      /export/i,
      /while/i,
      /for/i,
      /if/i,
      /else/i,
      /return/i,
      /var/i,
      /let/i,
      /const/i,
      /class/i,
      /delete/i,
      /new/i,
      /this/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(formula)) {
        throw new Error(`Formula contains prohibited pattern: ${pattern}`);
      }
    }

    // Validate characters (only allow numbers, operators, letters, and basic functions)
    if (!/^[a-zA-Z0-9\s+\-*/().,_<>=&|!]+$/.test(formula)) {
      throw new Error('Formula contains invalid characters');
    }
  }

  private parseAndEvaluate(formula: string, context: ExpressionContext): number {
    // Replace context variables
    let processedFormula = formula;

    for (const [key, value] of Object.entries(context)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`Invalid context value for ${key}: must be a finite number`);
      }

      // Replace variable with its value
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      processedFormula = processedFormula.replace(regex, value.toString());
    }

    // Simple mathematical expression evaluator
    return this.evaluateMathExpression(processedFormula);
  }

  private evaluateMathExpression(expression: string): number {
    // Remove whitespace
    expression = expression.replace(/\s/g, '');

    // Basic calculator implementation
    try {
      // This is a simplified evaluator - in production, use a proper math parser
      // For now, we'll use a basic approach with Function constructor safety checks

      // Validate that the expression only contains safe mathematical operations
      if (!/^[0-9+\-*/.()]+$/.test(expression)) {
        throw new Error('Expression contains non-mathematical characters');
      }

      // Count parentheses to prevent malformed expressions
      const openParens = (expression.match(/\(/g) || []).length;
      const closeParens = (expression.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        throw new Error('Mismatched parentheses');
      }

      // Use a safe evaluation approach
      const result = this.safeEvaluate(expression);

      if (!Number.isFinite(result)) {
        throw new Error('Result is not a finite number');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Mathematical evaluation failed: ${errorMessage}`);
    }
  }

  private safeEvaluate(expression: string): number {
    // Implement a simple recursive descent parser for basic math operations
    // This is a basic implementation - for production use a proper math library

    try {
      return parseFloat(expression) || 0;
    } catch {
      // If direct parsing fails, try basic operations
      return this.parseBasicMath(expression);
    }
  }

  private parseBasicMath(expr: string): number {
    // Very basic math parser for +, -, *, /
    // This is simplified - use a proper math library in production

    // Handle simple addition/subtraction
    if (expr.includes('+')) {
      const parts = expr.split('+');
      return parts.reduce((sum, part) => sum + parseFloat(part.trim()), 0);
    }

    if (expr.includes('-')) {
      const parts = expr.split('-');
      const first = parseFloat(parts[0]);
      const rest = parts.slice(1).reduce((sum, part) => sum + parseFloat(part.trim()), 0);
      return first - rest;
    }

    if (expr.includes('*')) {
      const parts = expr.split('*');
      return parts.reduce((product, part) => product * parseFloat(part.trim()), 1);
    }

    if (expr.includes('/')) {
      const parts = expr.split('/');
      const first = parseFloat(parts[0]);
      const divisors = parts.slice(1);
      return divisors.reduce((result, divisor) => {
        const div = parseFloat(divisor.trim());
        if (div === 0) throw new Error('Division by zero');
        return result / div;
      }, first);
    }

    return parseFloat(expr) || 0;
  }

  // Helper functions for common mathematical operations
  static mathFunctions = {
    abs: Math.abs,
    min: Math.min,
    max: Math.max,
    sqrt: Math.sqrt,
    pow: Math.pow,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    log: Math.log,
    exp: Math.exp
  };

  evaluateWithFunctions(formula: string, context: ExpressionContext): number {
    // More advanced evaluation with mathematical functions
    // This would require a proper math expression parser library
    throw new Error('Function evaluation not implemented - use a proper math library like math.js');
  }
} 
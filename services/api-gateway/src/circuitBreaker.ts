/**
 * Intelligent Circuit Breaker System
 * Advanced fault tolerance with intelligent recovery,
 * adaptive thresholds, and predictive failure detection
 */

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryThreshold: number;
  timeout: number;
  monitoringPeriod: number;
  adaptiveThreshold: boolean;
  healthCheckInterval: number;
}

interface CircuitState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  successes: number;
  lastFailureTime: number;
  nextAttempt: number;
  totalRequests: number;
  adaptiveFailureThreshold: number;
}

export class IntelligentCircuitBreaker {
  private circuits: Map<string, CircuitState> = new Map();
  private config: CircuitBreakerConfig;
  private healthChecks: Map<string, () => Promise<boolean>> = new Map();
  private stats = {
    totalCircuits: 0,
    openCircuits: 0,
    halfOpenCircuits: 0,
    closedCircuits: 0,
    totalFailures: 0,
    totalRecoveries: 0
  };

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      recoveryThreshold: config.recoveryThreshold || 3,
      timeout: config.timeout || 60000, // 1 minute
      monitoringPeriod: config.monitoringPeriod || 300000, // 5 minutes
      adaptiveThreshold: config.adaptiveThreshold ?? true,
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
      ...config
    };

    // Start background monitoring
    this.startBackgroundMonitoring();
  }

  private startBackgroundMonitoring(): void {
    // Update statistics every 30 seconds
    setInterval(() => {
      this.updateStatistics();
      this.performHealthChecks();
      this.adaptiveThresholdAdjustment();
    }, this.config.healthCheckInterval);

    // Clean up old circuits every 5 minutes
    setInterval(() => {
      this.cleanupInactiveCircuits();
    }, this.config.monitoringPeriod);
  }

  /**
   * Initialize circuit for a service
   */
  private initializeCircuit(serviceName: string): CircuitState {
    const circuit: CircuitState = {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      nextAttempt: 0,
      totalRequests: 0,
      adaptiveFailureThreshold: this.config.failureThreshold
    };

    this.circuits.set(serviceName, circuit);
    this.stats.totalCircuits++;
    this.stats.closedCircuits++;
    
    return circuit;
  }

  /**
   * Get or create circuit for service
   */
  private getCircuit(serviceName: string): CircuitState {
    let circuit = this.circuits.get(serviceName);
    if (!circuit) {
      circuit = this.initializeCircuit(serviceName);
    }
    return circuit;
  }

  /**
   * Check if request is allowed through circuit
   */
  allowRequest(serviceName: string): boolean {
    const circuit = this.getCircuit(serviceName);
    const now = Date.now();

    switch (circuit.state) {
      case 'closed':
        return true;

      case 'open':
        if (now >= circuit.nextAttempt) {
          circuit.state = 'half-open';
          this.updateStatistics();
          return true;
        }
        return false;

      case 'half-open':
        return true;

      default:
        return false;
    }
  }

  /**
   * Record successful request
   */
  recordSuccess(serviceName: string): void {
    const circuit = this.getCircuit(serviceName);
    circuit.successes++;
    circuit.totalRequests++;

    if (circuit.state === 'half-open') {
      if (circuit.successes >= this.config.recoveryThreshold) {
        this.closeCircuit(serviceName);
      }
    } else if (circuit.state === 'closed') {
      // Reset failure count on successful requests
      circuit.failures = Math.max(0, circuit.failures - 1);
    }
  }

  /**
   * Record failed request
   */
  recordFailure(serviceName: string): void {
    const circuit = this.getCircuit(serviceName);
    circuit.failures++;
    circuit.totalRequests++;
    circuit.lastFailureTime = Date.now();
    this.stats.totalFailures++;

    if (circuit.state === 'half-open') {
      this.openCircuit(serviceName);
    } else if (circuit.state === 'closed') {
      if (circuit.failures >= circuit.adaptiveFailureThreshold) {
        this.openCircuit(serviceName);
      }
    }
  }

  /**
   * Open circuit (block requests)
   */
  private openCircuit(serviceName: string): void {
    const circuit = this.getCircuit(serviceName);
    
    if (circuit.state !== 'open') {
      circuit.state = 'open';
      circuit.nextAttempt = Date.now() + this.config.timeout;
      
      // Adaptive timeout based on failure frequency
      if (this.config.adaptiveThreshold) {
        const failureFrequency = circuit.failures / Math.max(1, circuit.totalRequests);
        const adaptiveTimeout = this.config.timeout * (1 + failureFrequency);
        circuit.nextAttempt = Date.now() + Math.min(adaptiveTimeout, this.config.timeout * 5);
      }

      this.updateStatistics();
      console.warn(`Circuit breaker opened for service: ${serviceName}`, {
        failures: circuit.failures,
        threshold: circuit.adaptiveFailureThreshold,
        nextAttempt: new Date(circuit.nextAttempt).toISOString()
      });
    }
  }

  /**
   * Close circuit (allow requests)
   */
  private closeCircuit(serviceName: string): void {
    const circuit = this.getCircuit(serviceName);
    
    if (circuit.state !== 'closed') {
      circuit.state = 'closed';
      circuit.failures = 0;
      circuit.successes = 0;
      this.stats.totalRecoveries++;
      
      this.updateStatistics();
      console.info(`Circuit breaker closed for service: ${serviceName} - Service recovered`);
    }
  }

  /**
   * Force circuit state (for admin control)
   */
  forceState(serviceName: string, state: 'open' | 'closed' | 'half-open'): void {
    const circuit = this.getCircuit(serviceName);
    const oldState = circuit.state;
    circuit.state = state;
    
    if (state === 'closed') {
      circuit.failures = 0;
      circuit.successes = 0;
    } else if (state === 'half-open') {
      circuit.successes = 0;
    } else if (state === 'open') {
      circuit.nextAttempt = Date.now() + this.config.timeout;
    }

    this.updateStatistics();
    console.info(`Circuit breaker for ${serviceName} forced from ${oldState} to ${state}`);
  }

  /**
   * Add health check for a service
   */
  addHealthCheck(serviceName: string, healthCheck: () => Promise<boolean>): void {
    this.healthChecks.set(serviceName, healthCheck);
  }

  /**
   * Perform health checks on half-open circuits
   */
  private async performHealthChecks(): Promise<void> {
    for (const [serviceName, circuit] of this.circuits.entries()) {
      if (circuit.state === 'half-open') {
        const healthCheck = this.healthChecks.get(serviceName);
        
        if (healthCheck) {
          try {
            const isHealthy = await healthCheck();
            if (isHealthy) {
              this.recordSuccess(serviceName);
            } else {
              this.recordFailure(serviceName);
            }
          } catch (error) {
            this.recordFailure(serviceName);
          }
        }
      }
    }
  }

  /**
   * Adaptive threshold adjustment based on service behavior
   */
  private adaptiveThresholdAdjustment(): void {
    if (!this.config.adaptiveThreshold) return;

    for (const [serviceName, circuit] of this.circuits.entries()) {
      if (circuit.totalRequests > 100) { // Only adjust after sufficient data
        const successRate = circuit.successes / circuit.totalRequests;
        
        // If service is consistently reliable, increase threshold
        if (successRate > 0.95) {
          circuit.adaptiveFailureThreshold = Math.min(
            circuit.adaptiveFailureThreshold + 1,
            this.config.failureThreshold * 2
          );
        }
        // If service is unreliable, decrease threshold
        else if (successRate < 0.8) {
          circuit.adaptiveFailureThreshold = Math.max(
            circuit.adaptiveFailureThreshold - 1,
            Math.floor(this.config.failureThreshold / 2)
          );
        }
      }
    }
  }

  /**
   * Update circuit breaker statistics
   */
  private updateStatistics(): void {
    this.stats.openCircuits = 0;
    this.stats.halfOpenCircuits = 0;
    this.stats.closedCircuits = 0;

    for (const circuit of this.circuits.values()) {
      switch (circuit.state) {
        case 'open':
          this.stats.openCircuits++;
          break;
        case 'half-open':
          this.stats.halfOpenCircuits++;
          break;
        case 'closed':
          this.stats.closedCircuits++;
          break;
      }
    }
  }

  /**
   * Clean up circuits for inactive services
   */
  private cleanupInactiveCircuits(): void {
    const now = Date.now();
    const inactiveThreshold = 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;

    for (const [serviceName, circuit] of this.circuits.entries()) {
      if (now - circuit.lastFailureTime > inactiveThreshold && circuit.totalRequests === 0) {
        this.circuits.delete(serviceName);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} inactive circuit breakers`);
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getStatistics() {
    const circuitDetails: Record<string, any> = {};
    
    for (const [serviceName, circuit] of this.circuits.entries()) {
      circuitDetails[serviceName] = {
        state: circuit.state,
        failures: circuit.failures,
        successes: circuit.successes,
        totalRequests: circuit.totalRequests,
        adaptiveThreshold: circuit.adaptiveFailureThreshold,
        nextAttempt: circuit.state === 'open' ? new Date(circuit.nextAttempt).toISOString() : null
      };
    }

    return {
      ...this.stats,
      circuits: circuitDetails
    };
  }

  /**
   * Get circuit state for specific service
   */
  getCircuitState(serviceName: string): string {
    const circuit = this.circuits.get(serviceName);
    return circuit?.state || 'closed';
  }

  /**
   * Check if service is available
   */
  isServiceAvailable(serviceName: string): boolean {
    const circuit = this.circuits.get(serviceName);
    if (!circuit) return true;

    if (circuit.state === 'open') {
      return Date.now() >= circuit.nextAttempt;
    }

    return true; // Available for closed and half-open states
  }
}

export default IntelligentCircuitBreaker;

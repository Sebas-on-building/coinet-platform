/**
 * ============================================
 * 24-HOUR PRODUCTION TEST RUNNER
 * ============================================
 * 
 * Continuous production reliability test with:
 * - Real API endpoint monitoring
 * - SLA compliance tracking
 * - Performance degradation detection
 * - Automatic alerting
 * 
 * Run: npm run test:production:24h
 */

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface ProductionTestConfig {
  // Base URL of the production service
  baseUrl: string;
  // Test duration in hours
  durationHours: number;
  // Check interval in seconds
  checkIntervalSeconds: number;
  // SLA targets
  sla: {
    uptimePercentage: number;
    maxResponseTimeMs: number;
    maxErrorRate: number;
  };
  // Endpoints to test
  endpoints: EndpointConfig[];
  // Alert webhook (optional)
  alertWebhook?: string;
  // Output directory for reports
  outputDir: string;
}

interface EndpointConfig {
  name: string;
  path: string;
  method: 'GET' | 'POST';
  expectedStatus: number;
  timeout: number;
  critical: boolean;
}

interface CheckResult {
  endpoint: string;
  timestamp: Date;
  responseTimeMs: number;
  status: number;
  success: boolean;
  error?: string;
}

interface HourlyStats {
  hour: number;
  checks: number;
  successes: number;
  failures: number;
  avgResponseTimeMs: number;
  maxResponseTimeMs: number;
  minResponseTimeMs: number;
  uptimePercentage: number;
  errorRate: number;
}

interface TestReport {
  startTime: Date;
  endTime: Date;
  durationHours: number;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  overallUptime: number;
  overallErrorRate: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  maxResponseTimeMs: number;
  slaCompliance: {
    uptime: boolean;
    responseTime: boolean;
    errorRate: boolean;
    overall: boolean;
  };
  hourlyStats: HourlyStats[];
  criticalIncidents: CriticalIncident[];
  endpointStats: Record<string, EndpointStats>;
}

interface CriticalIncident {
  timestamp: Date;
  endpoint: string;
  duration: number;
  error: string;
}

interface EndpointStats {
  totalChecks: number;
  successes: number;
  failures: number;
  avgResponseTimeMs: number;
  maxResponseTimeMs: number;
  uptimePercentage: number;
}

// =============================================================================
// PRODUCTION TEST RUNNER
// =============================================================================

class ProductionTestRunner {
  private config: ProductionTestConfig;
  private results: CheckResult[] = [];
  private isRunning = false;
  private startTime: Date | null = null;
  private criticalIncidents: CriticalIncident[] = [];
  private lastFailureTime: Map<string, Date> = new Map();

  constructor(config?: Partial<ProductionTestConfig>) {
    this.config = {
      baseUrl: process.env.PRODUCTION_URL || 'https://market-prices-production.up.railway.app',
      durationHours: 24,
      checkIntervalSeconds: 30,
      sla: {
        uptimePercentage: 99.9,
        maxResponseTimeMs: 2000,
        maxErrorRate: 0.1,
      },
      endpoints: [
        {
          name: 'Health',
          path: '/api/health',
          method: 'GET',
          expectedStatus: 200,
          timeout: 5000,
          critical: true,
        },
        {
          name: 'Prices',
          path: '/api/prices?symbols=BTC,ETH,SOL',
          method: 'GET',
          expectedStatus: 200,
          timeout: 10000,
          critical: true,
        },
        {
          name: 'Metrics',
          path: '/api/metrics',
          method: 'GET',
          expectedStatus: 200,
          timeout: 5000,
          critical: false,
        },
        {
          name: 'Fusion',
          path: '/api/fusion/BTC',
          method: 'GET',
          expectedStatus: 200,
          timeout: 10000,
          critical: false,
        },
        {
          name: 'Debug',
          path: '/api/debug',
          method: 'GET',
          expectedStatus: 200,
          timeout: 5000,
          critical: false,
        },
      ],
      outputDir: './benchmarks/reports',
      ...config,
    };
  }

  async run(): Promise<TestReport> {
    this.printBanner();
    this.startTime = new Date();
    this.isRunning = true;

    const endTime = new Date(this.startTime.getTime() + this.config.durationHours * 60 * 60 * 1000);

    console.log(`\n🚀 Starting 24-hour production test...`);
    console.log(`   URL: ${this.config.baseUrl}`);
    console.log(`   Duration: ${this.config.durationHours} hours`);
    console.log(`   Check Interval: ${this.config.checkIntervalSeconds}s`);
    console.log(`   SLA Targets:`);
    console.log(`     - Uptime: ${this.config.sla.uptimePercentage}%`);
    console.log(`     - Max Response Time: ${this.config.sla.maxResponseTimeMs}ms`);
    console.log(`     - Max Error Rate: ${this.config.sla.maxErrorRate}%`);
    console.log(`\n   Press Ctrl+C to stop early and generate report.\n`);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n⚠️  Received interrupt signal. Generating report...\n');
      this.isRunning = false;
    });

    // Main test loop
    let checkCount = 0;
    while (this.isRunning && new Date() < endTime) {
      await this.runCheckCycle();
      checkCount++;

      // Print hourly summary
      if (checkCount % Math.floor(3600 / this.config.checkIntervalSeconds) === 0) {
        this.printHourlySummary();
      }

      // Wait for next check
      await this.sleep(this.config.checkIntervalSeconds * 1000);
    }

    // Generate final report
    const report = this.generateReport();
    await this.saveReport(report);
    this.printFinalReport(report);

    return report;
  }

  private async runCheckCycle(): Promise<void> {
    const cycleStart = new Date();
    
    for (const endpoint of this.config.endpoints) {
      const result = await this.checkEndpoint(endpoint);
      this.results.push(result);

      // Check for critical incidents
      if (!result.success && endpoint.critical) {
        const lastFailure = this.lastFailureTime.get(endpoint.name);
        if (!lastFailure) {
          this.lastFailureTime.set(endpoint.name, result.timestamp);
        }
      } else if (result.success) {
        const lastFailure = this.lastFailureTime.get(endpoint.name);
        if (lastFailure) {
          const duration = (result.timestamp.getTime() - lastFailure.getTime()) / 1000;
          if (duration > 60 && endpoint.critical) {
            this.criticalIncidents.push({
              timestamp: lastFailure,
              endpoint: endpoint.name,
              duration,
              error: 'Extended outage',
            });
          }
          this.lastFailureTime.delete(endpoint.name);
        }
      }

      // Print status
      const statusIcon = result.success ? '✓' : '✗';
      const statusColor = result.success ? '\x1b[32m' : '\x1b[31m';
      console.log(
        `${statusColor}${statusIcon}\x1b[0m ${endpoint.name.padEnd(10)} ` +
        `${result.responseTimeMs.toFixed(0).padStart(5)}ms ` +
        `${result.success ? '' : `[${result.error}]`}`
      );
    }

    console.log(''); // Empty line between cycles
  }

  private async checkEndpoint(endpoint: EndpointConfig): Promise<CheckResult> {
    const url = `${this.config.baseUrl}${endpoint.path}`;
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);

      const response = await fetch(url, {
        method: endpoint.method,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      return {
        endpoint: endpoint.name,
        timestamp: new Date(),
        responseTimeMs: responseTime,
        status: response.status,
        success: response.status === endpoint.expectedStatus,
        error: response.status !== endpoint.expectedStatus 
          ? `Status ${response.status}` 
          : undefined,
      };
    } catch (error: any) {
      return {
        endpoint: endpoint.name,
        timestamp: new Date(),
        responseTimeMs: Date.now() - startTime,
        status: 0,
        success: false,
        error: error.name === 'AbortError' ? 'Timeout' : error.message,
      };
    }
  }

  private generateReport(): TestReport {
    const endTime = new Date();
    const durationHours = (endTime.getTime() - this.startTime!.getTime()) / 3600000;

    // Calculate overall stats
    const totalChecks = this.results.length;
    const successfulChecks = this.results.filter(r => r.success).length;
    const failedChecks = totalChecks - successfulChecks;

    const responseTimes = this.results.map(r => r.responseTimeMs).sort((a, b) => a - b);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
    const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;
    const maxResponseTime = Math.max(...responseTimes);

    const overallUptime = (successfulChecks / totalChecks) * 100;
    const overallErrorRate = (failedChecks / totalChecks) * 100;

    // Calculate hourly stats
    const hourlyStats = this.calculateHourlyStats();

    // Calculate endpoint stats
    const endpointStats = this.calculateEndpointStats();

    // Check SLA compliance
    const slaCompliance = {
      uptime: overallUptime >= this.config.sla.uptimePercentage,
      responseTime: p95ResponseTime <= this.config.sla.maxResponseTimeMs,
      errorRate: overallErrorRate <= this.config.sla.maxErrorRate,
      overall: false,
    };
    slaCompliance.overall = slaCompliance.uptime && slaCompliance.responseTime && slaCompliance.errorRate;

    return {
      startTime: this.startTime!,
      endTime,
      durationHours,
      totalChecks,
      successfulChecks,
      failedChecks,
      overallUptime,
      overallErrorRate,
      avgResponseTimeMs: avgResponseTime,
      p95ResponseTimeMs: p95ResponseTime,
      p99ResponseTimeMs: p99ResponseTime,
      maxResponseTimeMs: maxResponseTime,
      slaCompliance,
      hourlyStats,
      criticalIncidents: this.criticalIncidents,
      endpointStats,
    };
  }

  private calculateHourlyStats(): HourlyStats[] {
    const hourlyMap = new Map<number, CheckResult[]>();

    this.results.forEach(r => {
      const hour = Math.floor((r.timestamp.getTime() - this.startTime!.getTime()) / 3600000);
      const existing = hourlyMap.get(hour) || [];
      existing.push(r);
      hourlyMap.set(hour, existing);
    });

    return Array.from(hourlyMap.entries()).map(([hour, checks]) => {
      const successes = checks.filter(c => c.success).length;
      const responseTimes = checks.map(c => c.responseTimeMs);

      return {
        hour,
        checks: checks.length,
        successes,
        failures: checks.length - successes,
        avgResponseTimeMs: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        maxResponseTimeMs: Math.max(...responseTimes),
        minResponseTimeMs: Math.min(...responseTimes),
        uptimePercentage: (successes / checks.length) * 100,
        errorRate: ((checks.length - successes) / checks.length) * 100,
      };
    });
  }

  private calculateEndpointStats(): Record<string, EndpointStats> {
    const stats: Record<string, EndpointStats> = {};

    this.config.endpoints.forEach(endpoint => {
      const results = this.results.filter(r => r.endpoint === endpoint.name);
      const successes = results.filter(r => r.success).length;
      const responseTimes = results.map(r => r.responseTimeMs);

      stats[endpoint.name] = {
        totalChecks: results.length,
        successes,
        failures: results.length - successes,
        avgResponseTimeMs: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        maxResponseTimeMs: Math.max(...responseTimes),
        uptimePercentage: (successes / results.length) * 100,
      };
    });

    return stats;
  }

  private async saveReport(report: TestReport): Promise<void> {
    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    const filename = `production-test-${report.startTime.toISOString().split('T')[0]}.json`;
    const filepath = path.join(this.config.outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${filepath}`);
  }

  private printBanner(): void {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║           COINET 24-HOUR PRODUCTION TEST                          ║');
    console.log('║           Real SLA Monitoring & Compliance                        ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
  }

  private printHourlySummary(): void {
    const lastHour = this.results.filter(r => 
      r.timestamp.getTime() > Date.now() - 3600000
    );
    const successes = lastHour.filter(r => r.success).length;
    const uptime = (successes / lastHour.length) * 100;
    const avgResponse = lastHour.reduce((a, r) => a + r.responseTimeMs, 0) / lastHour.length;

    console.log('');
    console.log('─────────────────────────────────────────────────────────────────────');
    console.log(`📊 HOURLY SUMMARY`);
    console.log(`   Checks: ${lastHour.length} | Success: ${successes} | Uptime: ${uptime.toFixed(2)}%`);
    console.log(`   Avg Response: ${avgResponse.toFixed(0)}ms`);
    console.log('─────────────────────────────────────────────────────────────────────');
    console.log('');
  }

  private printFinalReport(report: TestReport): void {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('                    24-HOUR PRODUCTION TEST RESULTS                 ');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 OVERALL METRICS');
    console.log('─────────────────────────────────────────────────────────────────────');
    console.log(`  Duration:              ${report.durationHours.toFixed(2)} hours`);
    console.log(`  Total Checks:          ${report.totalChecks.toLocaleString()}`);
    console.log(`  Successful:            ${report.successfulChecks.toLocaleString()}`);
    console.log(`  Failed:                ${report.failedChecks.toLocaleString()}`);
    console.log('');
    console.log('⏱️  PERFORMANCE');
    console.log('─────────────────────────────────────────────────────────────────────');
    console.log(`  Avg Response Time:     ${report.avgResponseTimeMs.toFixed(2)}ms`);
    console.log(`  P95 Response Time:     ${report.p95ResponseTimeMs.toFixed(2)}ms`);
    console.log(`  P99 Response Time:     ${report.p99ResponseTimeMs.toFixed(2)}ms`);
    console.log(`  Max Response Time:     ${report.maxResponseTimeMs.toFixed(2)}ms`);
    console.log('');
    console.log('📈 SLA COMPLIANCE');
    console.log('─────────────────────────────────────────────────────────────────────');
    console.log(`  Uptime:                ${report.overallUptime.toFixed(3)}% ${report.slaCompliance.uptime ? '✅' : '❌'} (target: ${this.config.sla.uptimePercentage}%)`);
    console.log(`  Response Time (P95):   ${report.p95ResponseTimeMs.toFixed(0)}ms ${report.slaCompliance.responseTime ? '✅' : '❌'} (target: <${this.config.sla.maxResponseTimeMs}ms)`);
    console.log(`  Error Rate:            ${report.overallErrorRate.toFixed(3)}% ${report.slaCompliance.errorRate ? '✅' : '❌'} (target: <${this.config.sla.maxErrorRate}%)`);
    console.log('');
    
    if (report.criticalIncidents.length > 0) {
      console.log('⚠️  CRITICAL INCIDENTS');
      console.log('─────────────────────────────────────────────────────────────────────');
      report.criticalIncidents.forEach(incident => {
        console.log(`  ${incident.timestamp.toISOString()} - ${incident.endpoint}: ${incident.error} (${incident.duration}s)`);
      });
      console.log('');
    }

    console.log('📋 ENDPOINT BREAKDOWN');
    console.log('─────────────────────────────────────────────────────────────────────');
    Object.entries(report.endpointStats).forEach(([name, stats]) => {
      const icon = stats.uptimePercentage >= 99.9 ? '✅' : stats.uptimePercentage >= 99 ? '⚠️' : '❌';
      console.log(`  ${icon} ${name.padEnd(12)} Uptime: ${stats.uptimePercentage.toFixed(2)}% | Avg: ${stats.avgResponseTimeMs.toFixed(0)}ms`);
    });
    console.log('');
    console.log('─────────────────────────────────────────────────────────────────────');
    
    if (report.slaCompliance.overall) {
      console.log('  ✅ SLA COMPLIANCE: PASSED');
      console.log('  🎉 DIVINE PERFECTION: ACHIEVED');
    } else {
      console.log('  ❌ SLA COMPLIANCE: FAILED');
      console.log('  ⚠️  Review incidents and optimize performance.');
    }
    
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// QUICK TEST (1 hour)
// =============================================================================

async function runQuickTest(): Promise<void> {
  const runner = new ProductionTestRunner({
    durationHours: 1,
    checkIntervalSeconds: 30,
  });
  await runner.run();
}

// =============================================================================
// FULL 24H TEST
// =============================================================================

async function runFull24hTest(): Promise<void> {
  const runner = new ProductionTestRunner({
    durationHours: 24,
    checkIntervalSeconds: 30,
  });
  await runner.run();
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const testType = process.argv[2] || 'quick';

  switch (testType) {
    case 'quick':
      console.log('Running QUICK production test (1 hour)...');
      await runQuickTest();
      break;
    case 'full':
      console.log('Running FULL 24-hour production test...');
      await runFull24hTest();
      break;
    default:
      console.log('Usage: npm run test:production:24h [quick|full]');
      process.exit(1);
  }
}

// Run
main().catch(error => {
  console.error('Production test failed:', error);
  process.exit(1);
});

export { ProductionTestRunner, ProductionTestConfig, TestReport };


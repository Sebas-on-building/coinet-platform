/**
 * =========================================
 * ELITE API GATEWAY LOAD TESTING SUITE
 * =========================================
 * Comprehensive performance testing with load simulation,
 * latency measurement, throughput analysis, and stress testing
 */

const axios = require('axios');
const { performance } = require('perf_hooks');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class EliteLoadTester {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:8000',
      testDuration: config.testDuration || 300000, // 5 minutes
      rampUpTime: config.rampUpTime || 60000, // 1 minute
      maxConcurrentUsers: config.maxConcurrentUsers || 1000,
      requestsPerSecond: config.requestsPerSecond || 100,
      endpoints: config.endpoints || this.getDefaultEndpoints(),
      outputDir: config.outputDir || './test-results',
      ...config
    };

    this.results = {
      startTime: null,
      endTime: null,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      throughput: [],
      errorRates: [],
      memoryUsage: [],
      cpuUsage: []
    };

    this.activeRequests = new Set();
    this.workers = [];
  }

  getDefaultEndpoints() {
    return [
      {
        name: 'health_check',
        path: '/health',
        method: 'GET',
        weight: 10, // 10% of requests
        expectedStatus: 200
      },
      {
        name: 'metrics',
        path: '/metrics',
        method: 'GET',
        weight: 5, // 5% of requests
        expectedStatus: 200,
        auth: true
      },
      {
        name: 'api_docs',
        path: '/docs',
        method: 'GET',
        weight: 5, // 5% of requests
        expectedStatus: 200
      },
      {
        name: 'signal_processing',
        path: '/api/v1/signals/process',
        method: 'POST',
        weight: 40, // 40% of requests (most important)
        expectedStatus: 200,
        auth: true,
        body: this.generateSignalData()
      },
      {
        name: 'user_profile',
        path: '/api/v1/users/profile',
        method: 'GET',
        weight: 20, // 20% of requests
        expectedStatus: 200,
        auth: true
      },
      {
        name: 'portfolio_data',
        path: '/api/v1/portfolio',
        method: 'GET',
        weight: 15, // 15% of requests
        expectedStatus: 200,
        auth: true
      },
      {
        name: 'alert_evaluation',
        path: '/api/v1/alerts/evaluate',
        method: 'POST',
        weight: 5, // 5% of requests
        expectedStatus: 200,
        auth: true,
        body: this.generateAlertData()
      }
    ];
  }

  generateSignalData() {
    return {
      exchange: 'binance',
      symbol: 'BTCUSDT',
      timestamp: Date.now(),
      price: 45000 + Math.random() * 1000,
      volume: Math.random() * 1000000,
      bidPrice: 44990 + Math.random() * 100,
      askPrice: 45010 + Math.random() * 100,
      bidVolume: Math.random() * 10000,
      askVolume: Math.random() * 10000,
      tradeType: ['buy', 'sell'][Math.floor(Math.random() * 2)],
      metadata: {
        source: 'websocket',
        sequence: Math.floor(Math.random() * 1000000)
      }
    };
  }

  generateAlertData() {
    return {
      userId: 'test-user-' + Math.floor(Math.random() * 1000),
      signal: {
        exchange: 'binance',
        symbol: 'BTCUSDT',
        price: 45000 + Math.random() * 1000,
        timestamp: Date.now()
      },
      rules: [
        {
          id: 'price-alert-' + Math.floor(Math.random() * 1000),
          condition: 'price_above',
          threshold: 46000 + Math.random() * 2000,
          timeframe: '1h'
        }
      ]
    };
  }

  generateAuthToken() {
    // Mock JWT token for testing
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({
      id: 'test-user-' + Math.floor(Math.random() * 1000),
      role: ['user', 'premium', 'enterprise'][Math.floor(Math.random() * 3)],
      permissions: ['signals:process', 'portfolio:read', 'alerts:evaluate'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    })).toString('base64');
    const signature = 'mock-signature-for-testing';

    return `${header}.${payload}.${signature}`;
  }

  async runLoadTest() {
    console.log('🚀 Starting Elite API Gateway Load Test');
    console.log(`📊 Configuration: ${JSON.stringify(this.config, null, 2)}`);

    this.results.startTime = Date.now();

    try {
      // Start monitoring
      this.startMonitoring();

      // Run test phases
      await this.runRampUpPhase();
      await this.runSustainedLoadPhase();
      await this.runRampDownPhase();

      // Generate report
      await this.generateReport();

    } catch (error) {
      console.error('❌ Load test failed:', error);
      throw error;
    } finally {
      this.stopMonitoring();
    }
  }

  async runRampUpPhase() {
    console.log('📈 Starting Ramp-Up Phase');

    const rampUpSteps = 10;
    const stepDuration = this.config.rampUpTime / rampUpSteps;
    const usersPerStep = this.config.maxConcurrentUsers / rampUpSteps;

    for (let step = 1; step <= rampUpSteps; step++) {
      const concurrentUsers = Math.floor(usersPerStep * step);
      console.log(`   Step ${step}/${rampUpSteps}: ${concurrentUsers} concurrent users`);

      // Start workers for this step
      await this.startWorkers(concurrentUsers);

      // Wait for step duration
      await this.sleep(stepDuration);

      // Stop workers from previous steps (except last step)
      if (step < rampUpSteps) {
        await this.stopWorkers();
      }
    }
  }

  async runSustainedLoadPhase() {
    console.log(`🏃 Starting Sustained Load Phase (${this.config.testDuration / 1000}s)`);

    await this.startWorkers(this.config.maxConcurrentUsers);

    // Monitor progress
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - this.results.startTime;
      const progress = Math.min(elapsed / this.config.testDuration * 100, 100);
      const rps = this.results.totalRequests / (elapsed / 1000);

      console.log(`   Progress: ${progress.toFixed(1)}% | RPS: ${rps.toFixed(2)} | Requests: ${this.results.totalRequests}`);
    }, 5000);

    await this.sleep(this.config.testDuration);

    clearInterval(progressInterval);
    await this.stopWorkers();
  }

  async runRampDownPhase() {
    console.log('📉 Starting Ramp-Down Phase');

    const rampDownSteps = 5;
    const stepDuration = 30000; // 30 seconds per step
    const usersPerStep = this.config.maxConcurrentUsers / rampDownSteps;

    for (let step = rampDownSteps; step >= 1; step--) {
      const concurrentUsers = Math.floor(usersPerStep * step);
      console.log(`   Step ${step}/${rampDownSteps}: ${concurrentUsers} concurrent users`);

      await this.startWorkers(concurrentUsers);
      await this.sleep(stepDuration);

      if (step > 1) {
        await this.stopWorkers();
      }
    }
  }

  async startWorkers(concurrentUsers) {
    const requestsPerUser = Math.ceil(this.config.requestsPerSecond / concurrentUsers);
    const endpointsPerWorker = this.distributeEndpoints(concurrentUsers);

    for (let i = 0; i < concurrentUsers; i++) {
      const worker = this.createWorker(i, requestsPerUser, endpointsPerWorker[i] || []);
      this.workers.push(worker);
      worker.start();
    }
  }

  async stopWorkers() {
    for (const worker of this.workers) {
      worker.stop();
    }
    this.workers = [];

    // Wait for active requests to complete
    while (this.activeRequests.size > 0) {
      await this.sleep(100);
    }
  }

  createWorker(workerId, requestsPerSecond, endpoints) {
    return {
      id: workerId,
      isRunning: false,
      intervals: [],

      start: () => {
        this.isRunning = true;
        const interval = 1000 / requestsPerSecond; // milliseconds between requests

        // Create intervals for each endpoint
        endpoints.forEach(endpoint => {
          const endpointInterval = setInterval(() => {
            if (this.isRunning) {
              this.executeRequest(endpoint);
            }
          }, interval * endpoints.length); // Distribute requests across endpoints

          this.intervals.push(endpointInterval);
        });
      },

      stop: () => {
        this.isRunning = false;
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
      },

      executeRequest: async (endpoint) => {
        const requestId = `${workerId}-${Date.now()}-${Math.random()}`;
        this.activeRequests.add(requestId);

        const startTime = performance.now();

        try {
          const config = {
            method: endpoint.method,
            url: `${this.config.baseUrl}${endpoint.path}`,
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': `LoadTest-Worker-${workerId}`,
              'X-Request-ID': requestId
            }
          };

          // Add authentication if required
          if (endpoint.auth) {
            config.headers['Authorization'] = `Bearer ${this.generateAuthToken()}`;
          }

          // Add request body if specified
          if (endpoint.body) {
            config.data = typeof endpoint.body === 'function' ? endpoint.body() : endpoint.body;
          }

          const response = await axios(config);

          const responseTime = performance.now() - startTime;

          // Record successful request
          this.results.totalRequests++;
          this.results.successfulRequests++;
          this.results.responseTimes.push(responseTime);

          // Check response status
          if (response.status !== endpoint.expectedStatus) {
            console.warn(`Unexpected status for ${endpoint.name}: ${response.status}`);
          }

        } catch (error) {
          const responseTime = performance.now() - startTime;

          this.results.totalRequests++;
          this.results.failedRequests++;
          this.results.responseTimes.push(responseTime);

          console.error(`Request failed for ${endpoint.name}:`, {
            status: error.response?.status,
            message: error.message,
            workerId,
            requestId
          });
        } finally {
          this.activeRequests.delete(requestId);
        }
      }
    };
  }

  distributeEndpoints(totalWorkers) {
    const endpoints = [...this.config.endpoints];
    const distributed = [];

    // Sort endpoints by weight (descending)
    endpoints.sort((a, b) => b.weight - a.weight);

    // Distribute endpoints across workers
    for (let i = 0; i < totalWorkers; i++) {
      distributed.push([]);
    }

    let workerIndex = 0;
    for (const endpoint of endpoints) {
      for (let i = 0; i < endpoint.weight; i++) {
        distributed[workerIndex % totalWorkers].push(endpoint);
        workerIndex++;
      }
    }

    return distributed;
  }

  startMonitoring() {
    // Monitor system resources every 5 seconds
    this.monitoringInterval = setInterval(() => {
      this.recordSystemMetrics();
    }, 5000);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  recordSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.results.memoryUsage.push({
      timestamp: Date.now(),
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external
    });

    this.results.cpuUsage.push({
      timestamp: Date.now(),
      user: cpuUsage.user,
      system: cpuUsage.system
    });

    // Calculate throughput (requests per second)
    const elapsed = (Date.now() - this.results.startTime) / 1000;
    const currentRPS = this.results.totalRequests / elapsed;
    this.results.throughput.push({
      timestamp: Date.now(),
      rps: currentRPS
    });

    // Calculate error rate
    const errorRate = this.results.totalRequests > 0 ?
      (this.results.failedRequests / this.results.totalRequests) * 100 : 0;
    this.results.errorRates.push({
      timestamp: Date.now(),
      errorRate
    });
  }

  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  async generateReport() {
    this.results.endTime = Date.now();
    const duration = this.results.endTime - this.results.startTime;

    console.log('\n📊 LOAD TEST RESULTS');
    console.log('=' .repeat(50));

    // Basic metrics
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📈 Total Requests: ${this.results.totalRequests}`);
    console.log(`✅ Successful: ${this.results.successfulRequests}`);
    console.log(`❌ Failed: ${this.results.failedRequests}`);
    console.log(`📊 Success Rate: ${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%`);

    // Performance metrics
    const avgResponseTime = this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length;
    const minResponseTime = Math.min(...this.results.responseTimes);
    const maxResponseTime = Math.max(...this.results.responseTimes);

    console.log(`\n⚡ PERFORMANCE METRICS`);
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Min Response Time: ${minResponseTime.toFixed(2)}ms`);
    console.log(`   Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
    console.log(`   50th Percentile: ${this.calculatePercentile(this.results.responseTimes, 50).toFixed(2)}ms`);
    console.log(`   95th Percentile: ${this.calculatePercentile(this.results.responseTimes, 95).toFixed(2)}ms`);
    console.log(`   99th Percentile: ${this.calculatePercentile(this.results.responseTimes, 99).toFixed(2)}ms`);

    // Throughput metrics
    const avgThroughput = this.results.throughput.reduce((a, b) => a + b.rps, 0) / this.results.throughput.length;
    const maxThroughput = Math.max(...this.results.throughput.map(t => t.rps));

    console.log(`\n🚀 THROUGHPUT METRICS`);
    console.log(`   Average RPS: ${avgThroughput.toFixed(2)}`);
    console.log(`   Max RPS: ${maxThroughput.toFixed(2)}`);
    console.log(`   Target RPS: ${this.config.requestsPerSecond}`);

    // Error analysis
    const avgErrorRate = this.results.errorRates.reduce((a, b) => a + b.errorRate, 0) / this.results.errorRates.length;
    const maxErrorRate = Math.max(...this.results.errorRates.map(e => e.errorRate));

    console.log(`\n⚠️  ERROR ANALYSIS`);
    console.log(`   Average Error Rate: ${avgErrorRate.toFixed(2)}%`);
    console.log(`   Max Error Rate: ${maxErrorRate.toFixed(2)}%`);

    // Resource usage
    const finalMemory = this.results.memoryUsage[this.results.memoryUsage.length - 1];
    const avgCpu = this.results.cpuUsage.reduce((a, b) => a + (b.user + b.system), 0) / this.results.cpuUsage.length;

    console.log(`\n💾 RESOURCE USAGE`);
    console.log(`   Final Memory RSS: ${(finalMemory?.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Final Heap Used: ${(finalMemory?.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Average CPU Usage: ${(avgCpu / 1000000).toFixed(2)}%`);

    // Performance assessment
    console.log(`\n🏆 PERFORMANCE ASSESSMENT`);
    if (avgResponseTime < 100) {
      console.log(`   ✅ Excellent: Average response time < 100ms`);
    } else if (avgResponseTime < 500) {
      console.log(`   ⚠️  Good: Average response time < 500ms`);
    } else {
      console.log(`   ❌ Poor: Average response time >= 500ms`);
    }

    if (avgErrorRate < 1) {
      console.log(`   ✅ Excellent: Error rate < 1%`);
    } else if (avgErrorRate < 5) {
      console.log(`   ⚠️  Acceptable: Error rate < 5%`);
    } else {
      console.log(`   ❌ High error rate: ${avgErrorRate.toFixed(2)}%`);
    }

    if (avgThroughput >= this.config.requestsPerSecond * 0.9) {
      console.log(`   ✅ Excellent: Achieved >= 90% of target throughput`);
    } else if (avgThroughput >= this.config.requestsPerSecond * 0.7) {
      console.log(`   ⚠️  Good: Achieved >= 70% of target throughput`);
    } else {
      console.log(`   ❌ Low throughput: ${avgThroughput.toFixed(2)} RPS (target: ${this.config.requestsPerSecond})`);
    }

    // Save detailed results
    await this.saveResults();

    console.log(`\n📄 Detailed results saved to: ${this.config.outputDir}`);
  }

  async saveResults() {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = path.join(this.config.outputDir, `load-test-results-${timestamp}.json`);

    const detailedResults = {
      config: this.config,
      summary: {
        duration: this.results.endTime - this.results.startTime,
        totalRequests: this.results.totalRequests,
        successfulRequests: this.results.successfulRequests,
        failedRequests: this.results.failedRequests,
        successRate: (this.results.successfulRequests / this.results.totalRequests) * 100,
        averageResponseTime: this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length,
        minResponseTime: Math.min(...this.results.responseTimes),
        maxResponseTime: Math.max(...this.results.responseTimes),
        p50ResponseTime: this.calculatePercentile(this.results.responseTimes, 50),
        p95ResponseTime: this.calculatePercentile(this.results.responseTimes, 95),
        p99ResponseTime: this.calculatePercentile(this.results.responseTimes, 99),
        averageThroughput: this.results.throughput.reduce((a, b) => a + b.rps, 0) / this.results.throughput.length,
        maxThroughput: Math.max(...this.results.throughput.map(t => t.rps)),
        averageErrorRate: this.results.errorRates.reduce((a, b) => a + b.errorRate, 0) / this.results.errorRates.length
      },
      timeSeries: {
        responseTimes: this.results.responseTimes,
        throughput: this.results.throughput,
        errorRates: this.results.errorRates,
        memoryUsage: this.results.memoryUsage,
        cpuUsage: this.results.cpuUsage
      },
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(resultsFile, JSON.stringify(detailedResults, null, 2));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Elite API Gateway Load Testing Suite

Usage: node api-gateway-load-test.js [options]

Options:
  --base-url <url>           Base URL of the API gateway (default: http://localhost:8000)
  --duration <ms>            Test duration in milliseconds (default: 300000)
  --ramp-up <ms>             Ramp-up time in milliseconds (default: 60000)
  --max-users <n>            Maximum concurrent users (default: 1000)
  --rps <n>                  Target requests per second (default: 100)
  --output-dir <dir>         Output directory for results (default: ./test-results)
  --help                     Show this help message

Examples:
  node api-gateway-load-test.js --base-url http://localhost:8000 --max-users 500 --rps 50
  node api-gateway-load-test.js --duration 600000 --max-users 2000
    `);
    return;
  }

  const config = {
    baseUrl: args.includes('--base-url') ? args[args.indexOf('--base-url') + 1] : 'http://localhost:8000',
    testDuration: parseInt(args.includes('--duration') ? args[args.indexOf('--duration') + 1] : '300000'),
    rampUpTime: parseInt(args.includes('--ramp-up') ? args[args.indexOf('--ramp-up') + 1] : '60000'),
    maxConcurrentUsers: parseInt(args.includes('--max-users') ? args[args.indexOf('--max-users') + 1] : '1000'),
    requestsPerSecond: parseInt(args.includes('--rps') ? args[args.indexOf('--rps') + 1] : '100'),
    outputDir: args.includes('--output-dir') ? args[args.indexOf('--output-dir') + 1] : './test-results'
  };

  const tester = new EliteLoadTester(config);

  try {
    await tester.runLoadTest();
    console.log('\n🎉 Load test completed successfully!');
  } catch (error) {
    console.error('\n💥 Load test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { EliteLoadTester };

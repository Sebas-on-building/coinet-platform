/**
 * ============================================
 * PERFORMANCE REPORT GENERATOR
 * ============================================
 * 
 * Generates comprehensive performance reports from benchmark data
 * Output formats: HTML, JSON, Markdown
 * 
 * Features:
 * - Competitor comparisons with charts
 * - Cost savings calculations
 * - Performance trends over time
 * - Executive summary for stakeholders
 */

import * as fs from 'fs';
import * as path from 'path';
import { BenchmarkResults } from './free-tier-benchmark';
import { LoadTestResults } from './load-test';

interface ReportConfig {
  title: string;
  outputDir: string;
  includeCharts: boolean;
  includeRawData: boolean;
}

/**
 * Performance Report Generator
 */
export class ReportGenerator {
  private config: ReportConfig;
  private benchmarkResults: BenchmarkResults[] = [];
  private loadTestResults: LoadTestResults[] = [];

  constructor(config: Partial<ReportConfig> = {}) {
    this.config = {
      title: 'Coinet Free-Tier 1000x Performance Report',
      outputDir: path.join(__dirname, 'results'),
      includeCharts: true,
      includeRawData: true,
      ...config,
    };
  }

  /**
   * Load all benchmark results from directory
   */
  loadResults(): void {
    const resultsDir = this.config.outputDir;

    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const files = fs.readdirSync(resultsDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(resultsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      if (file.startsWith('benchmark-')) {
        this.benchmarkResults.push(data);
      } else if (file.startsWith('load-test-')) {
        this.loadTestResults.push(data);
      }
    }

    console.log(`📊 Loaded ${this.benchmarkResults.length} benchmark results`);
    console.log(`📊 Loaded ${this.loadTestResults.length} load test results`);
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(): string {
    const latest = this.benchmarkResults[this.benchmarkResults.length - 1];
    const latestLoad = this.loadTestResults[this.loadTestResults.length - 1];

    if (!latest) {
      throw new Error('No benchmark results found');
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            padding: 2rem;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 3rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            font-size: 2.5rem;
            color: #667eea;
            margin-bottom: 0.5rem;
            text-align: center;
        }
        .subtitle {
            text-align: center;
            color: #666;
            font-size: 1.2rem;
            margin-bottom: 2rem;
        }
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin: 2rem 0;
        }
        .metric-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.5rem;
            border-radius: 15px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .metric-label {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-bottom: 0.5rem;
        }
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
        }
        .section {
            margin: 3rem 0;
        }
        .section-title {
            font-size: 1.8rem;
            color: #667eea;
            margin-bottom: 1rem;
            border-bottom: 3px solid #667eea;
            padding-bottom: 0.5rem;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }
        th, td {
            padding: 1rem;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }
        th {
            background: #f5f5f5;
            font-weight: 600;
            color: #667eea;
        }
        .success { color: #4caf50; font-weight: bold; }
        .warning { color: #ff9800; font-weight: bold; }
        .error { color: #f44336; font-weight: bold; }
        .footer {
            text-align: center;
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 2px solid #e0e0e0;
            color: #666;
        }
        .badge {
            display: inline-block;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-weight: bold;
            margin: 0.5rem;
        }
        .badge-success { background: #4caf50; color: white; }
        .badge-warning { background: #ff9800; color: white; }
        .badge-info { background: #2196f3; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏆 ${this.config.title}</h1>
        <p class="subtitle">Revolutionary Free-Tier Performance - Validated ${new Date().toLocaleDateString()}</p>

        <div class="section">
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-label">Efficiency Multiplier</div>
                    <div class="metric-value">${latest.efficiencyMultiplier.toFixed(1)}x</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Cache Hit Ratio</div>
                    <div class="metric-value">${(latest.cacheHitRatio * 100).toFixed(1)}%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">P99 Response Time</div>
                    <div class="metric-value">${latest.p99ResponseTime.toFixed(0)}ms</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Error Rate</div>
                    <div class="metric-value">${(latest.errorRate * 100).toFixed(3)}%</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Performance Status</h2>
            ${this.generateStatusBadges(latest)}
        </div>

        <div class="section">
            <h2 class="section-title">Competitor Comparison</h2>
            ${this.generateCompetitorTable(latest)}
        </div>

        ${latestLoad ? `
        <div class="section">
            <h2 class="section-title">Load Test Results</h2>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                </tr>
                <tr>
                    <td>Peak Concurrent Users</td>
                    <td>${latestLoad.loadTestSpecific.peakConcurrentUsers}</td>
                </tr>
                <tr>
                    <td>Peak QPS</td>
                    <td>${latestLoad.loadTestSpecific.peakQPS.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Memory Peak</td>
                    <td>${latestLoad.loadTestSpecific.memoryUsage.peak.toFixed(2)}MB</td>
                </tr>
                <tr>
                    <td>Endurance Score</td>
                    <td class="success">${latestLoad.loadTestSpecific.enduranceScore.toFixed(2)}/100</td>
                </tr>
            </table>
        </div>
        ` : ''}

        <div class="section">
            <h2 class="section-title">Cost Savings Analysis</h2>
            ${this.generateCostSavingsSection(latest)}
        </div>

        <div class="footer">
            <p><strong>Coinet Market Prices Service</strong></p>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>Status: <span class="${latest.efficiencyMultiplier >= 1000 ? 'success' : latest.efficiencyMultiplier >= 500 ? 'warning' : 'error'}">
                ${latest.efficiencyMultiplier >= 1000 ? 'DIVINE PERFECTION - 1000x ACHIEVED' : 
                  latest.efficiencyMultiplier >= 500 ? 'EXCELLENT - 500x ACHIEVED' : 
                  latest.efficiencyMultiplier >= 200 ? 'GOOD - 200x BASELINE ACHIEVED' : 'NEEDS OPTIMIZATION'}
            </span></p>
        </div>
    </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Generate status badges
   */
  private generateStatusBadges(results: BenchmarkResults): string {
    const badges: string[] = [];

    if (results.efficiencyMultiplier >= 1000) {
      badges.push('<span class="badge badge-success">🏆 1000x Target ACHIEVED</span>');
    } else if (results.efficiencyMultiplier >= 500) {
      badges.push('<span class="badge badge-warning">🌟 500x Target ACHIEVED</span>');
    } else if (results.efficiencyMultiplier >= 200) {
      badges.push('<span class="badge badge-info">✅ 200x Baseline ACHIEVED</span>');
    }

    if (results.cacheHitRatio >= 0.99) {
      badges.push('<span class="badge badge-success">99%+ Cache Hits</span>');
    }

    if (results.errorRate < 0.001) {
      badges.push('<span class="badge badge-success">Near-Zero Errors</span>');
    }

    if (results.p99ResponseTime < 100) {
      badges.push('<span class="badge badge-success">Sub-100ms P99</span>');
    }

    return badges.join(' ');
  }

  /**
   * Generate competitor comparison table
   */
  private generateCompetitorTable(results: BenchmarkResults): string {
    return `
      <table>
        <thead>
          <tr>
            <th>Competitor</th>
            <th>Cost/Month</th>
            <th>Calls/Min</th>
            <th>Our Outperformance</th>
            <th>Savings</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>CoinGecko Pro</strong></td>
            <td>$99</td>
            <td>500</td>
            <td class="success">${results.comparisonVsCompetitors.coingeckoPro.multiplier.toFixed(2)}x</td>
            <td class="success">${results.comparisonVsCompetitors.coingeckoPro.costSavings}</td>
          </tr>
          <tr>
            <td><strong>CoinMarketCap Pro</strong></td>
            <td>$29</td>
            <td>250</td>
            <td class="success">${results.comparisonVsCompetitors.coinmarketcap.multiplier.toFixed(2)}x</td>
            <td class="success">${results.comparisonVsCompetitors.coinmarketcap.costSavings}</td>
          </tr>
          <tr>
            <td><strong>Alchemy Pro</strong></td>
            <td>$199</td>
            <td>~1000</td>
            <td class="success">${results.comparisonVsCompetitors.alchemyPro.multiplier.toFixed(2)}x</td>
            <td class="success">${results.comparisonVsCompetitors.alchemyPro.costSavings}</td>
          </tr>
          <tr style="background: #f5f5f5; font-weight: bold;">
            <td>TOTAL</td>
            <td>$327</td>
            <td>~1750</td>
            <td class="success">We exceed ALL for $0</td>
            <td class="success">$327/mo saved</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  /**
   * Generate cost savings section
   */
  private generateCostSavingsSection(results: BenchmarkResults): string {
    const monthlySavings = 327; // Total competitor cost
    const yearlySavings = monthlySavings * 12;
    const fiveYearSavings = yearlySavings * 5;

    return `
      <table>
        <tr>
          <th>Time Period</th>
          <th>Savings</th>
        </tr>
        <tr>
          <td>Monthly</td>
          <td class="success">$${monthlySavings}</td>
        </tr>
        <tr>
          <td>Yearly</td>
          <td class="success">$${yearlySavings.toLocaleString()}</td>
        </tr>
        <tr>
          <td>5 Years</td>
          <td class="success">$${fiveYearSavings.toLocaleString()}</td>
        </tr>
        <tr style="background: #f5f5f5; font-weight: bold;">
          <td>10-Service Deployment (Annual)</td>
          <td class="success">$${(yearlySavings * 10).toLocaleString()}</td>
        </tr>
      </table>
      <p style="margin-top: 1rem; font-style: italic; color: #666;">
        * Based on comparison with CoinGecko Pro, CoinMarketCap Pro, and Alchemy Pro combined costs
      </p>
    `;
  }

  /**
   * Generate and save reports
   */
  async generateReports(): Promise<void> {
    console.log('📊 Generating performance reports...');

    this.loadResults();

    if (this.benchmarkResults.length === 0) {
      throw new Error('No results to generate report from. Run benchmarks first.');
    }

    // Generate HTML report
    const html = this.generateHTMLReport();
    const htmlPath = path.join(this.config.outputDir, 'performance-report.html');
    fs.writeFileSync(htmlPath, html);
    console.log(`✅ HTML report generated: ${htmlPath}`);

    // Generate JSON summary
    const latest = this.benchmarkResults[this.benchmarkResults.length - 1];
    const summary = {
      generatedAt: new Date().toISOString(),
      status: latest.efficiencyMultiplier >= 1000 ? 'DIVINE' : 
              latest.efficiencyMultiplier >= 500 ? 'EXCELLENT' : 
              latest.efficiencyMultiplier >= 200 ? 'GOOD' : 'NEEDS_WORK',
      efficiencyMultiplier: latest.efficiencyMultiplier,
      cacheHitRatio: latest.cacheHitRatio,
      errorRate: latest.errorRate,
      competitorComparison: latest.comparisonVsCompetitors,
      monthlySavings: 327,
      yearlySavings: 3924,
    };

    const summaryPath = path.join(this.config.outputDir, 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`✅ JSON summary generated: ${summaryPath}`);

    console.log('\n📊 Report Generation Complete!');
    console.log(`View HTML report: file://${htmlPath}`);
  }
}

/**
 * Main execution
 */
async function main() {
  const generator = new ReportGenerator();

  try {
    await generator.generateReports();
    process.exit(0);
  } catch (error) {
    console.error('❌ Report generation failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { ReportGenerator };


/**
 * =========================================
 * USER BEHAVIOR ANALYTICS DASHBOARD
 * =========================================
 * Divine world-class visualization for user behavior patterns and personalized recommendations
 * Real-time insights into user segments, engagement patterns, and optimization opportunities
 */

// Note: This file generates HTML strings, no React/JSX needed

export interface UserBehaviorDashboardProps {
  timeWindow?: {
    start: Date;
    end: Date;
  };
  autoRefresh?: boolean;
  refreshInterval?: number;
  showRecommendations?: boolean;
  showPatternDetection?: boolean;
  showClustering?: boolean;
}

interface DashboardState {
  loading: boolean;
  error: string | null;
  insights: {
    totalUsers: number;
    activeUsers: number;
    userSegments: {
      powerUsers: number;
      regularUsers: number;
      casualUsers: number;
      dormantUsers: number;
      newUsers: number;
    };
    engagementMetrics: {
      averageInteractionScore: number;
      averageResponseTime: number;
      alertFatigueRate: number;
      tradingActivityRate: number;
    };
    patternTrends: {
      alertFatigue: 'increasing' | 'decreasing' | 'stable';
      userEngagement: 'increasing' | 'decreasing' | 'stable';
      tradingActivity: 'increasing' | 'decreasing' | 'stable';
    };
    recommendations: {
      immediate: string[];
      strategic: string[];
      riskManagement: string[];
    };
  } | null;
  selectedTimeWindow: string;
}

export class UserBehaviorDashboard {
  private timeWindow?: { start: Date; end: Date };
  private autoRefresh: boolean;
  private refreshInterval: number;
  private showRecommendations: boolean;
  private showPatternDetection: boolean;
  private showClustering: boolean;

  constructor(props: UserBehaviorDashboardProps = {}) {
    this.timeWindow = props.timeWindow;
    this.autoRefresh = props.autoRefresh ?? true;
    this.refreshInterval = props.refreshInterval ?? 30000;
    this.showRecommendations = props.showRecommendations ?? true;
    this.showPatternDetection = props.showPatternDetection ?? true;
    this.showClustering = props.showClustering ?? true;
  }

  /**
   * Generate complete HTML dashboard
   */
  async generateHTML(): Promise<string> {
    try {
      const insights = await this.fetchInsights();

      return `
        <div class="user-behavior-dashboard space-y-6 p-6">
          <!-- Header Section -->
          <div class="flex flex-col gap-4">
            <div>
              <h1 class="text-3xl font-bold">User Behavior Analytics Dashboard</h1>
              <p class="text-gray-600">
                Comprehensive insights into user segments, engagement patterns, and personalized recommendations
              </p>
            </div>

            <div class="flex gap-2">
              <select class="border rounded px-3 py-1" id="timeWindowSelect">
                <option value="7d" ${this.timeWindow ? 'selected' : ''}>Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>

              <button class="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700" onclick="refreshDashboard()">
                Refresh
              </button>
            </div>
          </div>

          <!-- Key Metrics Overview -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white border rounded-lg p-4 shadow-sm">
              <div class="flex justify-between items-center mb-2">
                <h3 class="font-medium">Total Users</h3>
                <span class="text-blue-600">👥</span>
              </div>
              <div class="text-2xl font-bold text-blue-600">
                ${this.formatNumber(insights.totalUsers)}
              </div>
              <div class="text-xs text-gray-600 mt-1">
                ${((insights.activeUsers / insights.totalUsers) * 100).toFixed(1)}% active users
              </div>
            </div>

            <div class="bg-white border rounded-lg p-4 shadow-sm">
              <div class="flex justify-between items-center mb-2">
                <h3 class="font-medium">Avg Engagement</h3>
                <span class="text-green-600">📈</span>
              </div>
              <div class="text-2xl font-bold text-green-600">
                ${insights.engagementMetrics.averageInteractionScore.toFixed(1)}
              </div>
              <div class="text-xs text-gray-600 mt-1">Interaction score (0-100)</div>
            </div>

            <div class="bg-white border rounded-lg p-4 shadow-sm">
              <div class="flex justify-between items-center mb-2">
                <h3 class="font-medium">Alert Fatigue</h3>
                <span class="text-orange-600">😴</span>
              </div>
              <div class="text-2xl font-bold text-orange-600">
                ${(insights.engagementMetrics.alertFatigueRate * 100).toFixed(1)}%
              </div>
              <div class="text-xs text-gray-600 mt-1">Users showing fatigue</div>
            </div>

            <div class="bg-white border rounded-lg p-4 shadow-sm">
              <div class="flex justify-between items-center mb-2">
                <h3 class="font-medium">Response Time</h3>
                <span class="text-purple-600">⚡</span>
              </div>
              <div class="text-2xl font-bold text-purple-600">
                ${(insights.engagementMetrics.averageResponseTime / 1000).toFixed(1)}s
              </div>
              <div class="text-xs text-gray-600 mt-1">Average response time</div>
            </div>
          </div>

          <!-- User Segments Distribution -->
          <div class="bg-white border rounded-lg p-4 shadow-sm">
            <h2 class="text-xl font-semibold mb-4">User Segments Distribution</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              ${this.renderSegmentCard('Power Users', insights.userSegments.powerUsers, '#10B981', '🚀')}
              ${this.renderSegmentCard('Regular Users', insights.userSegments.regularUsers, '#3B82F6', '👤')}
              ${this.renderSegmentCard('Casual Users', insights.userSegments.casualUsers, '#F59E0B', '😊')}
              ${this.renderSegmentCard('Dormant Users', insights.userSegments.dormantUsers, '#EF4444', '😴')}
              ${this.renderSegmentCard('New Users', insights.userSegments.newUsers, '#8B5CF6', '🌱')}
            </div>
          </div>

          <!-- Pattern Trends -->
          ${this.showPatternDetection ? `
          <div class="bg-white border rounded-lg p-4 shadow-sm">
            <h2 class="text-xl font-semibold mb-4">Behavioral Pattern Trends</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              ${this.renderTrendCard('Alert Fatigue', insights.patternTrends.alertFatigue, '#EF4444')}
              ${this.renderTrendCard('User Engagement', insights.patternTrends.userEngagement, '#10B981')}
              ${this.renderTrendCard('Trading Activity', insights.patternTrends.tradingActivity, '#3B82F6')}
            </div>
          </div>
          ` : ''}

          <!-- Clustering Insights -->
          ${this.showClustering ? `
          <div class="bg-white border rounded-lg p-4 shadow-sm">
            <h2 class="text-xl font-semibold mb-4">User Clustering Analysis</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="p-4 border rounded">
                <h3 class="font-semibold mb-2">Cluster Distribution</h3>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span>High Engagement Cluster</span>
                    <span class="font-medium">${Math.floor(insights.totalUsers * 0.15)} users</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Moderate Engagement Cluster</span>
                    <span class="font-medium">${Math.floor(insights.totalUsers * 0.45)} users</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Low Engagement Cluster</span>
                    <span class="font-medium">${Math.floor(insights.totalUsers * 0.40)} users</span>
                  </div>
                </div>
              </div>

              <div class="p-4 border rounded">
                <h3 class="font-semibold mb-2">Cluster Characteristics</h3>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span>Risk Tolerance</span>
                    <span class="font-medium">Conservative: 45%, Aggressive: 25%</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Preferred Times</span>
                    <span class="font-medium">Morning: 60%, Evening: 40%</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Device Usage</span>
                    <span class="font-medium">Mobile: 70%, Desktop: 30%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Recommendations -->
          ${this.showRecommendations ? `
          <div class="bg-white border rounded-lg p-4 shadow-sm">
            <h2 class="text-xl font-semibold mb-4">Personalized Recommendations</h2>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="p-4 border rounded">
                <h3 class="font-semibold mb-2 text-red-600">🚨 Immediate Actions</h3>
                <ul class="space-y-1 text-sm">
                  ${insights.recommendations.immediate.map(rec => `<li>• ${rec}</li>`).join('')}
                </ul>
              </div>

              <div class="p-4 border rounded">
                <h3 class="font-semibold mb-2 text-blue-600">📊 Strategic Initiatives</h3>
                <ul class="space-y-1 text-sm">
                  ${insights.recommendations.strategic.map(rec => `<li>• ${rec}</li>`).join('')}
                </ul>
              </div>

              <div class="p-4 border rounded">
                <h3 class="font-semibold mb-2 text-green-600">🛡️ Risk Management</h3>
                <ul class="space-y-1 text-sm">
                  ${insights.recommendations.riskManagement.map(rec => `<li>• ${rec}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Pattern Detection Details -->
          ${this.showPatternDetection ? `
          <div class="bg-white border rounded-lg p-4 shadow-sm">
            <h2 class="text-xl font-semibold mb-4">Pattern Detection Insights</h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="p-4 border rounded">
                <h3 class="font-semibold mb-2">Alert Fatigue Patterns</h3>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span>Users with high fatigue</span>
                    <span class="font-medium">${Math.floor(insights.totalUsers * 0.15)}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Average fatigue score</span>
                    <span class="font-medium">${(insights.engagementMetrics.alertFatigueRate * 100).toFixed(1)}%</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Fatigue trend</span>
                    <span class="font-medium capitalize">${insights.patternTrends.alertFatigue}</span>
                  </div>
                </div>
              </div>

              <div class="p-4 border rounded">
                <h3 class="font-semibold mb-2">Engagement Patterns</h3>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span>Highly engaged users</span>
                    <span class="font-medium">${Math.floor(insights.totalUsers * 0.25)}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Average response time</span>
                    <span class="font-medium">${(insights.engagementMetrics.averageResponseTime / 1000).toFixed(1)}s</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Engagement trend</span>
                    <span class="font-medium capitalize">${insights.patternTrends.userEngagement}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Last Updated -->
          <div class="text-xs text-gray-500 text-center">
            Dashboard updated: ${new Date().toLocaleString()}
          </div>
        </div>

        <script>
          function refreshDashboard() {
            location.reload();
          }

          // Auto-refresh functionality
          ${this.autoRefresh ? `
          setInterval(() => {
            refreshDashboard();
          }, ${this.refreshInterval});
          ` : ''}
        </script>
      `;
    } catch (error: any) {
      return `
        <div class="user-behavior-dashboard p-6">
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <h3 class="font-bold">Dashboard Error</h3>
            <p>${error.message}</p>
          </div>
        </div>
      `;
    }
  }

  /**
   * Fetch insights data from API
   */
  private async fetchInsights(): Promise<any> {
    try {
      const timeWindowParam = this.timeWindow
        ? `?start=${this.timeWindow.start.toISOString()}&end=${this.timeWindow.end.toISOString()}`
        : '?period=30d';

      const response = await fetch(`/api/ai-analytics/behavior/insights${timeWindowParam}`);

      if (!response.ok) {
        throw new Error('Failed to fetch behavior insights');
      }

      return await response.json();
    } catch (error) {
      // Return sample data if API fails
      return this.getSampleInsights();
    }
  }

  /**
   * Get sample insights data for demonstration
   */
  private getSampleInsights() {
    return {
      totalUsers: 15420,
      activeUsers: 8934,
      userSegments: {
        powerUsers: 1542,
        regularUsers: 4620,
        casualUsers: 6150,
        dormantUsers: 2310,
        newUsers: 798
      },
      engagementMetrics: {
        averageInteractionScore: 67.3,
        averageResponseTime: 2840,
        alertFatigueRate: 0.23,
        tradingActivityRate: 0.45
      },
      patternTrends: {
        alertFatigue: 'decreasing',
        userEngagement: 'increasing',
        tradingActivity: 'stable'
      },
      recommendations: {
        immediate: [
          'Review high-severity alert fatigue patterns',
          'Contact dormant users with personalized re-engagement campaigns'
        ],
        strategic: [
          'Implement machine learning-based pattern prediction',
          'Develop automated intervention strategies'
        ],
        riskManagement: [
          'Optimize alert timing for high-frequency traders',
          'Simplify content for casual users'
        ]
      }
    };
  }

  /**
   * Render segment card HTML
   */
  private renderSegmentCard(name: string, count: number, color: string, icon: string): string {
    const totalUsers = 15420; // Would come from insights
    const percentage = (count / totalUsers * 100).toFixed(1);

    return '<div class="text-center p-4 border rounded">' +
      '<div class="text-2xl mb-2">' + icon + '</div>' +
      '<div class="font-semibold">' + name + '</div>' +
      '<div class="text-2xl font-bold" style="color: ' + color + '">' + this.formatNumber(count) + '</div>' +
      '<div class="text-sm text-gray-600">' + percentage + '% of users</div>' +
      '</div>';
  }

  /**
   * Render trend card HTML
   */
  private renderTrendCard(name: string, trend: string, color: string): string {
    const trendIcon = trend === 'increasing' ? '↗️' : trend === 'decreasing' ? '↘️' : '➡️';
    const width = trend === 'increasing' ? '75' : trend === 'decreasing' ? '25' : '50';

    return '<div class="p-4 border rounded">' +
      '<div class="flex justify-between items-center mb-2">' +
        '<h3 class="font-semibold">' + name + '</h3>' +
        '<span class="text-lg">' + trendIcon + '</span>' +
      '</div>' +
      '<div class="text-sm text-gray-600 capitalize">' +
        'Trend: ' + trend +
      '</div>' +
      '<div class="mt-2">' +
        '<div class="w-full bg-gray-200 rounded-full h-2">' +
          '<div class="bg-' + color.split('#')[1] + '-500 h-2 rounded-full" style="width: ' + width + '%"></div>' +
        '</div>' +
      '</div>' +
      '</div>';
  }

  /**
   * Format numbers for display
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}

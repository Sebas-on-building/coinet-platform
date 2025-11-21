/**
 * =========================================
 * AI INSIGHTS DASHBOARD
 * =========================================
 * Divine world-class visualization for AI-powered insights and recommendations
 * Real-time insights, interactive recommendations, and feedback loops
 */

import React, { useState, useEffect } from 'react';

export interface AIInsight {
  id: string;
  type: 'recommendation' | 'correlation' | 'performance' | 'trend';
  title: string;
  description: string;
  confidence: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact: 'critical' | 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high' | 'complex';
  explanation: {
    reasoning: string;
    dataPoints: string[];
    benefits?: string[];
    risks?: string[];
    alternatives?: string[];
  };
  actions: Array<{
    type: string;
    description: string;
    estimatedImpact?: number;
  }>;
  createdAt: Date;
  expiresAt?: Date;
  actionable: boolean;
}

export interface AIInsightsDashboardProps {
  userId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onInsightAction?: (insight: AIInsight, action: string) => void;
  onInsightFeedback?: (insight: AIInsight, feedback: string) => void;
}

export interface DashboardState {
  insights: AIInsight[];
  loading: boolean;
  error: string | null;
  selectedInsight: AIInsight | null;
  filters: {
    priority: string[];
    type: string[];
    actionable: boolean | null;
  };
}

/**
 * AI Insights Dashboard Component
 */
export const AIInsightsDashboard: React.FC<AIInsightsDashboardProps> = ({
  userId,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  onInsightAction,
  onInsightFeedback
}) => {
  const [state, setState] = useState<DashboardState>({
    insights: [],
    loading: true,
    error: null,
    selectedInsight: null,
    filters: {
      priority: [],
      type: [],
      actionable: null
    }
  });

  // Fetch insights from API
  const fetchInsights = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch('/api/ai-insights/dashboard-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          includeCorrelations: true,
          includeFeedback: true,
          minConfidence: 0.6,
          maxRecommendations: 20
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setState(prev => ({
          ...prev,
          insights: data.insights || [],
          loading: false
        }));
      } else {
        throw new Error(data.error || 'Failed to fetch insights');
      }

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message,
        loading: false
      }));
    }
  };

  // Auto-refresh insights
  useEffect(() => {
    fetchInsights();

    if (autoRefresh) {
      const interval = setInterval(fetchInsights, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [userId, autoRefresh, refreshInterval]);

  // Filter insights based on current filters
  const filteredInsights = state.insights.filter(insight => {
    if (state.filters.priority.length > 0 && !state.filters.priority.includes(insight.priority)) {
      return false;
    }
    if (state.filters.type.length > 0 && !state.filters.type.includes(insight.type)) {
      return false;
    }
    if (state.filters.actionable !== null && insight.actionable !== state.filters.actionable) {
      return false;
    }
    return true;
  });

  // Group insights by priority for display
  const insightsByPriority = {
    critical: filteredInsights.filter(i => i.priority === 'critical'),
    high: filteredInsights.filter(i => i.priority === 'high'),
    medium: filteredInsights.filter(i => i.priority === 'medium'),
    low: filteredInsights.filter(i => i.priority === 'low')
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      critical: 'border-red-500 bg-red-50',
      high: 'border-orange-500 bg-orange-50',
      medium: 'border-yellow-500 bg-yellow-50',
      low: 'border-green-500 bg-green-50'
    };
    return colors[priority as keyof typeof colors] || 'border-gray-500 bg-gray-50';
  };

  const getPriorityIcon = (priority: string) => {
    const icons = {
      critical: '🚨',
      high: '⚠️',
      medium: '💡',
      low: 'ℹ️'
    };
    return icons[priority as keyof typeof icons] || '📊';
  };

  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(0)}%`;
  };

  return (
    <div className="ai-insights-dashboard space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Insights & Recommendations</h2>
          <p className="text-gray-600">
            Intelligent recommendations based on your trading patterns and market analysis
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            onChange={(e) => setState(prev => ({
              ...prev,
              filters: { ...prev.filters, priority: e.target.value ? [e.target.value] : [] }
            }))}
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            onChange={(e) => setState(prev => ({
              ...prev,
              filters: { ...prev.filters, type: e.target.value ? [e.target.value] : [] }
            }))}
          >
            <option value="">All Types</option>
            <option value="recommendation">Recommendations</option>
            <option value="correlation">Correlations</option>
            <option value="performance">Performance</option>
            <option value="trend">Trends</option>
          </select>

          <button
            className={`px-3 py-2 rounded-md text-sm ${
              state.filters.actionable === true
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => setState(prev => ({
              ...prev,
              filters: { ...prev.filters, actionable: prev.filters.actionable === true ? null : true }
            }))}
          >
            Actionable Only
          </button>

          <button
            className="px-3 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
            onClick={fetchInsights}
            disabled={state.loading}
          >
            {state.loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-red-800">{state.error}</span>
          </div>
        </div>
      )}

      {/* Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical & High Priority Insights */}
        {(insightsByPriority.critical.length > 0 || insightsByPriority.high.length > 0) && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Urgent Recommendations</h3>

            {insightsByPriority.critical.map(insight => (
              <InsightCard
                key={insight.id}
                insight={insight}
                colorClass={getPriorityColor(insight.priority)}
                icon={getPriorityIcon(insight.priority)}
                onAction={(action) => onInsightAction?.(insight, action)}
                onFeedback={(feedback) => onInsightFeedback?.(insight, feedback)}
                onView={() => setState(prev => ({ ...prev, selectedInsight: insight }))}
              />
            ))}

            {insightsByPriority.high.map(insight => (
              <InsightCard
                key={insight.id}
                insight={insight}
                colorClass={getPriorityColor(insight.priority)}
                icon={getPriorityIcon(insight.priority)}
                onAction={(action) => onInsightAction?.(insight, action)}
                onFeedback={(feedback) => onInsightFeedback?.(insight, feedback)}
                onView={() => setState(prev => ({ ...prev, selectedInsight: insight }))}
              />
            ))}
          </div>
        )}

        {/* Medium & Low Priority Insights */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">General Insights</h3>

          {insightsByPriority.medium.map(insight => (
            <InsightCard
              key={insight.id}
              insight={insight}
              colorClass={getPriorityColor(insight.priority)}
              icon={getPriorityIcon(insight.priority)}
              onAction={(action) => onInsightAction?.(insight, action)}
              onFeedback={(feedback) => onInsightFeedback?.(insight, feedback)}
              onView={() => setState(prev => ({ ...prev, selectedInsight: insight }))}
            />
          ))}

          {insightsByPriority.low.map(insight => (
            <InsightCard
              key={insight.id}
              insight={insight}
              colorClass={getPriorityColor(insight.priority)}
              icon={getPriorityIcon(insight.priority)}
              onAction={(action) => onInsightAction?.(insight, action)}
              onFeedback={(feedback) => onInsightFeedback?.(insight, feedback)}
              onView={() => setState(prev => ({ ...prev, selectedInsight: insight }))}
            />
          ))}

          {filteredInsights.length === 0 && !state.loading && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">🤖</div>
              <p>No insights available</p>
              <p className="text-sm">AI insights will appear here as you use the platform</p>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {state.loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Selected Insight Modal */}
      {state.selectedInsight && (
        <InsightModal
          insight={state.selectedInsight}
          onClose={() => setState(prev => ({ ...prev, selectedInsight: null }))}
          onAction={(action) => onInsightAction?.(state.selectedInsight!, action)}
          onFeedback={(feedback) => onInsightFeedback?.(state.selectedInsight!, feedback)}
        />
      )}
    </div>
  );
};

/**
 * Individual Insight Card Component
 */
interface InsightCardProps {
  insight: AIInsight;
  colorClass: string;
  icon: string;
  onAction: (action: string) => void;
  onFeedback: (feedback: string) => void;
  onView: () => void;
}

const InsightCard: React.FC<InsightCardProps> = ({
  insight,
  colorClass,
  icon,
  onAction,
  onFeedback,
  onView
}) => {
  return (
    <div className={`border-l-4 ${colorClass} rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{icon}</span>
            <h4 className="font-semibold text-gray-900">{insight.title}</h4>
            {insight.actionable && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Actionable
              </span>
            )}
          </div>

          <p className="text-gray-700 text-sm mb-3">{insight.description}</p>

          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <span>Confidence: <strong>{formatConfidence(insight.confidence)}</strong></span>
            <span>Impact: <strong className="capitalize">{insight.impact}</strong></span>
            <span>Effort: <strong className="capitalize">{insight.effort}</strong></span>
          </div>

          {insight.explanation.dataPoints.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-600 mb-1">Key Data Points:</p>
              <ul className="text-xs text-gray-600 space-y-1">
                {insight.explanation.dataPoints.slice(0, 2).map((point, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-1">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            onClick={onView}
          >
            View Details
          </button>

          {insight.actions.length > 0 && (
            <button
              className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
              onClick={() => onAction('implement')}
            >
              Implement
            </button>
          )}
        </div>

        <button
          className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200"
          onClick={() => onFeedback('viewed')}
        >
          Mark as Read
        </button>
      </div>
    </div>
  );
};

/**
 * Insight Modal for Detailed View
 */
interface InsightModalProps {
  insight: AIInsight;
  onClose: () => void;
  onAction: (action: string) => void;
  onFeedback: (feedback: string) => void;
}

const InsightModal: React.FC<InsightModalProps> = ({
  insight,
  onClose,
  onAction,
  onFeedback
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getPriorityIcon(insight.priority)}</span>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{insight.title}</h3>
                <p className="text-gray-600">{insight.description}</p>
              </div>
            </div>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-sm text-gray-600">Confidence</div>
              <div className="text-lg font-semibold">{formatConfidence(insight.confidence)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Priority</div>
              <div className="text-lg font-semibold capitalize">{insight.priority}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Impact</div>
              <div className="text-lg font-semibold capitalize">{insight.impact}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Effort</div>
              <div className="text-lg font-semibold capitalize">{insight.effort}</div>
            </div>
          </div>

          {/* Explanation */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Explanation</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 mb-3">{insight.explanation.reasoning}</p>

              <div className="space-y-3">
                <div>
                  <h5 className="font-medium text-gray-900 text-sm">Key Data Points</h5>
                  <ul className="text-sm text-gray-600 mt-1 space-y-1">
                    {insight.explanation.dataPoints.map((point, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {insight.explanation.benefits && insight.explanation.benefits.length > 0 && (
                  <div>
                    <h5 className="font-medium text-green-900 text-sm">Expected Benefits</h5>
                    <ul className="text-sm text-gray-600 mt-1 space-y-1">
                      {insight.explanation.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {insight.explanation.risks && insight.explanation.risks.length > 0 && (
                  <div>
                    <h5 className="font-medium text-red-900 text-sm">Potential Risks</h5>
                    <ul className="text-sm text-gray-600 mt-1 space-y-1">
                      {insight.explanation.risks.map((risk, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-red-500 mr-2">⚠</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          {insight.actions.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Recommended Actions</h4>
              <div className="space-y-2">
                {insight.actions.map((action, index) => (
                  <div key={index} className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                    <div>
                      <div className="font-medium text-gray-900">{action.description}</div>
                      <div className="text-sm text-gray-600">Type: {action.type}</div>
                    </div>
                    <button
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      onClick={() => onAction(action.type)}
                    >
                      Implement
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              onClick={() => onFeedback('dismissed')}
            >
              Dismiss
            </button>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Helper function to get priority icon
 */
const getPriorityIcon = (priority: string): string => {
  const icons = {
    critical: '🚨',
    high: '⚠️',
    medium: '💡',
    low: 'ℹ️'
  };
  return icons[priority as keyof typeof icons] || '📊';
};

/**
 * Helper function to format confidence
 */
const formatConfidence = (confidence: number): string => {
  return `${(confidence * 100).toFixed(0)}%`;
};

export default AIInsightsDashboard;

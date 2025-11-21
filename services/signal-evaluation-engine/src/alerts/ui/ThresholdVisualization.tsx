/**
 * =========================================
 * THRESHOLD VISUALIZATION UI COMPONENTS
 * =========================================
 * React components for visualizing dynamic threshold
 * adaptations and providing user feedback for the
 * Coinet alert system
 */

import { useState, useEffect } from 'react';
import type {
  ThresholdVisualizationData,
  ThresholdAdaptationContext,
  ManualThresholdOverride,
  DynamicThresholdConfig
} from '../types';

// Props for threshold visualization components
export interface ThresholdVisualizationProps {
  ruleId: string;
  visualizationData: ThresholdVisualizationData;
  onManualOverride?: (override: Omit<ManualThresholdOverride, 'id' | 'appliedAt'>) => void;
  onRemoveOverride?: (overrideId: string) => void;
  className?: string;
}

export interface ThresholdChartProps {
  historicalThresholds: ThresholdVisualizationData['historicalThresholds'];
  currentThreshold: number;
  baseThreshold: number;
  width?: number;
  height?: number;
  className?: string;
}

export interface ThresholdMetricsProps {
  performanceMetrics: ThresholdVisualizationData['performanceMetrics'];
  adaptationFactors: ThresholdVisualizationData['adaptationFactors'];
  alertsTriggered: number;
  alertsAvoided: number;
  className?: string;
}

export interface ThresholdRecommendationsProps {
  recommendations: string[];
  className?: string;
}

export interface ManualOverridePanelProps {
  ruleId: string;
  overrides: ManualThresholdOverride[];
  onAddOverride: (override: Omit<ManualThresholdOverride, 'id' | 'appliedAt'>) => void;
  onRemoveOverride: (overrideId: string) => void;
  className?: string;
}

export interface ThresholdConfigPanelProps {
  ruleId: string;
  config: DynamicThresholdConfig;
  onConfigChange: (config: DynamicThresholdConfig) => void;
  className?: string;
}

// Main threshold visualization component
export const ThresholdVisualization: React.FC<ThresholdVisualizationProps> = ({
  ruleId,
  visualizationData,
  onManualOverride,
  onRemoveOverride,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'metrics' | 'overrides' | 'config'>('chart');

  return (
    <div className={`threshold-visualization ${className}`}>
      <div className="threshold-visualization-header">
        <h3>Dynamic Threshold Analysis</h3>
        <div className="threshold-tabs">
          <button
            className={activeTab === 'chart' ? 'active' : ''}
            onClick={() => setActiveTab('chart')}
          >
            Chart
          </button>
          <button
            className={activeTab === 'metrics' ? 'active' : ''}
            onClick={() => setActiveTab('metrics')}
          >
            Metrics
          </button>
          <button
            className={activeTab === 'overrides' ? 'active' : ''}
            onClick={() => setActiveTab('overrides')}
          >
            Overrides
          </button>
          <button
            className={activeTab === 'config' ? 'active' : ''}
            onClick={() => setActiveTab('config')}
          >
            Configuration
          </button>
        </div>
      </div>

      <div className="threshold-visualization-content">
        {activeTab === 'chart' && (
          <ThresholdChart
            historicalThresholds={visualizationData.historicalThresholds}
            currentThreshold={visualizationData.currentThreshold}
            baseThreshold={visualizationData.currentThreshold} // Would need base threshold from config
          />
        )}

        {activeTab === 'metrics' && (
          <ThresholdMetrics
            performanceMetrics={visualizationData.performanceMetrics}
            adaptationFactors={visualizationData.adaptationFactors}
            alertsTriggered={visualizationData.alertsTriggered}
            alertsAvoided={visualizationData.alertsAvoided}
          />
        )}

        {activeTab === 'overrides' && (
          <ManualOverridePanel
            ruleId={ruleId}
            overrides={[]} // Would need to get from props or API
            onAddOverride={onManualOverride || (() => {})}
            onRemoveOverride={onRemoveOverride || (() => {})}
          />
        )}

        {activeTab === 'config' && (
          <ThresholdConfigPanel
            ruleId={ruleId}
            config={{
              enabled: true,
              adaptationStrategy: 'hybrid',
              baseThreshold: visualizationData.currentThreshold,
              adaptationRate: 0.1,
              userRiskTolerance: 'moderate',
              signalStrengthWeight: 0.4,
              historicalPerformanceWeight: 0.3,
              marketRegimeWeight: 0.3,
              manualOverrides: [],
              performanceTracking: {
                enabled: true,
                windowSize: 24,
                metrics: {
                  truePositives: 0,
                  falsePositives: 0,
                  trueNegatives: 0,
                  falseNegatives: 0,
                  precision: 0,
                  recall: 0,
                  f1Score: 0,
                  averageConfidence: 0
                },
                lastUpdated: new Date()
              }
            }} // Would need to get from props or API
            onConfigChange={() => {}}
          />
        )}
      </div>
    </div>
  );
};

// Threshold adaptation chart component
export const ThresholdChart: React.FC<ThresholdChartProps> = ({
  historicalThresholds,
  currentThreshold,
  baseThreshold,
  width = 600,
  height = 300,
  className = ''
}) => {
  // In a real implementation, this would use a charting library like Chart.js or D3
  // For now, we'll create a simple SVG visualization

  const maxThreshold = Math.max(...historicalThresholds.map((h: { threshold: number }) => h.threshold), currentThreshold, baseThreshold);
  const minThreshold = Math.min(...historicalThresholds.map((h: { threshold: number }) => h.threshold), currentThreshold, baseThreshold);

  const chartHeight = height - 60; // Reserve space for labels
  const chartWidth = width - 80; // Reserve space for y-axis

  const scaleY = (value: number) => chartHeight - ((value - minThreshold) / (maxThreshold - minThreshold)) * chartHeight;

  return (
    <div className={`threshold-chart ${className}`}>
      <svg width={width} height={height}>
        {/* Y-axis labels */}
        <text x="10" y="15" className="axis-label">Threshold</text>
        {[0.25, 0.5, 0.75, 1.0].map((ratio: number, i: number) => {
          const value = minThreshold + (maxThreshold - minThreshold) * ratio;
          const y = 30 + (i * (chartHeight - 30) / 3);
          return (
            <g key={i}>
              <line x1="60" y1={y} x2={width} y2={y} stroke="#e0e0e0" strokeWidth="1" />
              <text x="65" y={y + 5} className="grid-label">{value.toFixed(3)}</text>
            </g>
          );
        })}

        {/* Base threshold line */}
        <line
          x1="60"
          y1={scaleY(baseThreshold)}
          x2={width}
          y2={scaleY(baseThreshold)}
          stroke="#ff6b6b"
          strokeWidth="2"
          strokeDasharray="5,5"
        />

        {/* Historical threshold line */}
        {historicalThresholds.length > 1 && (
          <polyline
            points={historicalThresholds.map((h: { threshold: number }, i: number) =>
              `${60 + (i * (chartWidth - 60) / (historicalThresholds.length - 1))},${scaleY(h.threshold)}`
            ).join(' ')}
            fill="none"
            stroke="#4ecdc4"
            strokeWidth="2"
          />
        )}

        {/* Current threshold indicator */}
        <circle
          cx={width - 20}
          cy={scaleY(currentThreshold)}
          r="4"
          fill="#45b7d1"
        />

        {/* Legend */}
        <g className="legend">
          <circle cx="70" cy={height - 40} r="3" fill="#ff6b6b" />
          <text x="80" y={height - 37} className="legend-text">Base Threshold</text>

          <circle cx="70" cy={height - 25} r="3" fill="#4ecdc4" />
          <text x="80" y={height - 22} className="legend-text">Historical</text>

          <circle cx="70" cy={height - 10} r="3" fill="#45b7d1" />
          <text x="80" y={height - 7} className="legend-text">Current</text>
        </g>
      </svg>
    </div>
  );
};

// Threshold metrics display component
export const ThresholdMetrics: React.FC<ThresholdMetricsProps> = ({
  performanceMetrics,
  adaptationFactors,
  alertsTriggered,
  alertsAvoided,
  className = ''
}) => {
  return (
    <div className={`threshold-metrics ${className}`}>
      <div className="metrics-grid">
        <div className="metric-card">
          <h4>Performance Metrics</h4>
          <div className="metric-item">
            <span className="metric-label">Precision:</span>
            <span className="metric-value">{(performanceMetrics.precision * 100).toFixed(1)}%</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Recall:</span>
            <span className="metric-value">{(performanceMetrics.recall * 100).toFixed(1)}%</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">F1-Score:</span>
            <span className="metric-value">{(performanceMetrics.f1Score * 100).toFixed(1)}%</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">False Positive Rate:</span>
            <span className="metric-value">{(performanceMetrics.falsePositiveRate * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div className="metric-card">
          <h4>Adaptation Factors</h4>
          <div className="metric-item">
            <span className="metric-label">Signal Strength:</span>
            <span className="metric-value">{(adaptationFactors.signalStrength * 100).toFixed(1)}%</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Market Conditions:</span>
            <span className="metric-value">{(adaptationFactors.marketConditions * 100).toFixed(1)}%</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Historical Performance:</span>
            <span className="metric-value">{(adaptationFactors.historicalPerformance * 100).toFixed(1)}%</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Risk Tolerance:</span>
            <span className="metric-value">{(adaptationFactors.userRiskTolerance * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div className="metric-card">
          <h4>Alert Summary</h4>
          <div className="metric-item">
            <span className="metric-label">Alerts Triggered:</span>
            <span className="metric-value positive">{alertsTriggered}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Alerts Avoided:</span>
            <span className="metric-value neutral">{alertsAvoided}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Recommendations display component
export const ThresholdRecommendations: React.FC<ThresholdRecommendationsProps> = ({
  recommendations,
  className = ''
}) => {
  if (recommendations.length === 0) {
    return (
      <div className={`threshold-recommendations ${className}`}>
        <p className="no-recommendations">No specific recommendations at this time.</p>
      </div>
    );
  }

  return (
    <div className={`threshold-recommendations ${className}`}>
      <h4>Recommendations</h4>
      <ul className="recommendations-list">
        {recommendations.map((rec, index) => (
          <li key={index} className="recommendation-item">
            <span className="recommendation-icon">💡</span>
            <span className="recommendation-text">{rec}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Manual override panel component
export const ManualOverridePanel: React.FC<ManualOverridePanelProps> = ({
  ruleId,
  overrides,
  onAddOverride,
  onRemoveOverride,
  className = ''
}) => {
  const [newOverride, setNewOverride] = useState({
    signalType: 'price' as const,
    field: 'value',
    operator: '>' as const,
    threshold: 0,
    reason: '',
    appliedBy: 'user',
    expiresAt: undefined as Date | undefined,
    isActive: true
  });

  const handleAddOverride = () => {
    if (newOverride.reason.trim()) {
      onAddOverride(newOverride);
      setNewOverride({
        signalType: 'price',
        field: 'value',
        operator: '>',
        threshold: 0,
        reason: '',
        appliedBy: 'user',
        expiresAt: undefined,
        isActive: true
      });
    }
  };

  return (
    <div className={`manual-override-panel ${className}`}>
      <h4>Manual Threshold Overrides</h4>

      <div className="active-overrides">
        <h5>Active Overrides</h5>
        {overrides.filter(o => o.isActive).length === 0 ? (
          <p className="no-overrides">No active overrides</p>
        ) : (
          <div className="overrides-list">
            {overrides.filter(o => o.isActive).map(override => (
              <div key={override.id} className="override-item">
                <div className="override-info">
                  <span className="override-condition">
                    {override.signalType}.{override.field} {override.operator} {override.threshold}
                  </span>
                  <span className="override-reason">{override.reason}</span>
                </div>
                <button
                  className="remove-override-btn"
                  onClick={() => onRemoveOverride(override.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="add-override">
        <h5>Add Override</h5>
        <div className="override-form">
          <div className="form-group">
            <label>Signal Type:</label>
            <select
              value={newOverride.signalType}
              onChange={(e) => setNewOverride({...newOverride, signalType: e.target.value as any})}
            >
              <option value="price">Price</option>
              <option value="volume">Volume</option>
              <option value="sentiment">Sentiment</option>
            </select>
          </div>

          <div className="form-group">
            <label>Field:</label>
            <input
              type="text"
              value={newOverride.field}
              onChange={(e) => setNewOverride({...newOverride, field: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Operator:</label>
            <select
              value={newOverride.operator}
              onChange={(e) => setNewOverride({...newOverride, operator: e.target.value as any})}
            >
              <option value=">">Greater than</option>
              <option value="<">Less than</option>
              <option value=">=">Greater or equal</option>
              <option value="<=">Less or equal</option>
            </select>
          </div>

          <div className="form-group">
            <label>Threshold:</label>
            <input
              type="number"
              step="0.001"
              value={newOverride.threshold}
              onChange={(e) => setNewOverride({...newOverride, threshold: parseFloat(e.target.value)})}
            />
          </div>

          <div className="form-group">
            <label>Reason:</label>
            <input
              type="text"
              value={newOverride.reason}
              onChange={(e) => setNewOverride({...newOverride, reason: e.target.value})}
              placeholder="Why are you overriding this threshold?"
            />
          </div>

          <div className="form-group">
            <label>Expires:</label>
            <input
              type="datetime-local"
              onChange={(e) => setNewOverride({
                ...newOverride,
                expiresAt: e.target.value ? new Date(e.target.value) : undefined
              })}
            />
          </div>

          <button
            className="add-override-btn"
            onClick={handleAddOverride}
            disabled={!newOverride.reason.trim()}
          >
            Add Override
          </button>
        </div>
      </div>
    </div>
  );
};

// Threshold configuration panel component
export const ThresholdConfigPanel: React.FC<ThresholdConfigPanelProps> = ({
  ruleId,
  config,
  onConfigChange,
  className = ''
}) => {
  const [localConfig, setLocalConfig] = useState(config);

  const handleConfigChange = (updates: Partial<DynamicThresholdConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  return (
    <div className={`threshold-config-panel ${className}`}>
      <h4>Threshold Configuration</h4>

      <div className="config-form">
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={localConfig.enabled}
              onChange={(e) => handleConfigChange({ enabled: e.target.checked })}
            />
            Enable Dynamic Thresholds
          </label>
        </div>

        <div className="form-group">
          <label>Adaptation Strategy:</label>
          <select
            value={localConfig.adaptationStrategy}
            onChange={(e) => handleConfigChange({ adaptationStrategy: e.target.value as any })}
          >
            <option value="bayesian">Bayesian</option>
            <option value="reinforcement_learning">Reinforcement Learning</option>
            <option value="statistical">Statistical</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        <div className="form-group">
          <label>Base Threshold:</label>
          <input
            type="number"
            step="0.001"
            value={localConfig.baseThreshold}
            onChange={(e) => handleConfigChange({ baseThreshold: parseFloat(e.target.value) })}
          />
        </div>

        <div className="form-group">
          <label>Adaptation Rate:</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={localConfig.adaptationRate}
            onChange={(e) => handleConfigChange({ adaptationRate: parseFloat(e.target.value) })}
          />
          <span className="range-value">{(localConfig.adaptationRate * 100).toFixed(0)}%</span>
        </div>

        <div className="form-group">
          <label>Risk Tolerance:</label>
          <select
            value={localConfig.userRiskTolerance}
            onChange={(e) => handleConfigChange({ userRiskTolerance: e.target.value as any })}
          >
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>

        <div className="weights-section">
          <h5>Adaptation Weights</h5>

          <div className="form-group">
            <label>Signal Strength:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={localConfig.signalStrengthWeight}
              onChange={(e) => handleConfigChange({ signalStrengthWeight: parseFloat(e.target.value) })}
            />
            <span className="range-value">{(localConfig.signalStrengthWeight * 100).toFixed(0)}%</span>
          </div>

          <div className="form-group">
            <label>Historical Performance:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={localConfig.historicalPerformanceWeight}
              onChange={(e) => handleConfigChange({ historicalPerformanceWeight: parseFloat(e.target.value) })}
            />
            <span className="range-value">{(localConfig.historicalPerformanceWeight * 100).toFixed(0)}%</span>
          </div>

          <div className="form-group">
            <label>Market Regime:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={localConfig.marketRegimeWeight}
              onChange={(e) => handleConfigChange({ marketRegimeWeight: parseFloat(e.target.value) })}
            />
            <span className="range-value">{(localConfig.marketRegimeWeight * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={localConfig.performanceTracking.enabled}
              onChange={(e) => handleConfigChange({
                performanceTracking: { ...localConfig.performanceTracking, enabled: e.target.checked }
              })}
            />
            Enable Performance Tracking
          </label>
        </div>
      </div>
    </div>
  );
};

// CSS styles (would be in a separate CSS file in a real implementation)
const styles = `
.threshold-visualization {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background: white;
}

.threshold-visualization-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.threshold-tabs {
  display: flex;
  gap: 8px;
}

.threshold-tabs button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
}

.threshold-tabs button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.threshold-chart {
  margin: 16px 0;
}

.axis-label {
  font-weight: bold;
  font-size: 12px;
}

.grid-label {
  font-size: 11px;
  fill: #666;
}

.legend-text {
  font-size: 12px;
  fill: #333;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin: 16px 0;
}

.metric-card {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
}

.metric-card h4 {
  margin: 0 0 12px 0;
  color: #333;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  margin: 8px 0;
}

.metric-label {
  color: #666;
}

.metric-value {
  font-weight: bold;
}

.metric-value.positive {
  color: #28a745;
}

.metric-value.neutral {
  color: #6c757d;
}

.recommendations-list {
  list-style: none;
  padding: 0;
}

.recommendation-item {
  display: flex;
  align-items: flex-start;
  margin: 8px 0;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.recommendation-icon {
  margin-right: 8px;
  font-size: 16px;
}

.recommendation-text {
  flex: 1;
}

.no-recommendations {
  text-align: center;
  color: #666;
  font-style: italic;
}

.override-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin: 4px 0;
}

.override-info {
  display: flex;
  flex-direction: column;
}

.override-condition {
  font-weight: bold;
  color: #333;
}

.override-reason {
  font-size: 12px;
  color: #666;
}

.remove-override-btn {
  padding: 4px 8px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.add-override-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.add-override-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.weights-section {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
  margin: 16px 0;
}

.weights-section h5 {
  margin: 0 0 12px 0;
}

.range-value {
  display: inline-block;
  margin-left: 8px;
  font-size: 12px;
  color: #666;
  min-width: 35px;
}

@media (max-width: 768px) {
  .threshold-visualization-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .threshold-tabs {
    width: 100%;
    justify-content: flex-start;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
`;

// Inject styles (in a real app, this would be in a CSS file)
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

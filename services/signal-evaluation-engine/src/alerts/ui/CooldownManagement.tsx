/**
 * =========================================
 * COOLDOWN MANAGEMENT UI COMPONENTS
 * =========================================
 * React components for configuring and monitoring the
 * enhanced cooldown system with spam prevention
 */

import React, { useState, useEffect } from 'react';
import type {
  CooldownConfiguration,
  CooldownStatistics,
  AssetSignalKey,
  CooldownEntry,
  AlertGroup
} from '../types';

// Props for cooldown management components
export interface CooldownManagementProps {
  ruleId?: string;
  cooldownConfig: CooldownConfiguration;
  cooldownStats: CooldownStatistics;
  activeCooldowns: Array<{ key: AssetSignalKey; cooldownEntry: CooldownEntry }>;
  activeGroups: AlertGroup[];
  onConfigUpdate: (config: CooldownConfiguration) => void;
  className?: string;
}

export interface CooldownConfigPanelProps {
  config: CooldownConfiguration;
  onConfigChange: (config: CooldownConfiguration) => void;
  className?: string;
}

export interface CooldownStatsProps {
  stats: CooldownStatistics;
  className?: string;
}

export interface ActiveCooldownsProps {
  activeCooldowns: Array<{ key: AssetSignalKey; cooldownEntry: CooldownEntry }>;
  className?: string;
}

export interface ActiveGroupsProps {
  activeGroups: AlertGroup[];
  className?: string;
}

// Main cooldown management component
export const CooldownManagement: React.FC<CooldownManagementProps> = ({
  ruleId,
  cooldownConfig,
  cooldownStats,
  activeCooldowns,
  activeGroups,
  onConfigUpdate,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'stats' | 'cooldowns' | 'groups'>('config');

  return (
    <div className={`cooldown-management ${className}`}>
      <div className="cooldown-management-header">
        <h3>Cooldown & Spam Prevention</h3>
        <div className="cooldown-tabs">
          <button
            className={activeTab === 'config' ? 'active' : ''}
            onClick={() => setActiveTab('config')}
          >
            Configuration
          </button>
          <button
            className={activeTab === 'stats' ? 'active' : ''}
            onClick={() => setActiveTab('stats')}
          >
            Statistics
          </button>
          <button
            className={activeTab === 'cooldowns' ? 'active' : ''}
            onClick={() => setActiveTab('cooldowns')}
          >
            Active Cooldowns
          </button>
          <button
            className={activeTab === 'groups' ? 'active' : ''}
            onClick={() => setActiveTab('groups')}
          >
            Alert Groups
          </button>
        </div>
      </div>

      <div className="cooldown-management-content">
        {activeTab === 'config' && (
          <CooldownConfigPanel
            config={cooldownConfig}
            onConfigChange={onConfigUpdate}
          />
        )}

        {activeTab === 'stats' && (
          <CooldownStats stats={cooldownStats} />
        )}

        {activeTab === 'cooldowns' && (
          <ActiveCooldowns activeCooldowns={activeCooldowns} />
        )}

        {activeTab === 'groups' && (
          <ActiveGroups activeGroups={activeGroups} />
        )}
      </div>
    </div>
  );
};

// Cooldown configuration panel
export const CooldownConfigPanel: React.FC<CooldownConfigPanelProps> = ({
  config,
  onConfigChange,
  className = ''
}) => {
  const [localConfig, setLocalConfig] = useState(config);

  const handleConfigChange = (updates: Partial<CooldownConfiguration>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  return (
    <div className={`cooldown-config-panel ${className}`}>
      <h4>Cooldown Configuration</h4>

      <div className="config-form">
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={localConfig.enabled}
              onChange={(e) => handleConfigChange({ enabled: e.target.checked })}
            />
            Enable Enhanced Cooldown System
          </label>
        </div>

        <div className="form-group">
          <label>Base Cooldown Period (seconds):</label>
          <input
            type="number"
            min="1"
            max="3600"
            value={localConfig.baseCooldownPeriod}
            onChange={(e) => handleConfigChange({ baseCooldownPeriod: parseInt(e.target.value) })}
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={localConfig.adaptiveCooldown}
              onChange={(e) => handleConfigChange({ adaptiveCooldown: e.target.checked })}
            />
            Adaptive Cooldown (based on asset volatility)
          </label>
        </div>

        {localConfig.adaptiveCooldown && (
          <>
            <div className="form-group">
              <label>Asset Volatility Multiplier:</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={localConfig.assetVolatilityMultiplier}
                onChange={(e) => handleConfigChange({ assetVolatilityMultiplier: parseFloat(e.target.value) })}
              />
              <span className="range-value">{localConfig.assetVolatilityMultiplier}x</span>
            </div>

            <div className="form-group">
              <label>User Tolerance Multiplier:</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={localConfig.userToleranceMultiplier}
                onChange={(e) => handleConfigChange({ userToleranceMultiplier: parseFloat(e.target.value) })}
              />
              <span className="range-value">{localConfig.userToleranceMultiplier}x</span>
            </div>
          </>
        )}

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={localConfig.criticalAnomalyBypass}
              onChange={(e) => handleConfigChange({ criticalAnomalyBypass: e.target.checked })}
            />
            Critical Anomaly Bypass
          </label>
        </div>

        {localConfig.criticalAnomalyBypass && (
          <div className="form-group">
            <label>Critical Threshold:</label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.01"
              value={localConfig.criticalThreshold}
              onChange={(e) => handleConfigChange({ criticalThreshold: parseFloat(e.target.value) })}
            />
            <span className="range-value">{(localConfig.criticalThreshold * 100).toFixed(0)}%</span>
          </div>
        )}

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={localConfig.groupingEnabled}
              onChange={(e) => handleConfigChange({ groupingEnabled: e.target.checked })}
            />
            Enable Alert Grouping
          </label>
        </div>

        {localConfig.groupingEnabled && (
          <>
            <div className="form-group">
              <label>Grouping Window (seconds):</label>
              <input
                type="number"
                min="10"
                max="300"
                value={localConfig.groupingWindow}
                onChange={(e) => handleConfigChange({ groupingWindow: parseInt(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label>Max Group Size:</label>
              <input
                type="number"
                min="2"
                max="50"
                value={localConfig.maxGroupSize}
                onChange={(e) => handleConfigChange({ maxGroupSize: parseInt(e.target.value) })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Cooldown statistics display
export const CooldownStats: React.FC<CooldownStatsProps> = ({
  stats,
  className = ''
}) => {
  const effectivenessColor = stats.effectivenessScore > 0.8 ? 'green' :
                           stats.effectivenessScore > 0.6 ? 'yellow' : 'red';

  return (
    <div className={`cooldown-stats ${className}`}>
      <h4>Cooldown Statistics</h4>

      <div className="stats-grid">
        <div className="stat-card">
          <h5>Total Cooldowns</h5>
          <div className="stat-value">{stats.totalCooldowns}</div>
        </div>

        <div className="stat-card">
          <h5>Suppressed Alerts</h5>
          <div className="stat-value">{stats.totalSuppressedAlerts}</div>
        </div>

        <div className="stat-card">
          <h5>Critical Bypasses</h5>
          <div className="stat-value">{stats.totalCriticalBypasses}</div>
        </div>

        <div className="stat-card">
          <h5>Effectiveness Score</h5>
          <div className={`stat-value ${effectivenessColor}`}>
            {(stats.effectivenessScore * 100).toFixed(1)}%
          </div>
        </div>

        <div className="stat-card">
          <h5>Average Cooldown</h5>
          <div className="stat-value">{stats.averageCooldownPeriod.toFixed(1)}s</div>
        </div>
      </div>

      {stats.assetCooldownStats.size > 0 && (
        <div className="asset-stats">
          <h5>Asset Cooldown Statistics</h5>
          <div className="asset-stats-grid">
            {Array.from(stats.assetCooldownStats.entries()).map(([assetId, assetStats]) => (
              <div key={assetId} className="asset-stat-item">
                <span className="asset-id">{assetId}</span>
                <span className="asset-stats">
                  {assetStats.cooldownCount} cooldowns, {assetStats.suppressedCount} suppressed
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.signalTypeCooldownStats.size > 0 && (
        <div className="signal-stats">
          <h5>Signal Type Statistics</h5>
          <div className="signal-stats-grid">
            {Array.from(stats.signalTypeCooldownStats.entries()).map(([signalType, signalStats]) => (
              <div key={signalType} className="signal-stat-item">
                <span className="signal-type">{signalType}</span>
                <span className="signal-stats">
                  {signalStats.cooldownCount} cooldowns
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Active cooldowns display
export const ActiveCooldowns: React.FC<ActiveCooldownsProps> = ({
  activeCooldowns,
  className = ''
}) => {
  const formatTimeRemaining = (expiresAt: Date) => {
    const remaining = Math.max(0, expiresAt.getTime() - Date.now());
    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className={`active-cooldowns ${className}`}>
      <h4>Active Cooldowns</h4>

      {activeCooldowns.length === 0 ? (
        <p className="no-cooldowns">No active cooldowns</p>
      ) : (
        <div className="cooldowns-list">
          {activeCooldowns.map(({ key, cooldownEntry }) => (
            <div key={JSON.stringify(key)} className="cooldown-item">
              <div className="cooldown-info">
                <div className="asset-signal">
                  <span className="asset-id">{key.assetId}</span>
                  <span className="signal-type">{key.signalType}</span>
                  <span className={`severity ${key.severity}`}>{key.severity}</span>
                </div>
                <div className="cooldown-details">
                  <span>Alerts: {cooldownEntry.alertCount}</span>
                  <span>Time remaining: {formatTimeRemaining(cooldownEntry.expiresAt)}</span>
                  {cooldownEntry.isCritical && (
                    <span className="critical-indicator">Critical</span>
                  )}
                </div>
              </div>
              <div className="cooldown-progress">
                <div
                  className="progress-bar"
                  style={{
                    width: `${Math.min(100, ((Date.now() - cooldownEntry.lastAlertTime.getTime()) / cooldownEntry.cooldownPeriod) * 100)}%`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Active groups display
export const ActiveGroups: React.FC<ActiveGroupsProps> = ({
  activeGroups,
  className = ''
}) => {
  const formatTimeRemaining = (expiresAt: Date) => {
    const remaining = Math.max(0, expiresAt.getTime() - Date.now());
    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className={`active-groups ${className}`}>
      <h4>Active Alert Groups</h4>

      {activeGroups.length === 0 ? (
        <p className="no-groups">No active groups</p>
      ) : (
        <div className="groups-list">
          {activeGroups.map((group) => (
            <div key={group.id} className="group-item">
              <div className="group-header">
                <span className="group-id">Group {group.id.slice(-8)}</span>
                <span className={`severity ${group.severity}`}>{group.severity}</span>
              </div>

              <div className="group-info">
                <div className="alert-count">
                  {group.alerts.length} alerts grouped
                </div>
                <div className="time-remaining">
                  Expires in: {formatTimeRemaining(group.expiresAt)}
                </div>
                <div className="summary">
                  {group.summaryMessage}
                </div>
              </div>

              <div className="group-progress">
                <div
                  className="progress-bar"
                  style={{
                    width: `${Math.min(100, (group.alerts.length / 10) * 100)}%`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// CSS styles
const styles = `
.cooldown-management {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background: white;
}

.cooldown-management-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.cooldown-tabs {
  display: flex;
  gap: 8px;
}

.cooldown-tabs button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
}

.cooldown-tabs button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.cooldown-config-panel h4,
.cooldown-stats h4,
.active-cooldowns h4,
.active-groups h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #333;
}

.form-group input[type="number"] {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-group input[type="range"] {
  width: 100%;
}

.range-value {
  display: inline-block;
  margin-left: 8px;
  font-size: 14px;
  color: #666;
  min-width: 40px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 16px;
  text-align: center;
}

.stat-card h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.stat-value.green {
  color: #28a745;
}

.stat-value.yellow {
  color: #ffc107;
}

.stat-value.red {
  color: #dc3545;
}

.asset-stats,
.signal-stats {
  margin-top: 24px;
}

.asset-stats h5,
.signal-stats h5 {
  margin: 0 0 12px 0;
  color: #333;
}

.asset-stats-grid,
.signal-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 8px;
}

.asset-stat-item,
.signal-stat-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.asset-id,
.signal-type {
  font-weight: bold;
  color: #333;
}

.asset-stats,
.signal-stats {
  color: #666;
}

.cooldowns-list,
.groups-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cooldown-item,
.group-item {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
  background: #f8f9fa;
}

.cooldown-info,
.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.asset-signal {
  display: flex;
  gap: 8px;
  align-items: center;
}

.asset-id {
  font-weight: bold;
  color: #333;
}

.signal-type {
  color: #666;
  font-size: 14px;
}

.severity {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.severity.info {
  background: #d1ecf1;
  color: #0c5460;
}

.severity.warning {
  background: #fff3cd;
  color: #856404;
}

.severity.critical {
  background: #f8d7da;
  color: #721c24;
}

.severity.emergency {
  background: #dc3545;
  color: white;
}

.cooldown-details {
  display: flex;
  gap: 12px;
  font-size: 14px;
  color: #666;
}

.critical-indicator {
  background: #dc3545;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.group-info {
  margin-bottom: 8px;
}

.alert-count {
  font-weight: bold;
  color: #333;
}

.time-remaining {
  font-size: 14px;
  color: #666;
}

.summary {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.cooldown-progress,
.group-progress {
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #007bff;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.no-cooldowns,
.no-groups {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 24px;
}

@media (max-width: 768px) {
  .cooldown-management-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .cooldown-tabs {
    width: 100%;
    justify-content: flex-start;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .asset-stats-grid,
  .signal-stats-grid {
    grid-template-columns: 1fr;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

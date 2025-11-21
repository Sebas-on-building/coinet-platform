/**
 * =========================================
 * PUSH NOTIFICATION CONFIGURATION UI
 * =========================================
 * React components for configuring push notification
 * service settings including FCM, APNs, and device
 * token management for sub-2-second latency delivery
 */

import React, { useState, useEffect } from 'react';
import type {
  NotificationConfig,
  NotificationStatistics,
  NotificationPlatform,
  DeviceToken
} from '../types';

// Props for push notification configuration components
export interface PushNotificationConfigProps {
  config: NotificationConfig;
  statistics: NotificationStatistics;
  onConfigUpdate: (config: NotificationConfig) => void;
  onDeviceRegister?: (userId: string, platform: NotificationPlatform, token: string, deviceInfo: any) => void;
  onDeviceUnregister?: (tokenId: string) => void;
  className?: string;
}

export interface PlatformConfigProps {
  platform: NotificationPlatform;
  config: any;
  onConfigChange: (config: any) => void;
  className?: string;
}

export interface DeviceTokensProps {
  deviceTokens: DeviceToken[];
  onRegister?: (userId: string, platform: NotificationPlatform, token: string, deviceInfo: any) => void;
  onUnregister?: (tokenId: string) => void;
  className?: string;
}

export interface NotificationStatsProps {
  statistics: NotificationStatistics;
  className?: string;
}

// Main push notification configuration component
export const PushNotificationConfig: React.FC<PushNotificationConfigProps> = ({
  config,
  statistics,
  onConfigUpdate,
  onDeviceRegister,
  onDeviceUnregister,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'platforms' | 'devices' | 'stats'>('general');

  return (
    <div className={`push-notification-config ${className}`}>
      <div className="config-header">
        <h3>Push Notification Configuration</h3>
        <div className="config-tabs">
          <button
            className={activeTab === 'general' ? 'active' : ''}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={activeTab === 'platforms' ? 'active' : ''}
            onClick={() => setActiveTab('platforms')}
          >
            Platforms
          </button>
          <button
            className={activeTab === 'devices' ? 'active' : ''}
            onClick={() => setActiveTab('devices')}
          >
            Devices
          </button>
          <button
            className={activeTab === 'stats' ? 'active' : ''}
            onClick={() => setActiveTab('stats')}
          >
            Statistics
          </button>
        </div>
      </div>

      <div className="config-content">
        {activeTab === 'general' && (
          <GeneralConfigPanel
            config={config}
            onConfigChange={onConfigUpdate}
          />
        )}

        {activeTab === 'platforms' && (
          <PlatformsConfigPanel
            platforms={config.platforms}
            onConfigChange={(platforms) => onConfigUpdate({ ...config, platforms })}
          />
        )}

        {activeTab === 'devices' && (
          <DeviceTokensPanel
            deviceTokens={[]} // Would be fetched from API
            onRegister={onDeviceRegister}
            onUnregister={onDeviceUnregister}
          />
        )}

        {activeTab === 'stats' && (
          <NotificationStats stats={statistics} />
        )}
      </div>
    </div>
  );
};

// General configuration panel
export const GeneralConfigPanel: React.FC<{
  config: NotificationConfig;
  onConfigChange: (config: NotificationConfig) => void;
}> = ({ config, onConfigChange }) => {
  const handleConfigChange = (updates: Partial<NotificationConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  return (
    <div className="general-config-panel">
      <h4>General Settings</h4>

      <div className="config-form">
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => handleConfigChange({ enabled: e.target.checked })}
            />
            Enable Push Notifications
          </label>
        </div>

        <div className="form-group">
          <label>Queue Settings</label>
          <div className="form-row">
            <div className="form-field">
              <label>Max Queue Size:</label>
              <input
                type="number"
                min="1000"
                max="100000"
                value={config.queue.maxQueueSize}
                onChange={(e) => handleConfigChange({
                  queue: { ...config.queue, maxQueueSize: parseInt(e.target.value) }
                })}
              />
            </div>
            <div className="form-field">
              <label>Batch Size:</label>
              <input
                type="number"
                min="10"
                max="1000"
                value={config.queue.batchSize}
                onChange={(e) => handleConfigChange({
                  queue: { ...config.queue, batchSize: parseInt(e.target.value) }
                })}
              />
            </div>
            <div className="form-field">
              <label>Processing Interval (ms):</label>
              <input
                type="number"
                min="100"
                max="10000"
                value={config.queue.processingInterval}
                onChange={(e) => handleConfigChange({
                  queue: { ...config.queue, processingInterval: parseInt(e.target.value) }
                })}
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Retry Settings</label>
          <div className="form-row">
            <div className="form-field">
              <label>Max Retries:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.retry.maxRetries}
                onChange={(e) => handleConfigChange({
                  retry: { ...config.retry, maxRetries: parseInt(e.target.value) }
                })}
              />
            </div>
            <div className="form-field">
              <label>Base Delay (ms):</label>
              <input
                type="number"
                min="100"
                max="10000"
                value={config.retry.baseDelay}
                onChange={(e) => handleConfigChange({
                  retry: { ...config.retry, baseDelay: parseInt(e.target.value) }
                })}
              />
            </div>
            <div className="form-field">
              <label>Max Delay (ms):</label>
              <input
                type="number"
                min="1000"
                max="60000"
                value={config.retry.maxDelay}
                onChange={(e) => handleConfigChange({
                  retry: { ...config.retry, maxDelay: parseInt(e.target.value) }
                })}
              />
            </div>
            <div className="form-field">
              <label>Backoff Multiplier:</label>
              <input
                type="number"
                min="1.1"
                max="3.0"
                step="0.1"
                value={config.retry.backoffMultiplier}
                onChange={(e) => handleConfigChange({
                  retry: { ...config.retry, backoffMultiplier: parseFloat(e.target.value) }
                })}
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={config.security.tokenEncryption}
              onChange={(e) => handleConfigChange({
                security: { ...config.security, tokenEncryption: e.target.checked }
              })}
            />
            Encrypt Device Tokens
          </label>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={config.security.auditLogging}
              onChange={(e) => handleConfigChange({
                security: { ...config.security, auditLogging: e.target.checked }
              })}
            />
            Enable Audit Logging
          </label>
        </div>
      </div>
    </div>
  );
};

// Platform configuration panel
export const PlatformsConfigPanel: React.FC<{
  platforms: NotificationConfig['platforms'];
  onConfigChange: (platforms: NotificationConfig['platforms']) => void;
}> = ({ platforms, onConfigChange }) => {
  const [activePlatform, setActivePlatform] = useState<NotificationPlatform>('fcm');

  const handlePlatformConfigChange = (platform: NotificationPlatform, updates: any) => {
    onConfigChange({
      ...platforms,
      [platform]: { ...platforms[platform], ...updates }
    });
  };

  return (
    <div className="platforms-config-panel">
      <h4>Platform Configuration</h4>

      <div className="platform-tabs">
        <button
          className={activePlatform === 'fcm' ? 'active' : ''}
          onClick={() => setActivePlatform('fcm')}
        >
          Firebase (FCM)
        </button>
        <button
          className={activePlatform === 'apns' ? 'active' : ''}
          onClick={() => setActivePlatform('apns')}
        >
          Apple (APNs)
        </button>
        <button
          className={activePlatform === 'web' ? 'active' : ''}
          onClick={() => setActivePlatform('web')}
        >
          Web Push
        </button>
      </div>

      <div className="platform-config">
        {activePlatform === 'fcm' && (
          <FCMConfigPanel
            config={platforms.fcm}
            onConfigChange={(updates) => handlePlatformConfigChange('fcm', updates)}
          />
        )}

        {activePlatform === 'apns' && (
          <APNsConfigPanel
            config={platforms.apns}
            onConfigChange={(updates) => handlePlatformConfigChange('apns', updates)}
          />
        )}

        {activePlatform === 'web' && (
          <WebPushConfigPanel
            config={platforms.web}
            onConfigChange={(updates) => handlePlatformConfigChange('web', updates)}
          />
        )}
      </div>
    </div>
  );
};

// FCM configuration panel
export const FCMConfigPanel: React.FC<PlatformConfigProps> = ({ config, onConfigChange }) => {
  return (
    <div className="fcm-config-panel">
      <div className="config-form">
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => onConfigChange({ enabled: e.target.checked })}
            />
            Enable FCM
          </label>
        </div>

        <div className="form-group">
          <label>Server Key:</label>
          <input
            type="password"
            value={config.serverKey}
            onChange={(e) => onConfigChange({ serverKey: e.target.value })}
            placeholder="Enter FCM server key"
          />
        </div>

        <div className="form-group">
          <label>Project ID:</label>
          <input
            type="text"
            value={config.projectId}
            onChange={(e) => onConfigChange({ projectId: e.target.value })}
            placeholder="Enter Firebase project ID"
          />
        </div>

        <div className="form-group">
          <label>Rate Limit (requests/second):</label>
          <input
            type="number"
            min="100"
            max="10000"
            value={config.rateLimit}
            onChange={(e) => onConfigChange({ rateLimit: parseInt(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
};

// APNs configuration panel
export const APNsConfigPanel: React.FC<PlatformConfigProps> = ({ config, onConfigChange }) => {
  return (
    <div className="apns-config-panel">
      <div className="config-form">
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => onConfigChange({ enabled: e.target.checked })}
            />
            Enable APNs
          </label>
        </div>

        <div className="form-group">
          <label>Key ID:</label>
          <input
            type="text"
            value={config.keyId}
            onChange={(e) => onConfigChange({ keyId: e.target.value })}
            placeholder="Enter APNs key ID"
          />
        </div>

        <div className="form-group">
          <label>Team ID:</label>
          <input
            type="text"
            value={config.teamId}
            onChange={(e) => onConfigChange({ teamId: e.target.value })}
            placeholder="Enter Apple team ID"
          />
        </div>

        <div className="form-group">
          <label>Bundle ID:</label>
          <input
            type="text"
            value={config.bundleId}
            onChange={(e) => onConfigChange({ bundleId: e.target.value })}
            placeholder="Enter app bundle ID"
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={config.sandbox}
              onChange={(e) => onConfigChange({ sandbox: e.target.checked })}
            />
            Sandbox Mode (Development)
          </label>
        </div>

        <div className="form-group">
          <label>Rate Limit (requests/second):</label>
          <input
            type="number"
            min="50"
            max="5000"
            value={config.rateLimit}
            onChange={(e) => onConfigChange({ rateLimit: parseInt(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
};

// Web push configuration panel
export const WebPushConfigPanel: React.FC<PlatformConfigProps> = ({ config, onConfigChange }) => {
  return (
    <div className="web-push-config-panel">
      <div className="config-form">
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => onConfigChange({ enabled: e.target.checked })}
            />
            Enable Web Push
          </label>
        </div>

        <div className="form-group">
          <label>VAPID Public Key:</label>
          <input
            type="text"
            value={config.vapidKeys.publicKey}
            onChange={(e) => onConfigChange({
              vapidKeys: { ...config.vapidKeys, publicKey: e.target.value }
            })}
            placeholder="Enter VAPID public key"
          />
        </div>

        <div className="form-group">
          <label>VAPID Private Key:</label>
          <input
            type="password"
            value={config.vapidKeys.privateKey}
            onChange={(e) => onConfigChange({
              vapidKeys: { ...config.vapidKeys, privateKey: e.target.value }
            })}
            placeholder="Enter VAPID private key"
          />
        </div>
      </div>
    </div>
  );
};

// Device tokens panel
export const DeviceTokensPanel: React.FC<DeviceTokensProps> = ({
  deviceTokens,
  onRegister,
  onUnregister,
  className = ''
}) => {
  const [newDevice, setNewDevice] = useState({
    userId: '',
    platform: 'fcm' as NotificationPlatform,
    token: '',
    deviceInfo: {
      os: '',
      osVersion: '',
      appVersion: '',
      deviceModel: '',
      p256dh: '',
      auth: ''
    }
  });

  const handleRegisterDevice = () => {
    if (newDevice.userId && newDevice.token && onRegister) {
      onRegister(newDevice.userId, newDevice.platform, newDevice.token, newDevice.deviceInfo);
      setNewDevice({
        userId: '',
        platform: 'fcm',
        token: '',
        deviceInfo: {
          os: '',
          osVersion: '',
          appVersion: '',
          deviceModel: '',
          p256dh: '',
          auth: ''
        }
      });
    }
  };

  return (
    <div className={`device-tokens-panel ${className}`}>
      <h4>Device Token Management</h4>

      <div className="device-registration">
        <h5>Register New Device</h5>
        <div className="registration-form">
          <div className="form-group">
            <label>User ID:</label>
            <input
              type="text"
              value={newDevice.userId}
              onChange={(e) => setNewDevice({...newDevice, userId: e.target.value})}
              placeholder="Enter user ID"
            />
          </div>

          <div className="form-group">
            <label>Platform:</label>
            <select
              value={newDevice.platform}
              onChange={(e) => setNewDevice({...newDevice, platform: e.target.value as NotificationPlatform})}
            >
              <option value="fcm">Firebase (FCM)</option>
              <option value="apns">Apple (APNs)</option>
              <option value="web">Web Push</option>
            </select>
          </div>

          <div className="form-group">
            <label>Device Token:</label>
            <input
              type="text"
              value={newDevice.token}
              onChange={(e) => setNewDevice({...newDevice, token: e.target.value})}
              placeholder="Enter device token"
            />
          </div>

          <div className="form-group">
            <label>Device Info:</label>
            <div className="device-info-form">
              <input
                type="text"
                placeholder="OS (e.g., iOS, Android)"
                value={newDevice.deviceInfo.os}
                onChange={(e) => setNewDevice({
                  ...newDevice,
                  deviceInfo: {...newDevice.deviceInfo, os: e.target.value}
                })}
              />
              <input
                type="text"
                placeholder="OS Version"
                value={newDevice.deviceInfo.osVersion}
                onChange={(e) => setNewDevice({
                  ...newDevice,
                  deviceInfo: {...newDevice.deviceInfo, osVersion: e.target.value}
                })}
              />
              <input
                type="text"
                placeholder="App Version"
                value={newDevice.deviceInfo.appVersion}
                onChange={(e) => setNewDevice({
                  ...newDevice,
                  deviceInfo: {...newDevice.deviceInfo, appVersion: e.target.value}
                })}
              />
              <input
                type="text"
                placeholder="Device Model"
                value={newDevice.deviceInfo.deviceModel}
                onChange={(e) => setNewDevice({
                  ...newDevice,
                  deviceInfo: {...newDevice.deviceInfo, deviceModel: e.target.value}
                })}
              />
            </div>
          </div>

          <button
            className="register-button"
            onClick={handleRegisterDevice}
            disabled={!newDevice.userId || !newDevice.token}
          >
            Register Device
          </button>
        </div>
      </div>

      <div className="registered-devices">
        <h5>Registered Devices</h5>
        {deviceTokens.length === 0 ? (
          <p className="no-devices">No devices registered</p>
        ) : (
          <div className="devices-list">
            {deviceTokens.map((token) => (
              <div key={token.id} className="device-item">
                <div className="device-info">
                  <div className="device-header">
                    <span className="user-id">{token.userId}</span>
                    <span className={`platform ${token.platform}`}>{token.platform.toUpperCase()}</span>
                    <span className={`status ${token.isActive ? 'active' : 'inactive'}`}>
                      {token.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="device-details">
                    <span>{token.deviceInfo.os} {token.deviceInfo.osVersion}</span>
                    <span>{token.deviceInfo.deviceModel}</span>
                    <span>Registered: {token.registeredAt.toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  className="unregister-button"
                  onClick={() => onUnregister && onUnregister(token.id)}
                  disabled={!token.isActive}
                >
                  Unregister
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Notification statistics panel
export const NotificationStats: React.FC<NotificationStatsProps> = ({ statistics, className = '' }) => {
  const totalDeliveryRate = statistics.totalSent > 0 ? (statistics.totalDelivered / statistics.totalSent) * 100 : 0;
  const totalFailureRate = statistics.totalSent > 0 ? (statistics.totalFailed / statistics.totalSent) * 100 : 0;

  return (
    <div className={`notification-stats ${className}`}>
      <h4>Notification Statistics</h4>

      <div className="stats-grid">
        <div className="stat-card">
          <h5>Total Sent</h5>
          <div className="stat-value">{statistics.totalSent}</div>
        </div>

        <div className="stat-card">
          <h5>Total Delivered</h5>
          <div className="stat-value">{statistics.totalDelivered}</div>
        </div>

        <div className="stat-card">
          <h5>Total Failed</h5>
          <div className="stat-value">{statistics.totalFailed}</div>
        </div>

        <div className="stat-card">
          <h5>Delivery Rate</h5>
          <div className={`stat-value ${totalDeliveryRate > 90 ? 'green' : totalDeliveryRate > 70 ? 'yellow' : 'red'}`}>
            {totalDeliveryRate.toFixed(1)}%
          </div>
        </div>

        <div className="stat-card">
          <h5>Avg Delivery Time</h5>
          <div className="stat-value">{statistics.averageDeliveryTime.toFixed(1)}ms</div>
        </div>
      </div>

      <div className="platform-stats">
        <h5>Platform Statistics</h5>
        <div className="platform-grid">
          {Object.entries(statistics.platformStats).map(([platform, stats]) => (
            <div key={platform} className="platform-stat">
              <div className="platform-header">
                <span className="platform-name">{platform.toUpperCase()}</span>
              </div>
              <div className="platform-metrics">
                <div className="metric">
                  <span className="metric-label">Sent:</span>
                  <span className="metric-value">{stats.sent}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Delivered:</span>
                  <span className="metric-value">{stats.delivered}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Failed:</span>
                  <span className="metric-value">{stats.failed}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Latency:</span>
                  <span className="metric-value">{stats.averageLatency.toFixed(1)}ms</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {statistics.hourlyStats.length > 0 && (
        <div className="hourly-stats">
          <h5>Hourly Activity</h5>
          <div className="hourly-chart">
            {statistics.hourlyStats.map((hour) => (
              <div key={hour.hour} className="hour-bar">
                <div className="hour-label">{hour.hour}:00</div>
                <div className="hour-values">
                  <div className="sent-bar" style={{ height: `${Math.min(100, (hour.sent / 100) * 100)}%` }}></div>
                  <div className="delivered-bar" style={{ height: `${Math.min(100, (hour.delivered / 100) * 100)}%` }}></div>
                  <div className="failed-bar" style={{ height: `${Math.min(100, (hour.failed / 100) * 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(statistics.errorBreakdown).length > 0 && (
        <div className="error-breakdown">
          <h5>Error Breakdown</h5>
          <div className="error-list">
            {Object.entries(statistics.errorBreakdown).map(([error, count]) => (
              <div key={error} className="error-item">
                <span className="error-type">{error}</span>
                <span className="error-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// CSS styles
const styles = `
.push-notification-config {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background: white;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.config-tabs {
  display: flex;
  gap: 8px;
}

.config-tabs button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
}

.config-tabs button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.config-content {
  min-height: 400px;
}

.general-config-panel h4,
.platforms-config-panel h4,
.device-tokens-panel h4,
.notification-stats h4 {
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

.form-group input,
.form-group select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-field label {
  font-size: 14px;
  color: #666;
}

.platform-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.platform-tabs button {
  padding: 8px 16px;
  border: none;
  background: #f5f5f5;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.platform-tabs button.active {
  background: white;
  border-bottom: 2px solid #007bff;
}

.platform-config {
  background: white;
  padding: 16px;
  border-radius: 0 4px 4px 4px;
}

.device-registration,
.registered-devices {
  margin-bottom: 24px;
}

.device-registration h5,
.registered-devices h5 {
  margin: 0 0 12px 0;
  color: #333;
}

.registration-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.device-info-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

.register-button {
  padding: 8px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.register-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.devices-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #f8f9fa;
}

.device-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 4px;
}

.user-id {
  font-weight: bold;
  color: #333;
}

.platform {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.platform.fcm {
  background: #ff6b35;
  color: white;
}

.platform.apns {
  background: #007aff;
  color: white;
}

.platform.web {
  background: #4285f4;
  color: white;
}

.status {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: bold;
}

.status.active {
  background: #28a745;
  color: white;
}

.status.inactive {
  background: #dc3545;
  color: white;
}

.device-details {
  display: flex;
  gap: 12px;
  font-size: 14px;
  color: #666;
}

.unregister-button {
  padding: 4px 8px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.unregister-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.no-devices {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 24px;
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

.platform-stats,
.hourly-stats,
.error-breakdown {
  margin-top: 24px;
}

.platform-stats h5,
.hourly-stats h5,
.error-breakdown h5 {
  margin: 0 0 12px 0;
  color: #333;
}

.platform-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.platform-stat {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
}

.platform-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.platform-name {
  font-weight: bold;
  color: #333;
}

.platform-metrics {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.metric-label {
  color: #666;
}

.metric-value {
  font-weight: bold;
  color: #333;
}

.hourly-chart {
  display: flex;
  gap: 4px;
  height: 100px;
  align-items: end;
}

.hour-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.hour-label {
  font-size: 12px;
  color: #666;
  transform: rotate(-45deg);
  white-space: nowrap;
}

.hour-values {
  flex: 1;
  display: flex;
  width: 100%;
  position: relative;
}

.sent-bar {
  background: #28a745;
  width: 100%;
  border-radius: 2px 2px 0 0;
}

.delivered-bar {
  background: #007bff;
  width: 100%;
  border-radius: 2px 2px 0 0;
}

.failed-bar {
  background: #dc3545;
  width: 100%;
  border-radius: 2px 2px 0 0;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.error-type {
  color: #333;
}

.error-count {
  font-weight: bold;
  color: #dc3545;
}

@media (max-width: 768px) {
  .config-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .config-tabs {
    width: 100%;
    justify-content: flex-start;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .platform-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
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

#!/usr/bin/env ts-node
/**
 * Alert Status Script
 * 
 * Shows current alert status, active alerts, and statistics.
 * 
 * Usage:
 *   npm run alerts:status
 *   npm run alerts:status -- --history
 */

import { getAlertManager, getPrometheusMetrics } from '../src/monitoring';
import { logger } from '../src/utils/logger';

async function main() {
  const args = process.argv.slice(2);
  const showHistory = args.includes('--history');
  const historyLimit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '20', 10);

  console.log('\n🚨 Alert Status');
  console.log('='.repeat(50));

  const alertManager = getAlertManager();
  const metrics = getPrometheusMetrics();

  // Update system metrics
  metrics.updateSystemMetrics();

  // Get statistics
  const stats = alertManager.getStatistics();

  console.log('\n📊 Statistics:');
  console.log(`   Active Alerts: ${stats.activeCount}`);
  console.log(`   Total Fired: ${stats.totalFired}`);
  console.log(`   Total Resolved: ${stats.totalResolved}`);
  console.log(`   Avg Resolution Time: ${(stats.avgResolutionTime / 1000 / 60).toFixed(1)} minutes`);

  // Show alerts by rule
  if (Object.keys(stats.alertsByRule).length > 0) {
    console.log('\n📋 Alerts by Rule:');
    for (const [rule, count] of Object.entries(stats.alertsByRule)) {
      console.log(`   ${rule}: ${count}`);
    }
  }

  // Show active alerts
  const activeAlerts = alertManager.getActiveAlerts();
  
  if (activeAlerts.length > 0) {
    console.log('\n🔴 Active Alerts:');
    for (const alert of activeAlerts) {
      const duration = Date.now() - alert.firedAt.getTime();
      const durationStr = formatDuration(duration);
      
      const severityIcon = {
        info: 'ℹ️',
        warning: '⚠️',
        critical: '🔴',
        emergency: '🚨',
      }[alert.severity];

      console.log(`\n   ${severityIcon} ${alert.name}`);
      console.log(`      Status: ${alert.status}`);
      console.log(`      Severity: ${alert.severity}`);
      console.log(`      Message: ${alert.message}`);
      console.log(`      Source: ${alert.source}`);
      console.log(`      Value: ${alert.value} (threshold: ${alert.threshold})`);
      console.log(`      Duration: ${durationStr}`);
      
      if (alert.acknowledgedAt) {
        console.log(`      Acknowledged by: ${alert.acknowledgedBy} at ${alert.acknowledgedAt.toISOString()}`);
      }
    }
  } else {
    console.log('\n✅ No active alerts');
  }

  // Show alert history
  if (showHistory) {
    const history = alertManager.getAlertHistory(historyLimit);
    
    if (history.length > 0) {
      console.log(`\n📜 Recent Alert History (last ${history.length}):`);
      
      for (const alert of history.slice().reverse()) {
        const status = alert.resolvedAt ? '✅' : '🔴';
        const time = alert.firedAt.toISOString().split('T')[1].split('.')[0];
        console.log(`   ${status} [${time}] ${alert.name} - ${alert.severity}`);
      }
    } else {
      console.log('\n📜 No alert history');
    }
  }

  // Show configured rules
  const rules = alertManager.exportRules();
  console.log(`\n📋 Configured Rules: ${rules.length}`);
  
  const enabledRules = rules.filter(r => r.enabled);
  const disabledRules = rules.filter(r => !r.enabled);
  
  console.log(`   Enabled: ${enabledRules.length}`);
  console.log(`   Disabled: ${disabledRules.length}`);

  if (args.includes('--rules')) {
    console.log('\n   Enabled Rules:');
    for (const rule of enabledRules) {
      console.log(`     - ${rule.name} (${rule.severity})`);
    }
  }

  // Show key metrics
  console.log('\n📈 Key Metrics:');
  
  const cacheHitRatio = metrics.getValue('cache_hit_ratio') ?? 0;
  const efficiencyMultiplier = metrics.getValue('efficiency_multiplier') ?? 0;
  const uptime = metrics.getValue('uptime_seconds') ?? 0;

  console.log(`   Cache Hit Ratio: ${(cacheHitRatio * 100).toFixed(1)}%`);
  console.log(`   Efficiency Multiplier: ${efficiencyMultiplier.toFixed(1)}x`);
  console.log(`   Uptime: ${formatDuration(uptime * 1000)}`);

  console.log('\n✅ Status check complete');
  process.exit(0);
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

main().catch(error => {
  logger.error('Alert status check failed', { error });
  process.exit(1);
});


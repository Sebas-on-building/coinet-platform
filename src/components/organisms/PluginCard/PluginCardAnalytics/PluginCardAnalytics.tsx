import React from 'react';
import styles from './PluginCardAnalytics.module.css';
import PluginCardAnalyticsSparkline from './PluginCardAnalyticsSparkline';

const PluginCardAnalytics: React.FC<{ plugin: any }> = ({ plugin }) => {
  // Mock analytics data
  const stats = plugin.analytics || {
    installs: 1240,
    activeUsers: 320,
    performance: '+12.4%',
    sparkline: [10, 12, 15, 14, 18, 20, 22, 25, 23, 28],
  };
  return (
    <div className={styles.root}>
      <div className={styles.stats}>
        <span className={styles.stat}><strong>{stats.installs}</strong> installs</span>
        <span className={styles.stat}><strong>{stats.activeUsers}</strong> active users</span>
        <span className={styles.stat}><strong>{stats.performance}</strong> perf</span>
      </div>
      <div className={styles.sparkline} aria-label="Usage trend">
        <PluginCardAnalyticsSparkline data={stats.sparkline} color="#6366f1" animate />
      </div>
    </div>
  );
};

export default PluginCardAnalytics; 
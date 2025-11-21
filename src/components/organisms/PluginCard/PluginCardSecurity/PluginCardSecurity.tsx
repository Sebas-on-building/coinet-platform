import React from 'react';
import styles from './PluginCardSecurity.module.css';

const PluginCardSecurity: React.FC<{ plugin: any }> = ({ plugin }) => {
  // Mock security data
  const security = plugin.security || {
    status: 'Audited',
    badge: '✅',
    lastAudit: '2024-05-15',
    score: 98,
  };
  return (
    <div className={styles.root}>
      <span className={styles.badge} title={security.status}>{security.badge}</span>
      <span className={styles.status}>{security.status}</span>
      <span className={styles.score}>Score: <strong>{security.score}</strong></span>
      <span className={styles.auditDate}>Last audit: {security.lastAudit}</span>
    </div>
  );
};

export default PluginCardSecurity; 
import React from 'react';
import styles from './PluginCardMeta.module.css';

const PluginCardMeta: React.FC<{ plugin: any }> = ({ plugin }) => (
  <div className={styles.root}>
    <div className={styles.header}>
      <span className={styles.name}>{plugin.name}</span>
      <span className={styles.version}>v{plugin.version}</span>
    </div>
    <div className={styles.author}>by {plugin.author}</div>
    <div className={styles.description}>{plugin.description}</div>
  </div>
);

export default PluginCardMeta; 
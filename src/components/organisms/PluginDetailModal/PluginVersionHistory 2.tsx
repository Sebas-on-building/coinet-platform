import styles from './PluginVersionHistory.module.css';

export function PluginVersionHistory({ plugin }) {
  return (
    <div className={styles.versions}>
      {plugin.versions && plugin.versions.length > 0 ? (
        <ul className={styles.timeline}>
          {plugin.versions.map((v, i) => (
            <li key={i} className={styles.version}>
              <span className={styles.number}>{v.number}</span>
              <span className={styles.date}>{v.date}</span>
              <span className={styles.notes}>{v.notes}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>No version history available.</div>
      )}
    </div>
  );
} 
import styles from './PluginSecurityReport.module.css';

export function PluginSecurityReport({ plugin }) {
  return (
    <div className={styles.security}>
      <div className={styles.status}>
        <span className={plugin.audited ? styles.audited : styles.notAudited}>
          {plugin.audited ? 'Audited' : 'Not Audited'}
        </span>
        {plugin.auditDate && (
          <span className={styles.date}>Audit: {plugin.auditDate}</span>
        )}
      </div>
      <div className={styles.report}>{plugin.securityReport || 'No security report available.'}</div>
    </div>
  );
} 
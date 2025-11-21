import ReactMarkdown from 'react-markdown';
import styles from './PluginChangelog.module.css';

export function PluginChangelog({ plugin }) {
  return (
    <div className={styles.changelog}>
      <ReactMarkdown>{plugin.changelog || 'No changelog available.'}</ReactMarkdown>
    </div>
  );
} 
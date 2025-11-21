import ReactMarkdown from 'react-markdown';
import styles from './PluginReadme.module.css';

export function PluginReadme({ plugin }) {
  return (
    <div className={styles.readme}>
      <ReactMarkdown>{plugin.readme || 'No README available.'}</ReactMarkdown>
    </div>
  );
} 
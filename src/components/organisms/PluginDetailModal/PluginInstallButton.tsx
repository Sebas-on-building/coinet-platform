import { useState } from 'react';
import { RippleButton } from '../../ui/Button/RippleButton';
import styles from './PluginInstallButton.module.css';

export function PluginInstallButton({ plugin }) {
  const [installed, setInstalled] = useState(plugin.installed);
  return (
    <RippleButton
      className={installed ? styles.installed : styles.install}
      onClick={() => setInstalled((v) => !v)}
    >
      {installed ? 'Uninstall' : 'Install'}
    </RippleButton>
  );
} 
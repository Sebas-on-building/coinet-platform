import React, { useState, useEffect } from 'react';
import styles from './PluginAISuggestions.module.css';

const allSuggestions = [
  'AI Trading Bot',
  'Portfolio Tracker',
  'Security Scanner',
  'DeFi Yield Optimizer',
  'NFT Portfolio',
  'Onchain Analytics',
  'Market Sentiment AI',
  'Plugin Builder',
  'Live Demo Widget',
];

interface Props {
  onSelect: (s: string) => void;
  search?: string;
}

const PluginAISuggestions: React.FC<Props> = ({ onSelect, search = '' }) => {
  const [active, setActive] = useState(0);
  const suggestions = allSuggestions.filter(s => s.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => { setActive(0); }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') setActive(a => Math.min(a + 1, suggestions.length - 1));
    if (e.key === 'ArrowUp') setActive(a => Math.max(a - 1, 0));
    if (e.key === 'Enter') onSelect(suggestions[active]);
  };

  return (
    <ul className={styles.root} role="listbox" aria-label="AI suggestions" tabIndex={0} onKeyDown={handleKeyDown}>
      {suggestions.map((s, i) => (
        <li
          key={i}
          className={active === i ? styles.active : styles.suggestion}
          role="option"
          tabIndex={-1}
          aria-selected={active === i}
          onClick={() => onSelect(s)}
          onMouseEnter={() => setActive(i)}
        >
          {search ? <><b>{s.slice(0, search.length)}</b>{s.slice(search.length)}</> : s}
        </li>
      ))}
    </ul>
  );
};

export default PluginAISuggestions; 
import React, { useContext, useState, useRef } from 'react';
import { PluginListContext } from '../../organisms/PluginList/PluginList';
import { Input } from '../../ui/Input';
import PluginAISuggestions from './PluginAISuggestions';
import styles from './PluginSearchBar.module.css';

const PluginSearchBar: React.FC = () => {
  const { search, setSearch } = useContext(PluginListContext) as any;
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleSelectSuggestion = (s: string) => {
    setSearch(s);
    setFocused(false);
  };

  return (
    <div className={styles.root} ref={ref} style={{ position: 'relative' }}>
      <Input
        aria-label="Search plugins"
        placeholder="Search plugins, authors, tags, AI..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className={styles.input}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {focused && search && (
        <PluginAISuggestions onSelect={handleSelectSuggestion} search={search} />
      )}
    </div>
  );
};

export default PluginSearchBar; 
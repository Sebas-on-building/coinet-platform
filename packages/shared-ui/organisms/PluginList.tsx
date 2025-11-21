import React, { useState, useMemo, useCallback } from 'react';
import { PluginCard, PluginCardProps } from '../molecules/PluginCard';
import tokens from 'src/design-system/tokens';

export interface PluginListProps {
  plugins: PluginCardProps[];
  theme?: 'light' | 'dark';
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  sortOptions?: { label: string; value: string }[];
  onSortChange?: (value: string) => void;
}

export const PluginList: React.FC<PluginListProps> = ({
  plugins,
  theme = 'light',
  searchPlaceholder = 'Search plugins…',
  filters,
  sortOptions = [],
  onSortChange,
}) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(sortOptions[0]?.value || '');

  const filtered = useMemo(() =>
    plugins.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase())
    ), [plugins, search]
  );

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    // Example: sort by rating, name, etc.
    if (sort === 'rating') return [...filtered].sort((a, b) => b.rating - a.rating);
    if (sort === 'name') return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  }, [filtered, sort]);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSort(e.target.value);
    onSortChange?.(e.target.value);
  }, [onSortChange]);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.sm }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          style={{
            flex: 1,
            padding: tokens.spacing.sm,
            borderRadius: tokens.radius.sm,
            border: `1px solid ${tokens.colors.border[theme]}`,
            fontSize: tokens.typography.fontSize.base,
            background: tokens.colors.surface[theme],
            color: tokens.colors.text[theme],
            outline: 'none',
          }}
          aria-label="Search plugins"
        />
        {sortOptions.length > 0 && (
          <select
            value={sort}
            onChange={handleSortChange}
            style={{
              padding: tokens.spacing.xs,
              borderRadius: tokens.radius.sm,
              border: `1px solid ${tokens.colors.border[theme]}`,
              fontSize: tokens.typography.fontSize.base,
              background: tokens.colors.surface[theme],
              color: tokens.colors.text[theme],
              outline: 'none',
            }}
            aria-label="Sort plugins"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        {filters}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: tokens.spacing.md,
        }}
        role="list"
        aria-label="Plugin list"
      >
        {sorted.map((plugin, i) => (
          <PluginCard key={plugin.name + plugin.author} {...plugin} tabIndex={0} />
        ))}
      </div>
    </div>
  );
}; 
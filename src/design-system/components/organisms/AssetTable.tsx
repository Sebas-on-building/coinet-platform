import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AssetRow } from '../molecules/AssetRow';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import clsx from 'clsx';

export interface AssetTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

export interface AssetTableRow {
  icon: string;
  name: string;
  price: number | string;
  change: number;
  [key: string]: any;
}

export interface AssetTableProps {
  data: AssetTableRow[];
  columns: AssetTableColumn[];
  sortKey?: keyof AssetTableRow;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: keyof AssetTableRow) => void;
  filter?: string;
  onFilter?: (v: string) => void;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
  selectableRows?: boolean;
  selectedRows?: string[];
  onRowSelect?: (name: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  bulkActions?: React.ReactNode;
  virtualized?: boolean;
  ariaLabel?: string;
}

export const AssetTable: React.FC<AssetTableProps> = ({
  data,
  columns,
  sortKey,
  sortDirection = 'asc',
  onSort,
  filter = '',
  onFilter,
  page = 1,
  pageSize = 10,
  onPageChange,
  loading = false,
  className,
  style,
  selectableRows = false,
  selectedRows = [],
  onRowSelect,
  onSelectAll,
  bulkActions,
  virtualized = true,
  ariaLabel,
}) => {
  // Filtering
  const [internalFilter, setInternalFilter] = useState(filter);
  useEffect(() => { setInternalFilter(filter); }, [filter]);
  const handleFilterChange = (v: string) => {
    setInternalFilter(v);
    onFilter && onFilter(v);
  };
  // Sorting
  const sorted = React.useMemo(() => {
    let arr = data;
    if (internalFilter) {
      arr = arr.filter(row => row.name.toLowerCase().includes(internalFilter.toLowerCase()));
    }
    if (onSort && sortKey) {
      arr = [...arr].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return arr;
  }, [data, internalFilter, onSort, sortKey, sortDirection]);
  // Pagination
  const total = sorted.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paged = sorted.slice(start, end);
  // Virtualization (simple, for demo)
  const tableRef = useRef<HTMLDivElement>(null);
  // Keyboard navigation
  const [focusedRow, setFocusedRow] = useState<number | null>(null);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') setFocusedRow(r => (r === null ? 0 : Math.min(r + 1, paged.length - 1)));
    if (e.key === 'ArrowUp') setFocusedRow(r => (r === null ? 0 : Math.max(r - 1, 0)));
    if (e.key === 'Home') setFocusedRow(0);
    if (e.key === 'End') setFocusedRow(paged.length - 1);
  }, [paged.length]);
  useEffect(() => {
    if (focusedRow !== null && tableRef.current) {
      const row = tableRef.current.querySelectorAll('.co-assetrow')[focusedRow] as HTMLElement;
      row?.focus();
    }
  }, [focusedRow]);
  // Row selection
  const allSelected = paged.every(row => selectedRows.includes(row.name));
  // Render
  return (
    <div
      className={clsx('co-assettable', className)}
      style={style}
      ref={tableRef}
      role="table"
      aria-label={ariaLabel || 'Asset table'}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="co-assettable-toolbar">
        <Input
          type="search"
          value={internalFilter}
          onChange={e => handleFilterChange(e.target.value)}
          placeholder="Filter assets..."
          className="co-assettable-filter"
          aria-label="Filter assets"
        />
        {bulkActions && selectableRows && selectedRows.length > 0 && (
          <div className="co-assettable-bulkactions">{bulkActions}</div>
        )}
      </div>
      <div className="co-assettable-header" role="rowgroup">
        {selectableRows && (
          <div className="co-assettable-headercell co-assettable-headercell-checkbox">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={e => onSelectAll && onSelectAll(e.target.checked)}
              aria-label="Select all rows"
            />
          </div>
        )}
        {columns.map(col => (
          <div
            key={col.key}
            className={clsx('co-assettable-headercell', col.sortable && 'co-assettable-headercell-sortable', sortKey === col.key && 'co-assettable-headercell-active')}
            role="columnheader"
            tabIndex={0}
            aria-sort={sortKey === col.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
            onClick={() => col.sortable && onSort && onSort(col.key)}
          >
            {col.label}
            {col.sortable && <span className="co-assettable-sorticon">{sortKey === col.key ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}</span>}
          </div>
        ))}
      </div>
      <div className="co-assettable-body" role="rowgroup">
        {loading
          ? Array.from({ length: pageSize }).map((_, i) => <AssetRow key={i} icon="" name="" price={0} change={0} loading />)
          : paged.map((row, i) => (
            <div key={row.name + i} className="co-assettable-rowwrap">
              {selectableRows && (
                <input
                  type="checkbox"
                  checked={selectedRows.includes(row.name)}
                  onChange={e => onRowSelect && onRowSelect(row.name, e.target.checked)}
                  aria-label={`Select row for ${row.name}`}
                  className="co-assettable-rowcheckbox"
                />
              )}
              <AssetRow
                {...row}
                selected={selectableRows && selectedRows.includes(row.name)}
                tabIndex={i === focusedRow ? 0 : -1}
                onClick={() => setFocusedRow(i)}
              />
            </div>
          ))}
      </div>
      <div className="co-assettable-footer">
        <span className="co-assettable-count">{total} assets</span>
        {onPageChange && (
          <div className="co-assettable-pagination">
            <Button onClick={() => onPageChange(page - 1)} disabled={page === 1} size="sm">Prev</Button>
            <span>{page}</span>
            <Button onClick={() => onPageChange(page + 1)} disabled={end >= total} size="sm">Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}; 
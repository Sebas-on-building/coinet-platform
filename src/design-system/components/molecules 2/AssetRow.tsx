import React from 'react';
import { Icon } from '../atoms/Icon';
import { Text } from '../atoms/Text';
import clsx from 'clsx';

export interface AssetRowProps {
  icon: string;
  name: string;
  price: number | string;
  change: number;
  selected?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const AssetRow: React.FC<AssetRowProps> = ({
  icon,
  name,
  price,
  change,
  selected = false,
  loading = false,
  onClick,
  className,
  style,
}) => {
  // Animate price change (flash color)
  const [flash, setFlash] = React.useState(false);
  const prevPrice = React.useRef(price);
  React.useEffect(() => {
    if (prevPrice.current !== price) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      prevPrice.current = price;
      return () => clearTimeout(t);
    }
  }, [price]);
  // Skeleton loading
  if (loading) {
    return (
      <div className={clsx('co-assetrow', 'co-assetrow-loading', className)} style={style}>
        <div className="co-assetrow-skeleton-icon" />
        <div className="co-assetrow-skeleton-name" />
        <div className="co-assetrow-skeleton-price" />
        <div className="co-assetrow-skeleton-badge" />
      </div>
    );
  }
  return (
    <div
      className={clsx('co-assetrow', selected && 'co-assetrow-selected', flash && 'co-assetrow-flash', className)}
      style={style}
      tabIndex={0}
      role="row"
      aria-selected={selected}
      onClick={onClick}
      title={name}
    >
      <Icon name={icon} size="md" className="co-assetrow-icon" />
      <Text variant="body" weight="medium" className="co-assetrow-name" truncate>{name}</Text>
      <Text variant="mono" weight="bold" className="co-assetrow-price">{price}</Text>
      <span className={clsx('co-assetrow-badge', change > 0 ? 'co-assetrow-badge-up' : change < 0 ? 'co-assetrow-badge-down' : 'co-assetrow-badge-neutral')}>
        {change > 0 ? '+' : ''}{change}%
      </span>
    </div>
  );
}; 
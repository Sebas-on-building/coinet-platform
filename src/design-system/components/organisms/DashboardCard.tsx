import React, { useRef, useEffect, useState } from 'react';
import { Text } from '../atoms/Text';
import { Icon } from '../atoms/Icon';
import { Button } from '../atoms/Button';
import clsx from 'clsx';

export interface DashboardCardProps {
  title: string;
  value: number | string;
  valuePrefix?: string;
  valueSuffix?: string;
  valueDecimals?: number;
  sparkline?: number[];
  badge?: string;
  badgeStatus?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  menu?: React.ReactNode;
  menuDropdown?: React.ReactNode;
  loading?: boolean;
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  valuePrefix = '',
  valueSuffix = '',
  valueDecimals = 2,
  sparkline,
  badge,
  badgeStatus = 'neutral',
  menu,
  menuDropdown,
  loading = false,
  responsive = true,
  className,
  style,
  ariaLabel,
}) => {
  // Animate value change
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);
  useEffect(() => {
    if (typeof value === 'number' && typeof prevValue.current === 'number' && value !== prevValue.current) {
      let frame: number;
      let start = prevValue.current;
      let end = value;
      let startTime: number | null = null;
      const duration = 500;
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        setDisplayValue(Number((start + (end - start) * progress).toFixed(valueDecimals)));
        if (progress < 1) {
          frame = requestAnimationFrame(animate);
        } else {
          setDisplayValue(end);
        }
      };
      frame = requestAnimationFrame(animate);
      prevValue.current = value;
      return () => cancelAnimationFrame(frame);
    } else {
      setDisplayValue(value);
      prevValue.current = value;
    }
  }, [value, valueDecimals]);
  // Skeleton loading
  if (loading) {
    return (
      <div className={clsx('co-dashboardcard', 'co-dashboardcard-loading', responsive && 'co-dashboardcard-responsive', className)} style={style} aria-label={ariaLabel}>
        <div className="co-dashboardcard-skeleton-title" />
        <div className="co-dashboardcard-skeleton-value" />
        <div className="co-dashboardcard-skeleton-sparkline" />
      </div>
    );
  }
  // Badge color
  const badgeClass = badgeStatus ? `co-dashboardcard-badge-${badgeStatus}` : 'co-dashboardcard-badge-neutral';
  // Sparkline tooltip
  const [sparklineHover, setSparklineHover] = useState<number | null>(null);
  return (
    <div
      className={clsx('co-dashboardcard', responsive && 'co-dashboardcard-responsive', className)}
      style={style}
      tabIndex={0}
      role="region"
      aria-label={ariaLabel || title}
    >
      <div className="co-dashboardcard-header">
        <Text variant="subtitle" weight="bold" className="co-dashboardcard-title">{title}</Text>
        {badge && <span className={clsx('co-dashboardcard-badge', badgeClass)}>{badge}</span>}
        {menu && (
          <div className="co-dashboardcard-menu" tabIndex={0} role="button" aria-haspopup="true">
            {menu}
            {menuDropdown && <div className="co-dashboardcard-menudropdown">{menuDropdown}</div>}
          </div>
        )}
      </div>
      <div className="co-dashboardcard-value">
        {valuePrefix}
        <span className="co-dashboardcard-value-anim">{displayValue}</span>
        {valueSuffix}
      </div>
      {sparkline && (
        <div className="co-dashboardcard-sparkline-wrap">
          <svg
            className="co-dashboardcard-sparkline"
            width={responsive ? '100%' : 120}
            height={32}
            viewBox={`0 0 ${sparkline.length > 1 ? 120 : 0} 32`}
            onMouseMove={e => {
              const rect = (e.target as SVGSVGElement).getBoundingClientRect();
              const x = e.clientX - rect.left;
              const idx = Math.round((x / 120) * (sparkline.length - 1));
              setSparklineHover(idx);
            }}
            onMouseLeave={() => setSparklineHover(null)}
          >
            <defs>
              <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00ffa3" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0057ff" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              stroke="url(#sparkline-gradient)"
              strokeWidth={2}
              points={sparkline.map((y, i) => `${(i / (sparkline.length - 1)) * 120},${32 - y * 32}`).join(' ')}
            />
            {sparklineHover !== null && sparkline[sparklineHover] !== undefined && (
              <>
                <circle
                  cx={(sparklineHover / (sparkline.length - 1)) * 120}
                  cy={32 - sparkline[sparklineHover] * 32}
                  r={4}
                  fill="#00ffa3"
                  stroke="#fff"
                  strokeWidth={2}
                />
                <text
                  x={(sparklineHover / (sparkline.length - 1)) * 120}
                  y={32 - sparkline[sparklineHover] * 32 - 8}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#0057ff"
                  fontWeight={700}
                >
                  {sparkline[sparklineHover].toFixed(2)}
                </text>
              </>
            )}
          </svg>
        </div>
      )}
    </div>
  );
}; 
import React, { useEffect, useRef } from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  animate?: boolean;
}

const PluginCardAnalyticsSparkline: React.FC<SparklineProps> = ({ data, color = '#6366f1', width = 80, height = 24, animate = true }) => {
  const ref = useRef<SVGPolylineElement>(null);
  const points = data.map((v, i) => `${(i * width) / (data.length - 1)},${height - v}`).join(' ');

  useEffect(() => {
    if (!animate || !ref.current) return;
    let frame = 0;
    const totalFrames = 30;
    const initial = data.map(() => height);
    function animateSparkline() {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);
      const animatedPoints = data.map((v, i) => {
        const y = height - (height - v) * progress;
        return `${(i * width) / (data.length - 1)},${y}`;
      }).join(' ');
      if (ref.current) ref.current.setAttribute('points', animatedPoints);
      if (progress < 1) requestAnimationFrame(animateSparkline);
    }
    animateSparkline();
    // eslint-disable-next-line
  }, [data, animate, height, width]);

  return (
    <svg width={width} height={height} aria-label="Plugin usage trend sparkline" role="img" style={{ display: 'block' }}>
      <polyline
        ref={ref}
        fill="none"
        stroke={color}
        strokeWidth={2}
        points={animate ? data.map(() => `${0},${height}`).join(' ') : points}
        aria-hidden="true"
      />
    </svg>
  );
};

export default PluginCardAnalyticsSparkline; 
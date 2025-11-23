import React from 'react';

export type LoadingSpinnerProps = React.HTMLAttributes<HTMLDivElement> & {
  size?: number;
};

export function LoadingSpinner({ size = 24, className = '', ...rest }: LoadingSpinnerProps) {
  const style = { width: size, height: size } as React.CSSProperties;
  return (
    <div className={`inline-block animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 ${className}`.trim()} style={style} {...rest} />
  );
}



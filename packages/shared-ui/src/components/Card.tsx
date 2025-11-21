import React from 'react';

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  header?: React.ReactNode;
  footer?: React.ReactNode;
};

export function Card({ header, footer, className = '', children, ...rest }: CardProps) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`.trim()} {...rest}>
      {header ? <div className="border-b border-gray-200 p-4 text-sm font-medium text-gray-900">{header}</div> : null}
      <div className="p-4">{children}</div>
      {footer ? <div className="border-t border-gray-200 p-4 text-sm text-gray-600">{footer}</div> : null}
    </div>
  );
}



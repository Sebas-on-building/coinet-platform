import React, { ReactNode } from 'react';
import './GridLayout.css';

interface GridLayoutProps {
  children: ReactNode;
}

export const GridLayout = ({ children }: GridLayoutProps) => (
  <div className="grid-layout">{children}</div>
); 
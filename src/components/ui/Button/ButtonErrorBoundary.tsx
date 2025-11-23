/// <reference types="react" />

/**
 * Atomic ButtonErrorBoundary for Coinet
 * Error boundary for Button (fallback, ARIA, etc.)
 * Extensible, accessible, and beautiful
 */
import React from 'react';

export interface ButtonErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ButtonErrorBoundaryState {
  hasError: boolean;
}

export class ButtonErrorBoundary extends React.Component<ButtonErrorBoundaryProps, ButtonErrorBoundaryState> {
  constructor(props: ButtonErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
    // TODO: Log error to analytics/compliance
    // eslint-disable-next-line no-console
    console.error('ButtonErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div role="alert" style={{ color: 'var(--color-error)', padding: 8, borderRadius: 8, background: 'var(--color-surface)' }}>Something went wrong.</div>;
    }
    return this.props.children;
  }
} 
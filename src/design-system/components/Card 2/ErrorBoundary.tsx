import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, info: { componentStack: string }) => void;
  fallback?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface ErrorBoundaryState {
  error: Error | null;
  info: { componentStack: string } | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, info: null };

  static getDerivedStateFromError(error: Error) {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    this.setState({ error, info });
    this.props.onError?.(error, info);
  }

  handleReset = () => {
    this.setState({ error: null, info: null });
  };

  render() {
    const { error, info } = this.state;
    const { children, fallback, className, style } = this.props;
    if (error) {
      return (
        <section
          className={["co-card-error-boundary", className].filter(Boolean).join(' ')}
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-lg)',
            padding: 32,
            color: 'var(--color-accent-red)',
            textAlign: 'center',
            ...style,
          }}
          aria-label="Error boundary"
        >
          <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 12 }}>Something went wrong</h2>
          {fallback || (
            <>
              <div style={{ marginBottom: 8 }}>{error.message}</div>
              {info?.componentStack && (
                <pre style={{ color: 'var(--color-text-secondary)', fontSize: 13, textAlign: 'left', margin: '0 auto', maxWidth: 360, overflowX: 'auto' }}>{info.componentStack}</pre>
              )}
              <button
                onClick={this.handleReset}
                style={{ marginTop: 16, background: 'var(--color-accent-blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 16 }}
                aria-label="Reset error boundary"
              >
                Try Again
              </button>
            </>
          )}
        </section>
      );
    }
    return children;
  }
} 
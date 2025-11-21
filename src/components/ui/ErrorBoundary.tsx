import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import * as Sentry from '@sentry/nextjs';
import { ModalComponent } from './Modal';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error);
    // TODO: Add errorInfo as context if Sentry supports it in the future
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ModalComponent open={true} onClose={() => window.location.reload()} title="Something went wrong" size="md" closeButton overlay animation="scale">
          <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </div>
          <div style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
            Please try refreshing the page or contact support if the issue persists.
          </div>
          <button onClick={() => window.location.reload()} style={{ background: '#0A84FF', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Reload</button>
        </ModalComponent>
      );
    }

    return this.props.children;
  }
}

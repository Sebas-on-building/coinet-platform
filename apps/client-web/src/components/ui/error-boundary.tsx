import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, Bug, Copy, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showReportButton?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null,
      copied: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    
    // Log to external service if available
    if (typeof window !== 'undefined' && (window as any).errorReporter) {
      (window as any).errorReporter.report({
        error,
        errorInfo,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && this.props.resetKeys) {
      const prevKeys = prevProps.resetKeys || [];
      const currentKeys = this.props.resetKeys;
      
      if (prevKeys.length !== currentKeys.length || 
          prevKeys.some((key, i) => key !== currentKeys[i])) {
        this.handleRetry();
      }
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null,
      copied: false 
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleCopyError = () => {
    const errorDetails = `
Error ID: ${this.state.errorId}
Timestamp: ${new Date().toISOString()}
Error: ${this.state.error?.message}
Stack: ${this.state.error?.stack}
Component Stack: ${this.state.errorInfo?.componentStack}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim();

    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  handleReportError = () => {
    // Open feedback form or support page
    console.log('Report error:', this.state.errorId);
    // In production, this would open a support form
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          className="min-h-screen flex items-center justify-center p-6 bg-background"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-lg w-full text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-destructive/10 rounded-3xl blur-2xl" />
              <div className="relative w-20 h-20 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto border border-destructive/20">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="coinet-heading-3">Something went wrong</h1>
                <p className="coinet-body text-muted-foreground">
                  We encountered an unexpected error. This has been logged and our team will investigate.
                </p>
              </div>

              {this.state.errorId && (
                <div className="bg-muted/30 rounded-lg p-3 text-sm font-mono">
                  <span className="text-muted-foreground">Error ID: </span>
                  <span className="text-foreground">{this.state.errorId}</span>
                </div>
              )}
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left bg-muted/50 p-4 rounded-lg text-sm">
                  <summary className="cursor-pointer text-destructive font-medium mb-3 flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    Error Details (Development Only)
                  </summary>
                  <div className="space-y-3 text-foreground/80 font-mono text-xs">
                    <div>
                      <div className="font-semibold text-foreground mb-1">Error:</div>
                      <div className="bg-background/50 p-2 rounded border border-border">
                        {this.state.error.message}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground mb-1">Stack Trace:</div>
                      <pre className="bg-background/50 p-2 rounded border border-border overflow-x-auto whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                        {this.state.error.stack}
                      </pre>
                    </div>
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <div className="font-semibold text-foreground mb-1">Component Stack:</div>
                        <pre className="bg-background/50 p-2 rounded border border-border overflow-x-auto whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleRetry}
                  variant="default"
                  className="min-w-[130px]"
                  aria-label="Try again"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="min-w-[130px]"
                  aria-label="Go to home page"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  onClick={this.handleCopyError}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  aria-label="Copy error details"
                >
                  {this.state.copied ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-2" />
                      Copy Error Details
                    </>
                  )}
                </Button>

                {this.props.showReportButton && (
                  <Button
                    onClick={this.handleReportError}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    aria-label="Report this error"
                  >
                    <Bug className="w-3 h-3 mr-2" />
                    Report Issue
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Caught error:', error, errorInfo);
    // Here you could integrate with error reporting services
    // like Sentry, LogRocket, etc.
  };
}

// Simple error fallback component
export function ErrorFallback({ 
  error, 
  resetError 
}: { 
  error: Error; 
  resetError: () => void 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
      <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-destructive" />
      </div>
      
      <div className="space-y-2">
        <h3 className="font-semibold text-foreground">Oops! Something broke</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error.message || 'An unexpected error occurred'}
        </p>
      </div>
      
      <Button onClick={resetError} size="sm">
        <RefreshCw className="w-4 h-4 mr-2" />
        Try again
      </Button>
    </div>
  );
}
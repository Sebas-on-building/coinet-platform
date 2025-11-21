import { ComponentType, Suspense, ReactNode } from 'react';
import { CardSkeleton, ChartSkeleton, ListSkeleton, DashboardSkeleton } from './loading-skeleton';
import { ErrorBoundary } from './error-boundary';

interface SuspenseLoaderProps {
  children: ReactNode;
  fallback?: 'card' | 'chart' | 'list' | 'dashboard' | ReactNode;
  className?: string;
}

const fallbackComponents = {
  card: <CardSkeleton />,
  chart: <ChartSkeleton />,
  list: <ListSkeleton count={5} />,
  dashboard: <DashboardSkeleton />
};

/**
 * Universal Suspense loader with built-in error boundary
 * Provides consistent loading states across the app
 */
export function SuspenseLoader({ 
  children, 
  fallback = 'card',
  className 
}: SuspenseLoaderProps) {
  const loadingComponent = typeof fallback === 'string' 
    ? fallbackComponents[fallback] 
    : fallback;

  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className={className}>
          {loadingComponent}
        </div>
      }>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * HOC for wrapping lazy-loaded components with loading states
 */
export function withSuspenseLoader<P extends object>(
  Component: ComponentType<P>,
  fallbackType: 'card' | 'chart' | 'list' | 'dashboard' = 'card'
) {
  return function SuspenseWrappedComponent(props: P) {
    return (
      <SuspenseLoader fallback={fallbackType}>
        <Component {...props} />
      </SuspenseLoader>
    );
  };
}

/**
 * Loading overlay for inline loading states
 */
export function LoadingOverlay({ 
  isLoading, 
  children,
  fallback = 'card'
}: {
  isLoading: boolean;
  children: ReactNode;
  fallback?: 'card' | 'chart' | 'list' | 'dashboard';
}) {
  if (isLoading) {
    return <>{fallbackComponents[fallback]}</>;
  }
  return <>{children}</>;
}
import { Suspense, ComponentType, ReactNode } from "react"
import { LoadingSkeleton, ChartSkeleton, CardSkeleton } from "./loading-skeleton"
import { ErrorBoundary } from "./error-boundary"
import { cn } from "@/lib/utils"

interface LazyLoadWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  className?: string
  errorFallback?: ReactNode
}

export function LazyLoadWrapper({ 
  children, 
  fallback, 
  className,
  errorFallback 
}: LazyLoadWrapperProps) {
  return (
    <ErrorBoundary
      fallback={errorFallback || (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Failed to load component</p>
        </div>
      )}
    >
      <Suspense 
        fallback={
          fallback || (
            <div className={cn("animate-fade-in", className)}>
              <CardSkeleton />
            </div>
          )
        }
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

// Predefined wrappers for common scenarios
export function LazyChartWrapper({ children }: { children: ReactNode }) {
  return (
    <LazyLoadWrapper 
      fallback={<ChartSkeleton />}
      errorFallback={
        <div className="coinet-card p-8 text-center">
          <p className="text-muted-foreground">Failed to load chart</p>
        </div>
      }
    >
      {children}
    </LazyLoadWrapper>
  )
}

export function LazyPageWrapper({ children }: { children: ReactNode }) {
  return (
    <LazyLoadWrapper 
      fallback={
        <div className="space-y-4 p-6 animate-fade-in">
          <LoadingSkeleton variant="text" className="h-8 w-64" />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      }
    >
      {children}
    </LazyLoadWrapper>
  )
}

// HOC for lazy loading components
export function withLazyLoad<P extends object>(
  Component: ComponentType<P>,
  fallback?: ReactNode
) {
  return function LazyLoadedComponent(props: P) {
    return (
      <LazyLoadWrapper fallback={fallback}>
        <Component {...props} />
      </LazyLoadWrapper>
    )
  }
}

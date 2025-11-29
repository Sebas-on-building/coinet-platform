import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'chart' | 'text' | 'avatar' | 'button'
  className?: string
  count?: number
}

const skeletonVariants = {
  card: "h-32 w-full rounded-lg",
  list: "h-12 w-full rounded-md", 
  chart: "h-64 w-full rounded-lg",
  text: "h-4 w-3/4 rounded",
  avatar: "h-8 w-8 rounded-full",
  button: "h-10 w-24 rounded-md"
}

export function LoadingSkeleton({ 
  variant = 'card', 
  className,
  count = 1 
}: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i)
  
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => (
        <Skeleton 
          key={item}
          className={cn(skeletonVariants[variant])}
        />
      ))}
    </div>
  )
}

// Pre-composed loading states for common patterns
export function CardSkeleton() {
  return (
    <div className="coinet-card p-6">
      <div className="flex items-center space-x-4 mb-4">
        <LoadingSkeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton variant="text" className="h-4 w-1/2" />
          <LoadingSkeleton variant="text" className="h-3 w-1/4" />
        </div>
      </div>
      <LoadingSkeleton variant="text" count={2} />
    </div>
  )
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
          <LoadingSkeleton variant="avatar" />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton variant="text" className="h-4 w-3/4" />
            <LoadingSkeleton variant="text" className="h-3 w-1/2" />
          </div>
          <LoadingSkeleton variant="button" className="w-16 h-8" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="coinet-card p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <LoadingSkeleton variant="text" className="h-6 w-32" />
        <LoadingSkeleton variant="button" />
      </div>
      <LoadingSkeleton variant="chart" />
      <div className="flex justify-between mt-4">
        <LoadingSkeleton variant="text" className="h-4 w-16" />
        <LoadingSkeleton variant="text" className="h-4 w-20" />
        <LoadingSkeleton variant="text" className="h-4 w-16" />
      </div>
    </div>
  )
}

// Message skeleton for chat loading
export function MessageSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 animate-fade-in">
      <LoadingSkeleton variant="avatar" />
      <div className="flex-1 space-y-2">
        <LoadingSkeleton variant="text" className="h-4 w-3/4" />
        <LoadingSkeleton variant="text" className="h-4 w-full" />
        <LoadingSkeleton variant="text" className="h-4 w-2/3" />
      </div>
    </div>
  )
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <ChartSkeleton />
      <ListSkeleton count={3} />
    </div>
  )
}
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  illustration?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  illustration,
  className
}: EmptyStateProps) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center space-y-6",
        "min-h-[400px] animate-fade-in",
        className
      )}
      role="status"
      aria-label={title}
    >
      {illustration ? (
        <div className="w-48 h-48 mb-2">
          {illustration}
        </div>
      ) : Icon ? (
        <div className="relative mb-2">
          <div className="absolute inset-0 bg-primary/10 rounded-3xl blur-2xl animate-pulse-gentle" />
          <div className="relative w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center border border-primary/10 shadow-lg">
            <Icon className="w-10 h-10 text-primary" strokeWidth={1.5} />
          </div>
        </div>
      ) : null}
      
      <div className="space-y-3 max-w-md">
        <h3 className="coinet-heading-3 text-foreground">
          {title}
        </h3>
        <p className="coinet-body text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {action && (
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={action.onClick}
            variant={action.variant || 'default'}
            className="min-w-[140px]"
            aria-label={action.label}
          >
            {action.label}
          </Button>
          
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              className="min-w-[140px]"
              aria-label={secondaryAction.label}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Pre-composed empty states for common scenarios
export function NoAlertsEmptyState({ onCreateAlert }: { onCreateAlert: () => void }) {
  return (
    <EmptyState
      title="No alerts yet"
      description="Create your first alert to stay updated on important market movements and price changes."
      action={{
        label: "Create Alert",
        onClick: onCreateAlert
      }}
      secondaryAction={{
        label: "Learn More",
        onClick: () => console.log("Learn about alerts")
      }}
    />
  )
}

export function NoAgentsEmptyState({ onCreateAgent }: { onCreateAgent: () => void }) {
  return (
    <EmptyState
      title="No agents"
      description="Build intelligent agents to automate your trading analysis and monitor market conditions 24/7."
      action={{
        label: "Create Agent", 
        onClick: onCreateAgent
      }}
      secondaryAction={{
        label: "Browse Templates",
        onClick: () => console.log("Browse agent templates")
      }}
    />
  )
}

export function NoChatHistoryEmptyState({ onStartChat }: { onStartChat: () => void }) {
  return (
    <EmptyState
      title="No conversations yet"
      description="Start a conversation with Coinet AI to get market insights, analysis, and trading recommendations."
      action={{
        label: "Start Chatting",
        onClick: onStartChat
      }}
    />
  )
}

export function OfflineEmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      title="Connection lost"
      description="We're having trouble connecting to our servers. Check your internet connection and try again."
      action={{
        label: "Retry Connection",
        onClick: onRetry,
        variant: 'default'
      }}
      secondaryAction={{
        label: "View Cached Data", 
        onClick: () => console.log("Show cached data")
      }}
    />
  )
}
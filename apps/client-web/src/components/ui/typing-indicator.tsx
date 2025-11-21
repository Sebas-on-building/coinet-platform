import { cn } from "@/lib/utils"
import { Bot } from "lucide-react"

interface TypingIndicatorProps {
  className?: string
  size?: "sm" | "md" | "lg"
  variant?: "dots" | "pulse" | "wave"
  showAvatar?: boolean
}

export function TypingIndicator({ 
  className,
  size = "md",
  variant = "dots",
  showAvatar = true
}: TypingIndicatorProps) {
  const sizeClasses = {
    sm: "gap-1",
    md: "gap-1.5", 
    lg: "gap-2"
  }

  const dotSizeClasses = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5"
  }

  if (variant === "pulse") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        {showAvatar && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 rounded-2xl">
          <div className={cn(
            "rounded-full bg-primary animate-pulse-gentle",
            dotSizeClasses[size]
          )} />
          <span className="text-sm text-muted-foreground">AI is thinking...</span>
        </div>
      </div>
    )
  }

  if (variant === "wave") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        {showAvatar && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-gentle">
            <Bot className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className={cn(
          "flex items-center px-4 py-3 bg-muted/50 rounded-2xl",
          sizeClasses[size]
        )}>
          <div className={cn(
            "rounded-full bg-primary",
            dotSizeClasses[size],
            "animate-typing-dots-1"
          )} />
          <div className={cn(
            "rounded-full bg-primary",
            dotSizeClasses[size],
            "animate-typing-dots-2"
          )} />
          <div className={cn(
            "rounded-full bg-primary",
            dotSizeClasses[size],
            "animate-typing-dots-3"
          )} />
        </div>
      </div>
    )
  }

  // Default dots variant
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showAvatar && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
      )}
      <div className={cn(
        "flex items-center px-4 py-3 bg-muted/50 rounded-2xl backdrop-blur-sm border border-border/50",
        sizeClasses[size]
      )}>
        <div className={cn(
          "rounded-full bg-primary",
          dotSizeClasses[size],
          "animate-typing-dots-1"
        )} />
        <div className={cn(
          "rounded-full bg-primary",
          dotSizeClasses[size],
          "animate-typing-dots-2"
        )} />
        <div className={cn(
          "rounded-full bg-primary",
          dotSizeClasses[size],
          "animate-typing-dots-3"
        )} />
      </div>
    </div>
  )
}

// Compact version for tight spaces
export function CompactTypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-typing-dots-1" />
      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-typing-dots-2" />
      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-typing-dots-3" />
    </div>
  )
}
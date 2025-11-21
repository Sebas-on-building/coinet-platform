import { ReactNode, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface PageTransitionProps {
  children: ReactNode
  className?: string
  variant?: "fade" | "slide" | "scale" | "fade-slide"
  duration?: "fast" | "normal" | "slow"
}

export function PageTransition({ 
  children, 
  className,
  variant = "fade-slide",
  duration = "normal"
}: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const durationClasses = {
    fast: "duration-200",
    normal: "duration-300",
    slow: "duration-500"
  }

  const variantClasses = {
    fade: isVisible 
      ? "opacity-100" 
      : "opacity-0",
    slide: isVisible 
      ? "translate-x-0 opacity-100" 
      : "translate-x-4 opacity-0",
    scale: isVisible 
      ? "scale-100 opacity-100" 
      : "scale-95 opacity-0",
    "fade-slide": isVisible 
      ? "translate-y-0 opacity-100" 
      : "translate-y-2 opacity-0"
  }

  return (
    <div 
      className={cn(
        "transition-all ease-smooth",
        durationClasses[duration],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </div>
  )
}

// Stagger children animations
interface StaggerContainerProps {
  children: ReactNode[]
  className?: string
  staggerDelay?: number
}

export function StaggerContainer({ 
  children, 
  className,
  staggerDelay = 100 
}: StaggerContainerProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className="animate-fade-in"
          style={{ 
            animationDelay: `${index * staggerDelay}ms`,
            animationFillMode: 'both'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  hover?: "lift" | "glow" | "scale" | "none"
  interactive?: boolean
  onClick?: () => void
}

export function AnimatedCard({ 
  children, 
  className,
  hover = "lift",
  interactive = false,
  onClick 
}: AnimatedCardProps) {
  const hoverClasses = {
    lift: "hover:-translate-y-1 hover:shadow-xl",
    glow: "hover:shadow-glow hover:shadow-primary/20",
    scale: "hover:scale-[1.02]",
    none: ""
  }

  return (
    <div
      className={cn(
        "coinet-card transition-all duration-300 ease-smooth",
        interactive && "cursor-pointer active:scale-[0.98]",
        hover !== "none" && hoverClasses[hover],
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// Stacked cards with hover effect
interface CardStackProps {
  children: ReactNode[]
  className?: string
}

export function CardStack({ children, className }: CardStackProps) {
  return (
    <div className={cn("relative space-y-4", className)}>
      {children.map((child, index) => (
        <div
          key={index}
          className="animate-fade-in"
          style={{ 
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'both'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

// Floating card effect
export function FloatingCard({ 
  children, 
  className 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <div
      className={cn(
        "coinet-card animate-float-subtle",
        className
      )}
    >
      {children}
    </div>
  )
}
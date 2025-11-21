import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const interactiveBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 hover:scale-105",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:scale-105",
        success: "border-transparent bg-success text-success-foreground hover:bg-success/80 hover:scale-105",
        warning: "border-transparent bg-warning text-warning-foreground hover:bg-warning/80 hover:scale-105",
        outline: "text-foreground hover:bg-accent hover:text-accent-foreground hover:scale-105",
        ghost: "border-transparent hover:bg-accent hover:text-accent-foreground hover:scale-105",
        gradient: "border-transparent bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-primary/90 hover:to-accent/90 hover:scale-105",
        glow: "border-transparent bg-primary text-primary-foreground shadow-glow hover:shadow-brand hover:scale-105",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
      animation: {
        none: "",
        pulse: "animate-pulse-gentle",
        bounce: "hover:animate-bounce",
        glow: "animate-glow-pulse",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none",
    },
  }
);

export interface InteractiveBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof interactiveBadgeVariants> {
  onClick?: () => void;
}

function InteractiveBadge({ 
  className, 
  variant, 
  size, 
  animation, 
  onClick, 
  ...props 
}: InteractiveBadgeProps) {
  return (
    <div 
      className={cn(interactiveBadgeVariants({ variant, size, animation }), className)} 
      onClick={onClick}
      {...props} 
    />
  );
}

export { InteractiveBadge, interactiveBadgeVariants };
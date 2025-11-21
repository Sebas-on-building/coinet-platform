import React from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "default" | "dots" | "pulse";
}

export function LoadingSpinner({ 
  size = "md", 
  className,
  variant = "default" 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  if (variant === "dots") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-typing-dots-1" />
        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-typing-dots-2" />
        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-typing-dots-3" />
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className={cn(
        "rounded-full bg-primary animate-pulse-gentle",
        sizeClasses[size],
        className
      )} />
    );
  }

  return (
    <div className={cn(
      "animate-spin rounded-full border-2 border-primary/30 border-t-primary",
      sizeClasses[size],
      className
    )} />
  );
}
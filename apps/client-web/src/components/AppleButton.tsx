import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface AppleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const AppleButton = forwardRef<HTMLButtonElement, AppleButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          "inline-flex items-center justify-center font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
          
          // Variants
          {
            "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 hover:shadow-md active:scale-[0.98]": variant === "primary",
            "bg-secondary text-secondary-foreground border border-border shadow-sm hover:bg-secondary/80 active:bg-secondary/70 hover:shadow-md active:scale-[0.98]": variant === "secondary",
            "hover:bg-accent hover:text-accent-foreground active:bg-accent/80 active:scale-[0.98]": variant === "ghost",
          },
          
          // Sizes
          {
            "h-8 px-3 text-sm rounded-md": size === "sm",
            "h-10 px-4 text-sm rounded-lg": size === "md",
            "h-12 px-6 text-base rounded-xl": size === "lg",
          },
          
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

AppleButton.displayName = "AppleButton";
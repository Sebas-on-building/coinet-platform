import { cn } from "@/lib/utils";

interface SafeAreaProps {
  children: React.ReactNode;
  className?: string;
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}

export function SafeArea({ 
  children, 
  className, 
  top = false, 
  bottom = false, 
  left = false, 
  right = false 
}: SafeAreaProps) {
  return (
    <div
      className={cn(
        "w-full h-full",
        top && "pt-[env(safe-area-inset-top)]",
        bottom && "pb-[env(safe-area-inset-bottom)]",
        left && "pl-[env(safe-area-inset-left)]",
        right && "pr-[env(safe-area-inset-right)]",
        className
      )}
    >
      {children}
    </div>
  );
}
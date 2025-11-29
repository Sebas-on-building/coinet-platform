import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface NetworkErrorProps {
  onRetry?: () => void;
  title?: string;
  message?: string;
  className?: string;
}

export function NetworkError({ 
  onRetry, 
  title = "Connection lost",
  message = "We're having trouble connecting to the server. Please check your internet connection and try again.",
  className 
}: NetworkErrorProps) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center space-y-6",
        "min-h-[300px]",
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-warning/10 rounded-3xl blur-2xl" />
        <div className="relative w-20 h-20 bg-warning/10 rounded-2xl flex items-center justify-center border border-warning/20">
          <WifiOff className="w-10 h-10 text-warning" />
        </div>
      </div>

      <div className="space-y-2 max-w-md">
        <h3 className="coinet-heading-4 text-foreground">
          {title}
        </h3>
        <p className="coinet-body text-muted-foreground leading-relaxed">
          {message}
        </p>
      </div>

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="default"
          className="min-w-[140px]"
          aria-label="Retry connection"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

interface LoadingErrorProps {
  onRetry?: () => void;
  resourceName?: string;
  errorMessage?: string;
  className?: string;
}

export function LoadingError({ 
  onRetry, 
  resourceName = "content",
  errorMessage,
  className 
}: LoadingErrorProps) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center p-6 text-center space-y-4",
        "rounded-lg border border-destructive/20 bg-destructive/5",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-destructive" />
      </div>

      <div className="space-y-1 max-w-sm">
        <h4 className="font-semibold text-foreground">
          Failed to load {resourceName}
        </h4>
        {errorMessage && (
          <p className="text-sm text-muted-foreground">
            {errorMessage}
          </p>
        )}
      </div>

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          aria-label={`Retry loading ${resourceName}`}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}

interface InlineErrorProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function InlineError({ message, onDismiss, className }: InlineErrorProps) {
  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg",
        "bg-destructive/10 border border-destructive/20",
        "text-sm text-destructive",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="flex-1">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-destructive hover:text-destructive/80 transition-colors"
          aria-label="Dismiss error"
        >
          ×
        </button>
      )}
    </div>
  );
}

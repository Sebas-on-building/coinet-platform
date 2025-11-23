import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public static getDerivedStateFromError(error: Error): State;
  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void;
}

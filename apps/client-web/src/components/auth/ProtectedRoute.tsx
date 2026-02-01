import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const AUTH_TIMEOUT_MS = 5000; // 5 seconds timeout

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  // Set a timeout - if auth doesn't load in 5 seconds, redirect to /auth
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        console.warn("Auth loading timed out after 5 seconds, redirecting to /auth");
        setTimedOut(true);
      }, AUTH_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Redirect on timeout
  if (timedOut && loading) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading spinner while checking authentication (max 5 seconds)
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth page if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
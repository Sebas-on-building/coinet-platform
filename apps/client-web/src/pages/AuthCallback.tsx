import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * OAuth Callback Page
 * 
 * Handles the redirect from OAuth providers (Google, GitHub).
 * Extracts the token from URL parameters and stores it.
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Get token from URL params
      const token = searchParams.get("token");
      const errorParam = searchParams.get("error");
      const errorMessage = searchParams.get("message");

      if (errorParam || errorMessage) {
        setError(errorMessage || errorParam || "Authentication failed");
        toast.error("Authentication failed", {
          description: errorMessage || errorParam || "Please try again",
        });
        // Redirect to auth page after delay
        setTimeout(() => navigate("/auth"), 2000);
        return;
      }

      if (token) {
        // Store the token
        try {
          localStorage.setItem("coinet_auth_token", token);
          toast.success("Welcome to Coinet AI!");
          // Redirect to home
          navigate("/", { replace: true });
        } catch (err) {
          setError("Failed to store authentication token");
          toast.error("Authentication failed", {
            description: "Failed to complete sign in",
          });
          setTimeout(() => navigate("/auth"), 2000);
        }
      } else {
        // No token - redirect to auth
        setError("No authentication token received");
        setTimeout(() => navigate("/auth"), 2000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-muted-foreground text-sm">Redirecting to login...</p>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Completing sign in...</p>
          </>
        )}
      </div>
    </div>
  );
}

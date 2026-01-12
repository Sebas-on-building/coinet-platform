import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * OAuth Callback Page
 * 
 * Handles the redirect from OAuth providers (Google, GitHub).
 * Extracts the token from URL parameters and stores it.
 * 
 * SECURITY: 
 * - Immediately cleans URL to remove token from browser history
 * - Validates token format before storage
 * - Uses replace navigation to prevent back-button issues
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double processing (React StrictMode)
    if (processedRef.current) return;
    processedRef.current = true;

    const handleCallback = async () => {
      // Get token from URL params OR hash fragment (more secure)
      let token = searchParams.get("token");
      const errorParam = searchParams.get("error");
      const errorMessage = searchParams.get("message");

      // Also check hash fragment (future-proofing for more secure OAuth flow)
      if (!token && location.hash) {
        const hashParams = new URLSearchParams(location.hash.substring(1));
        token = hashParams.get("token");
      }

      // SECURITY: Immediately clean URL to prevent token leakage
      // This removes the token from browser history and address bar
      if (token || errorParam) {
        window.history.replaceState({}, document.title, "/auth/callback");
      }

      if (errorParam || errorMessage) {
        setError(errorMessage || errorParam || "Authentication failed");
        toast.error("Authentication failed", {
          description: errorMessage || errorParam || "Please try again",
        });
        // Redirect to auth page after delay
        setTimeout(() => navigate("/auth", { replace: true }), 2000);
        return;
      }

      if (token) {
        // SECURITY: Basic token format validation (JWT has 3 parts separated by dots)
        const tokenParts = token.split(".");
        if (tokenParts.length !== 3) {
          setError("Invalid authentication token format");
          toast.error("Authentication failed", {
            description: "Invalid token received",
          });
          setTimeout(() => navigate("/auth", { replace: true }), 2000);
          return;
        }

        // Store the token
        try {
          localStorage.setItem("coinet_auth_token", token);
          toast.success("Welcome to Coinet AI!");
          // Redirect to home with replace to prevent back-button issues
          navigate("/", { replace: true });
        } catch (err) {
          setError("Failed to store authentication token");
          toast.error("Authentication failed", {
            description: "Failed to complete sign in",
          });
          setTimeout(() => navigate("/auth", { replace: true }), 2000);
        }
      } else {
        // No token - redirect to auth
        setError("No authentication token received");
        setTimeout(() => navigate("/auth", { replace: true }), 2000);
      }
    };

    handleCallback();
  }, [searchParams, location.hash, navigate]);

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

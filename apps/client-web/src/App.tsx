import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setApiFetcher } from "../../packages/shared-models/portfolio/api";
import { apiClient } from "@/services/api-client";

// Ensure Redux portfolio/alerts/user/settings slices use authenticated fetch (Bearer token)
setApiFetcher((url) => apiClient.getJson(url));
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthPage } from "@/components/auth/AuthPage";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SSOCallback from "./pages/SSOCallback";
import { PortfolioPage } from "./pages/PortfolioPage";
import { setApiFetcher } from "../../packages/shared-models/portfolio/api";
import { apiClient } from "@/services/api-client";

// Wire authenticated fetch for Redux/shared-models slices (Bearer + X-User-Id)
setApiFetcher((url) => apiClient.getJson(url));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AccessibilityProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/sso-callback" element={<SSOCallback />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } />
                <Route path="/portfolio/*" element={
                  <ProtectedRoute>
                    <PortfolioPage />
                  </ProtectedRoute>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </AccessibilityProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

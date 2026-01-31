import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";

export default function SSOCallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}

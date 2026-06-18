import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

// Publishable key (client-safe). Must be from the same Clerk application the
// backend's CLERK_SECRET_KEY verifies against — production instance
// (clerk.coinet.ai) for the live api.coinet.ai backend.
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

const root = createRoot(document.getElementById("root")!);

if (!PUBLISHABLE_KEY) {
  // Fail loud rather than rendering a half-broken auth surface.
  root.render(
    <StrictMode>
      <div style={{ padding: 24, fontFamily: "system-ui", maxWidth: 640 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Missing VITE_CLERK_PUBLISHABLE_KEY</h1>
        <p style={{ color: "#666", marginTop: 8 }}>
          Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in <code>apps/web/.env</code> (local) or the
          Vercel project env. Use the <code>pk_live_</code> key for the production Clerk instance
          that pairs with the live backend.
        </p>
      </div>
    </StrictMode>,
  );
} else {
  root.render(
    <StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    </StrictMode>,
  );
}

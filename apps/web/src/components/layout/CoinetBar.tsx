import { Link, NavLink } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { cn } from "@/lib/utils";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";

const links = [
  { to: "/", label: "Overview" },
  { to: "/verdict", label: "Verdict" },
  { to: "/connection", label: "Connection Proof" },
];

export function CoinetBar() {
  // Keep the API client's auth in sync with Clerk on every page.
  useAuthenticatedApi();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Coinet home">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            C
          </span>
          <span className="text-sm font-semibold tracking-tight">Coinet</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Market Intelligence
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-1 flex items-center">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </div>
    </header>
  );
}

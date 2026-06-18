import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/clerk-react";

/**
 * Authenticated verdict view.
 *
 * Phase A (now): proves the auth gate — signed-out users see a sign-in prompt;
 * signed-in users see a confirmation that the authenticated session is wired to
 * the API client. The real mentor verdict (POST /api/chat/message →
 * ChatVerdict) lands here in Phase B (MentorVerdict component).
 */
export function VerdictView() {
  return (
    <main className="container py-10">
      <h1 className="text-xl font-semibold tracking-tight">Mentor Verdict</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The differentiated, mentor-voiced per-token read — from the authenticated chat pipeline.
      </p>

      <SignedOut>
        <div className="mt-6 rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Sign in to get a governed Coinet verdict. The verdict endpoint requires an
            authenticated session.
          </p>
          <div className="mt-4">
            <SignInButton mode="modal">
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
                Sign in to continue
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <SignedInProof />
      </SignedIn>
    </main>
  );
}

function SignedInProof() {
  const { user } = useUser();
  return (
    <div className="mt-6 rounded-lg border border-border bg-card p-6">
      <p className="text-sm">
        Signed in as{" "}
        <span className="font-mono">
          {user?.primaryEmailAddress?.emailAddress ?? user?.id}
        </span>
        . Your session token is synced to the API client.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Phase B will render the real <span className="font-medium">MentorVerdict</span> here from{" "}
        <code>POST /api/chat/message</code>.
      </p>
    </div>
  );
}

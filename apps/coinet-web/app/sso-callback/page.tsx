"use client"

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"

/**
 * OAuth return handler. After a social provider (e.g. Google) redirects back,
 * Clerk completes the sign-in here and sends the user to `/`. Shown only for a
 * brief moment — render a globe-matched spinner so it doesn't flash blank.
 */
export default function SSOCallbackPage() {
  return (
    <>
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
      <AuthenticateWithRedirectCallback signInForceRedirectUrl="/" signUpForceRedirectUrl="/" />
    </>
  )
}

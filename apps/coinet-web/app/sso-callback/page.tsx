"use client"

import { useEffect, useRef, useState } from "react"
import { useClerk } from "@clerk/nextjs"

/**
 * OAuth return handler. After a social provider (e.g. Google) redirects back,
 * Clerk completes the sign-in here and sends the user to `/`.
 *
 * We intentionally do NOT use Clerk's <AuthenticateWithRedirectCallback />:
 * in the Next.js App Router its built-in redirect resolves through
 * `next/navigation`'s `redirect()`, which throws a `NEXT_REDIRECT`
 * control-flow signal from inside Clerk's async internals — outside any
 * boundary we can catch — and surfaces as a spurious runtime error.
 *
 * Instead we drive `handleRedirectCallback` ourselves and pass a custom
 * navigate that does a plain full-page `window.location` navigation. That
 * never touches Next's router redirect, so no NEXT_REDIRECT is thrown.
 */
export default function SSOCallbackPage() {
  const clerk = useClerk()
  const ranRef = useRef(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!clerk.loaded || ranRef.current) return
    ranRef.current = true

    clerk
      .handleRedirectCallback(
        { signInForceRedirectUrl: "/", signUpForceRedirectUrl: "/" },
        // Custom navigate: full-page nav, never Next's redirect().
        (to: string) => {
          window.location.href = to
        },
      )
      .catch(() => {
        // If the handshake can't complete (e.g. opened directly), fall back home.
        setFailed(true)
        window.location.href = "/"
      })
  }, [clerk])

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <span className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      <span className="sr-only">{failed ? "Redirecting…" : "Completing sign-in…"}</span>
    </div>
  )
}

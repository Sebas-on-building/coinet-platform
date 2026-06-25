"use client"

import { useEffect } from "react"

// Clerk's <ClerkProvider> performs navigations (session handshake, setActive,
// OAuth completion) from inside async callbacks. In the Next.js App Router a
// navigation is signalled by THROWING a control-flow error whose digest starts
// with "NEXT_REDIRECT". When that throw happens inside Clerk's async internals
// there is no React render / Server Action boundary to absorb it, so it leaks
// to the window as an uncaught error / unhandled rejection. The navigation
// itself still completes — this is benign noise — but dev error overlays and
// reporters surface it as a runtime error.
//
// This component silences ONLY that specific signal at the window level and
// leaves every other error untouched.
function isNextRedirect(value: unknown): boolean {
  if (!value) return false
  const digest = (value as { digest?: unknown }).digest
  if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) return true
  const message = (value as { message?: unknown }).message
  return typeof message === "string" && message.startsWith("NEXT_REDIRECT")
}

export function RedirectErrorSilencer() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isNextRedirect(event.error) || (typeof event.message === "string" && event.message.includes("NEXT_REDIRECT"))) {
        event.preventDefault()
      }
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      if (isNextRedirect(event.reason)) {
        event.preventDefault()
      }
    }

    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)

    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])

  return null
}

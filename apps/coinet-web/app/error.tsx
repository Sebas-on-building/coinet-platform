"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCw } from "lucide-react"
import { CoinetLogo } from "@/components/coinet-logo"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.log("[v0] Route error:", error.message)
  }, [error])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <CoinetLogo className="size-10 text-foreground" />
      <div className="flex flex-col items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <AlertTriangle className="size-6" />
        </span>
        <h1 className="font-heading text-xl font-bold text-foreground text-balance">Something broke in the terminal</h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
          Coinet hit an unexpected error while rendering this view. Your saved conversations are safe. You can retry, or
          reload if it keeps happening.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <RotateCw className="size-4" />
        Try again
      </button>
    </main>
  )
}

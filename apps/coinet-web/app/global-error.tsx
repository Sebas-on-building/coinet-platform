"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.log("[v0] Global error:", error.message)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          backgroundColor: "#000",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Coinet failed to load</h1>
        <p style={{ maxWidth: "28rem", color: "#a1a1a1", lineHeight: 1.6 }}>
          A critical error stopped the app from starting. Please reload the page.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            borderRadius: "9999px",
            border: "none",
            backgroundColor: "#2d2df5",
            color: "#fff",
            padding: "0.625rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  )
}

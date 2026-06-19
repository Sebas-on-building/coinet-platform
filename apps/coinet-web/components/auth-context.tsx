"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"

type AuthValue = {
  authed: boolean
  ready: boolean
  signIn: () => void
  signOut: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

const AUTH_KEY = "coinet.auth.session.v1"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [ready, setReady] = useState(false)

  // Restore session on mount.
  useEffect(() => {
    try {
      setAuthed(window.localStorage.getItem(AUTH_KEY) === "true")
    } catch {
      // ignore
    }
    setReady(true)
  }, [])

  const signIn = useCallback(() => {
    setAuthed(true)
    try {
      window.localStorage.setItem(AUTH_KEY, "true")
    } catch {
      // ignore
    }
  }, [])

  const signOut = useCallback(() => {
    setAuthed(false)
    try {
      window.localStorage.removeItem(AUTH_KEY)
    } catch {
      // ignore
    }
  }, [])

  return <AuthContext.Provider value={{ authed, ready, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}

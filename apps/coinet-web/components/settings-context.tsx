"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"

export type Theme = "system" | "light" | "dark"

export type Notifications = {
  priceAlerts: boolean
  judgmentUpdates: boolean
  productNews: boolean
}

type SettingsValue = {
  name: string
  setName: (name: string) => void
  email: string
  setEmail: (email: string) => void
  plan: string
  reduceMotion: boolean
  setReduceMotion: (value: boolean) => void
  theme: Theme
  setTheme: (value: Theme) => void
  notifications: Notifications
  setNotification: (key: keyof Notifications, value: boolean) => void
  logout: () => void
  initials: string
}

const SettingsContext = createContext<SettingsValue | null>(null)

const STORAGE_KEY = "coinet.settings.v2"
const DEFAULT_NAME = "Sebastian Mark"
const DEFAULT_EMAIL = "sebastian@coinet.ai"
const DEFAULT_PLAN = "Pro"

type StoredSettings = {
  name: string
  email: string
  reduceMotion: boolean
  theme: Theme
  notifications: Notifications
}

const DEFAULTS: StoredSettings = {
  name: DEFAULT_NAME,
  email: DEFAULT_EMAIL,
  reduceMotion: false,
  theme: "dark",
  notifications: { priceAlerts: true, judgmentUpdates: true, productNews: false },
}

function loadStored(): StoredSettings {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<StoredSettings>
    return {
      name: typeof parsed.name === "string" ? parsed.name : DEFAULT_NAME,
      email: typeof parsed.email === "string" ? parsed.email : DEFAULT_EMAIL,
      reduceMotion: Boolean(parsed.reduceMotion),
      theme: parsed.theme === "light" || parsed.theme === "system" || parsed.theme === "dark" ? parsed.theme : "dark",
      notifications: { ...DEFAULTS.notifications, ...(parsed.notifications ?? {}) },
    }
  } catch {
    return DEFAULTS
  }
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "C"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  const prefersLight =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches
  const isLight = theme === "light" || (theme === "system" && prefersLight)
  root.classList.toggle("light", isLight)
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [name, setNameState] = useState(DEFAULT_NAME)
  const [email, setEmailState] = useState(DEFAULT_EMAIL)
  const [reduceMotion, setReduceMotionState] = useState(false)
  const [theme, setThemeState] = useState<Theme>("dark")
  const [notifications, setNotificationsState] = useState<Notifications>(DEFAULTS.notifications)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = loadStored()
    setNameState(stored.name)
    setEmailState(stored.email)
    setReduceMotionState(stored.reduceMotion)
    setThemeState(stored.theme)
    setNotificationsState(stored.notifications)
    applyTheme(stored.theme)
    setHydrated(true)
  }, [])

  // Re-apply theme on change and react to system preference when in "system" mode.
  useEffect(() => {
    applyTheme(theme)
    if (theme !== "system" || typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-color-scheme: light)")
    const handler = () => applyTheme("system")
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ name, email, reduceMotion, theme, notifications }),
      )
    } catch {
      // ignore
    }
  }, [name, email, reduceMotion, theme, notifications, hydrated])

  const setName = useCallback((value: string) => setNameState(value), [])
  const setEmail = useCallback((value: string) => setEmailState(value), [])
  const setReduceMotion = useCallback((value: boolean) => setReduceMotionState(value), [])
  const setTheme = useCallback((value: Theme) => setThemeState(value), [])
  const setNotification = useCallback(
    (key: keyof Notifications, value: boolean) =>
      setNotificationsState((prev) => ({ ...prev, [key]: value })),
    [],
  )

  const logout = useCallback(() => {
    setNameState(DEFAULTS.name)
    setEmailState(DEFAULTS.email)
    setReduceMotionState(DEFAULTS.reduceMotion)
    setThemeState(DEFAULTS.theme)
    setNotificationsState(DEFAULTS.notifications)
    applyTheme(DEFAULTS.theme)
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  const displayName = name.trim() || DEFAULT_NAME

  return (
    <SettingsContext.Provider
      value={{
        name: displayName,
        setName,
        email,
        setEmail,
        plan: DEFAULT_PLAN,
        reduceMotion,
        setReduceMotion,
        theme,
        setTheme,
        notifications,
        setNotification,
        logout,
        initials: initialsFrom(displayName),
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider")
  return ctx
}

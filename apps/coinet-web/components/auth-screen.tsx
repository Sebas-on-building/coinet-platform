"use client"

import { useState } from "react"
import Image from "next/image"
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, Scale, History } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { useSettings } from "@/components/settings-context"
import { CoinetLogo } from "@/components/coinet-logo"
import { cn } from "@/lib/utils"

type Mode = "signin" | "signup"

export function AuthScreen() {
  const { signIn } = useAuth()
  const { setName, setEmail } = useSettings()
  const [mode, setMode] = useState<Mode>("signin")
  const [fullName, setFullName] = useState("")
  const [email, setEmailValue] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validate(): string | null {
    if (mode === "signup" && fullName.trim().length < 2) return "Please enter your name."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address."
    if (password.length < 8) return "Password must be at least 8 characters."
    if (mode === "signup" && confirmPassword !== password) return "Passwords do not match."
    return null
  }

  function handleSocial(provider: "google" | "apple") {
    setError(null)
    setSubmitting(true)
    // Simulate the OAuth handshake, then establish the session.
    setTimeout(() => signIn(), 700)
    console.log("[v0] social auth:", provider)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    setError(null)
    setSubmitting(true)
    // Simulate an auth request, then establish the session.
    setTimeout(() => {
      if (mode === "signup" && fullName.trim()) setName(fullName.trim())
      setEmail(email.trim())
      signIn()
    }, 700)
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Brand panel */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border p-10 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <Image
            src="/coinet-globe.png"
            alt=""
            width={760}
            height={760}
            priority
            className="h-auto w-[120%] max-w-none opacity-25 [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]"
          />
        </div>

        <div className="relative flex items-center gap-2.5">
          <CoinetLogo className="size-11 text-foreground" />
          <span className="font-heading text-xl font-bold tracking-tight">Coinet</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-balance font-heading text-3xl font-bold leading-tight tracking-tight">
            The crypto AI that forms its own judgment.
          </h2>
          <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
            Coinet weighs prices, whales, sentiment, and on-chain moves, then gives you a verdict you can audit.
          </p>
          <ul className="mt-8 flex flex-col gap-4">
            {[
              { icon: Scale, text: "Structured verdicts with confidence and reasoning" },
              { icon: ShieldCheck, text: "Self-challenging — it argues against its own call" },
              { icon: History, text: "An auditable track record of every judgment" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card/60 text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="text-foreground/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">
          Coinet provides analysis, not financial advice. Always verify before you trade.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex w-full flex-col items-center justify-center px-5 py-10 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <CoinetLogo className="size-11 text-foreground" />
            <span className="font-heading text-xl font-bold tracking-tight">Coinet</span>
          </div>

          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to pick up where you left off."
              : "Start getting Coinet's judgment on any market."}
          </p>

          {/* Mode toggle */}
          <div className="mt-6 flex rounded-xl border border-border bg-card/60 p-1">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setError(null)
                }}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          {/* Social sign-in */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSocial("google")}
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-xl border border-input bg-card/60 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
            >
              <GoogleIcon className="size-4" />
              Google
            </button>
            <button
              type="button"
              onClick={() => handleSocial("apple")}
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-xl border border-input bg-card/60 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
            >
              <AppleIcon className="size-4" />
              Apple
            </button>
          </div>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or continue with email</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {mode === "signup" && (
              <Field
                id="name"
                label="Full name"
                icon={User}
                type="text"
                autoComplete="name"
                placeholder="Satoshi Nakamoto"
                value={fullName}
                onChange={setFullName}
              />
            )}
            <Field
              id="email"
              label="Email"
              icon={Mail}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={setEmailValue}
            />
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground/90">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card/60 py-2.5 pl-9 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-foreground/90">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card/60 py-2.5 pl-9 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40"
                  />
                  <button
                    type="button"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === "signin" && (
              <div className="-mt-1 flex justify-end">
                <button type="button" className="text-xs text-primary transition-opacity hover:opacity-80">
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? (
                <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
              ) : (
                <>
                  {mode === "signin" ? "Sign in" : "Create account"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "signin" ? "New to Coinet? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin")
                setError(null)
              }}
              className="font-medium text-primary transition-opacity hover:opacity-80"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M16.37 1.43c.06.81-.26 1.6-.78 2.18-.55.62-1.45 1.1-2.32 1.03-.08-.78.3-1.6.79-2.13.55-.62 1.5-1.07 2.31-1.08ZM19.5 17.1c-.4.93-.6 1.34-1.11 2.16-.72 1.15-1.74 2.58-3 2.59-1.12.01-1.4-.73-2.93-.72-1.52.01-1.83.73-2.95.73-1.26-.01-2.22-1.3-2.94-2.45-2.02-3.22-2.23-7-.98-9.01.88-1.43 2.28-2.27 3.59-2.27 1.34 0 2.18.74 3.29.74 1.07 0 1.72-.74 3.27-.74 1.17 0 2.41.64 3.3 1.74-2.9 1.59-2.43 5.73.37 6.96Z" />
    </svg>
  )
}

function Field({
  id,
  label,
  icon: Icon,
  type,
  autoComplete,
  placeholder,
  value,
  onChange,
}: {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  type: string
  autoComplete: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground/90">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-input bg-card/60 py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40"
        />
      </div>
    </div>
  )
}

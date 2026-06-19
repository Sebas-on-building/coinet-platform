"use client"

import { useState } from "react"
import {
  X,
  User,
  CreditCard,
  Palette,
  Bell,
  Database,
  LogOut,
  Check,
  Monitor,
  Sun,
  Moon,
  Trash2,
  Sparkles,
} from "lucide-react"
import { useSettings, type Theme, type Notifications } from "@/components/settings-context"
import { useChat } from "@/components/chat-context"
import { useClerk } from "@clerk/nextjs"
import { Modal } from "@/components/modal"
import { cn } from "@/lib/utils"

type SettingsDialogProps = {
  open: boolean
  onClose: () => void
}

type TabId = "account" | "subscription" | "appearance" | "notifications" | "data"

const tabs: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "account", label: "Account", icon: User },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "data", label: "Data", icon: Database },
]

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-secondary",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-5 rounded-full bg-foreground transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  )
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const {
    name,
    setName,
    email,
    setEmail,
    plan,
    reduceMotion,
    setReduceMotion,
    theme,
    setTheme,
    notifications,
    setNotification,
    logout,
    initials,
  } = useSettings()
  const { conversations, clearAll } = useChat()
  const { signOut } = useClerk()
  const [tab, setTab] = useState<TabId>("account")

  function handleLogout() {
    clearAll()
    logout()
    onClose()
    // Ends the Clerk session → the gate flips back to the auth screen.
    void signOut()
  }

  function handleClear() {
    clearAll()
  }

  const themeOptions: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: "system", label: "System", icon: Monitor },
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
  ]

  const notificationItems: { key: keyof Notifications; title: string; desc: string }[] = [
    { key: "priceAlerts", title: "Price alerts", desc: "Get notified when watched assets move sharply." },
    { key: "judgmentUpdates", title: "Judgment updates", desc: "When Coinet revises a verdict you've seen." },
    { key: "productNews", title: "Product news", desc: "Occasional updates about new Coinet features." },
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      hideTitle
      align="top"
      className="flex h-[560px] max-h-[84vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl md:flex-row"
    >
      {/* Left nav */}
      <div className="flex shrink-0 flex-col border-b border-border md:w-56 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between px-4 py-4 md:px-5">
            <h2 className="font-heading text-base font-semibold text-foreground">Settings</h2>
            <button
              type="button"
              aria-label="Close settings"
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
            >
              <X className="size-4" />
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible md:px-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  tab === t.id
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <t.icon className="size-4" />
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right content */}
        <div className="relative flex-1 overflow-y-auto">
          <button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="absolute right-4 top-4 hidden size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:flex"
          >
            <X className="size-4" />
          </button>

          <div className="flex flex-col gap-6 p-5 md:p-6">
            {tab === "account" && (
              <section className="flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <span className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                    {initials}
                  </span>
                  <div>
                    <p className="font-heading text-base font-semibold text-foreground">{name}</p>
                    <p className="text-sm text-muted-foreground">{email}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="display-name" className="text-xs text-muted-foreground">
                    Display name
                  </label>
                  <input
                    id="display-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-xs text-muted-foreground">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex items-center justify-center gap-2 rounded-lg border border-destructive/40 px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="size-4" />
                  Log out
                </button>
              </section>
            )}

            {tab === "subscription" && (
              <section className="flex flex-col gap-5">
                <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" />
                      <span className="font-heading text-sm font-semibold text-foreground">Coinet {plan}</span>
                    </div>
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                      Active
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Unlimited judgments, deep-dive analysis, and priority market data. Renews on Jul 14, 2026.
                  </p>
                  <p className="mt-3 font-heading text-2xl font-bold text-foreground">
                    $29<span className="text-sm font-normal text-muted-foreground">/month</span>
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Judgments used this month</span>
                    <span className="font-medium text-foreground">312 / Unlimited</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full w-1/3 rounded-full bg-primary" />
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Upgrade to Max
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    Manage billing
                  </button>
                </div>
              </section>
            )}

            {tab === "appearance" && (
              <section className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-foreground">Theme</span>
                  <div className="grid grid-cols-3 gap-2">
                    {themeOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTheme(opt.id)}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm transition-colors",
                          theme === opt.id
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        <opt.icon className="size-5" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-3">
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">Reduce background motion</span>
                    <span className="text-xs text-muted-foreground">Stop the rotating globe on the home screen.</span>
                  </span>
                  <Toggle checked={reduceMotion} onChange={setReduceMotion} label="Reduce background motion" />
                </div>
              </section>
            )}

            {tab === "notifications" && (
              <section className="flex flex-col gap-3">
                {notificationItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-3"
                  >
                    <span className="flex flex-col pr-3">
                      <span className="text-sm font-medium text-foreground">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.desc}</span>
                    </span>
                    <Toggle
                      checked={notifications[item.key]}
                      onChange={(v) => setNotification(item.key, v)}
                      label={item.title}
                    />
                  </div>
                ))}
              </section>
            )}

            {tab === "data" && (
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-3">
                  <span className="flex flex-col pr-3">
                    <span className="text-sm font-medium text-foreground">Chat history</span>
                    <span className="text-xs text-muted-foreground">
                      {conversations.length} saved {conversations.length === 1 ? "conversation" : "conversations"} on
                      this device.
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={conversations.length === 0}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" />
                    Clear all
                  </button>
                </div>
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  Your conversations are stored locally on this device and never leave your browser in this demo.
                </p>
              </section>
            )}
          </div>
        </div>
    </Modal>
  )
}

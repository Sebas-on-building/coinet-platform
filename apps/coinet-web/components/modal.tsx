"use client"

import { useEffect, useId, useRef } from "react"
import { cn } from "@/lib/utils"

type ModalProps = {
  open: boolean
  onClose: () => void
  /** Accessible title; rendered into an element referenced by aria-labelledby. */
  title: string
  /** Whether to visually show the title. Some dialogs render their own header. */
  hideTitle?: boolean
  children: React.ReactNode
  className?: string
  /** Vertical alignment of the panel. */
  align?: "center" | "top"
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ open, onClose, title, hideTitle, children, className, align = "center" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const titleId = useId()

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  // Focus management: move focus in on open, restore on close.
  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    // Defer so the element is mounted/visible before focusing, then focus the
    // first *visible* focusable element (skips display:none responsive controls).
    const id = window.setTimeout(() => {
      const first = panel
        ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).find((el) => el.offsetParent !== null)
        : null
      ;(first ?? panel)?.focus()
    }, 0)
    return () => {
      window.clearTimeout(id)
      previouslyFocused.current?.focus?.()
    }
  }, [open])

  // Escape to close + Tab focus trap.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== "Tab") return
      const panel = panelRef.current
      if (!panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (items.length === 0) {
        e.preventDefault()
        panel.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex justify-center bg-black/60 p-4 backdrop-blur-sm",
        align === "top" ? "items-start pt-[12vh]" : "items-center",
      )}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn("outline-none", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className={cn(hideTitle && "sr-only")}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}

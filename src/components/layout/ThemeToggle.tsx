"use client"

import { useEffect, useRef, useState, type PointerEvent } from "react"
import { useTheme } from "@/components/providers/ThemeProvider"

type ThemeToggleProps = {
  className?: string
  side?: "left" | "right"
  vertical?: "upper" | "middle" | "lower"
}

const TOUCH_EXPAND_MS = 1500

const verticalClassByPosition = {
  upper: "top-[38%]",
  middle: "top-1/2 -translate-y-1/2",
  lower: "top-[62%]",
} as const

export function ThemeToggle({
  className = "",
  side = "left",
  vertical = "upper",
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const [isTouchExpanded, setIsTouchExpanded] = useState(false)
  const touchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current)
      }
    }
  }, [])

  function expandForTouch() {
    setIsTouchExpanded(true)

    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current)
    }

    touchTimeoutRef.current = setTimeout(() => {
      setIsTouchExpanded(false)
    }, TOUCH_EXPAND_MS)
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse") {
      expandForTouch()
    }
  }

  const sideClass =
    side === "left" ? "left-0 justify-start" : "right-0 justify-end"
  const panelShapeClass =
    side === "left"
      ? "rounded-r-[var(--radius-large)] border-l-0"
      : "rounded-l-[var(--radius-large)] border-r-0"
  const hiddenOffsetClass =
    side === "left" ? "-translate-x-[2.25rem]" : "translate-x-[2.25rem]"
  const touchOffsetClass = isTouchExpanded ? "translate-x-0" : hiddenOffsetClass

  return (
    <button
      type="button"
      onClick={toggleTheme}
      onPointerDown={handlePointerDown}
      onTouchStart={expandForTouch}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      className={`group fixed ${sideClass} ${verticalClassByPosition[vertical]} z-[60] flex min-h-[58px] min-w-[58px] touch-manipulation items-center overflow-visible bg-transparent p-0 text-[var(--color-card-foreground)] outline-none [pointer-events:auto] ${className}`}
    >
      <span className={`flex h-[3.3rem] w-[3.3rem] ${touchOffsetClass} items-center justify-center ${panelShapeClass} border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-[var(--shadow-card)] transition-transform duration-300 ease-in-out will-change-transform group-hover:translate-x-0 group-active:translate-x-0 group-focus-visible:translate-x-0 group-hover:border-[var(--color-primary)] group-hover:text-[var(--color-primary)] group-active:border-[var(--color-primary)] group-active:text-[var(--color-primary)] group-focus-visible:border-[var(--color-primary)] group-focus-visible:text-[var(--color-primary)] group-focus-visible:ring-4 group-focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_28%,transparent)]`}>
        {isDark ? (
          <svg viewBox="0 0 24 24" className="h-[1.35rem] w-[1.35rem]" fill="currentColor">
            <path d="M20.99 13.28A8 8 0 1 1 10.72 3.01 6 6 0 1 0 20.99 13.28Z" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-[1.35rem] w-[1.35rem]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="m4.93 19.07 1.41-1.41" />
            <path d="m17.66 6.34 1.41-1.41" />
          </svg>
        )}
      </span>
    </button>
  )
}

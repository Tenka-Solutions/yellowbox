"use client"

import { useTheme } from "@/components/providers/ThemeProvider"

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      className={`group fixed left-0 top-[38%] z-[60] flex min-h-[52px] min-w-[52px] touch-manipulation items-center justify-start overflow-visible bg-transparent p-0 text-[var(--color-card-foreground)] outline-none [pointer-events:auto] ${className}`}
    >
      <span className="flex h-12 w-12 -translate-x-8 items-center justify-center rounded-r-[var(--radius-large)] border border-l-0 border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-[var(--shadow-card)] transition-transform duration-200 ease-out will-change-transform group-hover:translate-x-0 group-active:translate-x-0 group-focus-visible:translate-x-0 group-hover:border-[var(--color-primary)] group-hover:text-[var(--color-primary)] group-active:border-[var(--color-primary)] group-active:text-[var(--color-primary)] group-focus-visible:border-[var(--color-primary)] group-focus-visible:text-[var(--color-primary)] group-focus-visible:ring-4 group-focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_28%,transparent)]">
        {isDark ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M20.99 13.28A8 8 0 1 1 10.72 3.01 6 6 0 1 0 20.99 13.28Z" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
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

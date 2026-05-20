"use client";

import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useCartStore } from "@/lib/cart-store";
import { publicNavigation } from "@/modules/shared/site";

export function SiteHeader() {
  const pathname = usePathname();
  const totalItems = useCartStore((store) => store.totalItems());
  const [menuOpen, setMenuOpen] = useState(false);
  const skipNextMenuClickRef = useRef(false);

  function toggleMenu() {
    setMenuOpen((current) => !current);
  }

  function handleMenuPointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      event.preventDefault();
      event.stopPropagation();
      skipNextMenuClickRef.current = true;
      toggleMenu();
    }
  }

  function handleMenuClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    if (skipNextMenuClickRef.current) {
      skipNextMenuClickRef.current = false;
      return;
    }

    toggleMenu();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-header)_95%,transparent)] text-[var(--color-header-foreground)] backdrop-blur">
      <div className="page-shell flex h-16 items-center justify-between gap-6 sm:h-18">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <span className="font-[var(--font-display)] text-xl font-semibold tracking-[-0.06em] text-[var(--color-header-foreground)]">
            HUB<span className="text-[var(--color-primary)]">Cafe</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 lg:flex">
          {publicNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[length:var(--font-size-navigation)] font-medium transition-colors ${
                  isActive
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-header-muted)] hover:text-[var(--color-header-foreground)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden text-[length:var(--font-size-navigation)] font-medium text-[var(--color-header-muted)] hover:text-[var(--color-header-foreground)] sm:inline-flex"
          >
            Mi cuenta
          </Link>
          <Link
            href="/carrito"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]"
            aria-label="Carrito"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 4h2l.6 3m0 0L7 15h10l3-8H5.6zM9 20a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"
              />
            </svg>
            {totalItems > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-bold text-[var(--color-primary-foreground)]">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            ) : null}
          </Link>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={handleMenuClick}
            onPointerUp={handleMenuPointerUp}
            className="relative z-[55] inline-flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full text-[var(--color-header-foreground)] [pointer-events:auto] lg:hidden"
            aria-label="Menú"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav id="mobile-menu" className="border-t border-[var(--color-border)] bg-[var(--color-header)] px-4 pb-4 pt-2 text-[var(--color-header-foreground)] lg:hidden">
          {publicNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-[length:var(--font-size-navigation)] font-medium ${
                  isActive
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-header-muted)] hover:text-[var(--color-header-foreground)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="mt-2 block rounded-lg px-3 py-2.5 text-[length:var(--font-size-navigation)] font-medium text-[var(--color-header-muted)] hover:text-[var(--color-header-foreground)]"
          >
            Mi cuenta
          </Link>
        </nav>
      )}
    </header>
  );
}

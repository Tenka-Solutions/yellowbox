"use client";

import CartProvider from "@/components/providers/CartProvider";
import { AppearanceProvider } from "@/components/appearance/AppearanceProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppearanceProvider>
        <CartProvider>{children}</CartProvider>
      </AppearanceProvider>
    </ThemeProvider>
  );
}

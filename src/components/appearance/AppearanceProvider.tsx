"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  SITE_APPEARANCE_KEY,
  defaultAppearanceSettings,
} from "@/modules/appearance/defaultAppearanceSettings";
import { applyAppearanceSettings } from "@/modules/appearance/applyAppearanceSettings";
import { getSafeAppearanceSettings } from "@/modules/appearance/validateAppearanceSettings";
import type { AppearanceSettings } from "@/modules/appearance/types";

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const settingsRef = useRef<AppearanceSettings>(defaultAppearanceSettings);

  useEffect(() => {
    let cancelled = false;

    function applyCurrentSettings() {
      applyAppearanceSettings(settingsRef.current);
    }

    applyCurrentSettings();

    const observer = new MutationObserver((mutations) => {
      if (
        mutations.some(
          (mutation) =>
            mutation.type === "attributes" &&
            mutation.attributeName === "data-theme"
        )
      ) {
        applyCurrentSettings();
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    async function loadAppearanceSettings() {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        return;
      }

      const { data, error } = await supabase
        .from("site_appearance_settings")
        .select("settings")
        .eq("site_key", SITE_APPEARANCE_KEY)
        .maybeSingle();

      if (cancelled || error || !data?.settings) {
        return;
      }

      settingsRef.current = getSafeAppearanceSettings(data.settings);
      applyCurrentSettings();
    }

    loadAppearanceSettings();

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return <>{children}</>;
}

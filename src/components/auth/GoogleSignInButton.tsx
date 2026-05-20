"use client";

import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { env, isSupabaseConfigured } from "@/lib/env";

export function GoogleSignInButton() {
  async function handleLogin() {
    const supabase = createSupabaseBrowserClient();

    if (!isSupabaseConfigured() || !supabase) {
      toast.info(
        "Configura Supabase Auth para habilitar el ingreso con Google."
      );
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${env.siteUrl}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogin}
      className="button-secondary min-h-[44px] w-full touch-manipulation px-6 py-3"
    >
      Continuar con Google
    </button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { env, isSupabaseConfigured } from "@/lib/env";

type Mode = "signin" | "signup";

export function EmailAuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
  });
  const [isPending, startTransition] = useTransition();

  function setField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();
    if (!isSupabaseConfigured() || !supabase) {
      toast.info(
        "Configura Supabase Auth para habilitar el ingreso con email."
      );
      return;
    }

    if (!form.email || !form.password) {
      toast.error("Ingresa correo y contraseña.");
      return;
    }

    if (mode === "signup" && form.password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    startTransition(async () => {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Sesión iniciada");
        router.push("/mi-cuenta");
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${env.siteUrl}/auth/callback`,
          data: { full_name: form.fullName },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.session) {
        toast.success("Cuenta creada");
        router.push("/mi-cuenta");
        router.refresh();
        return;
      }

      toast.success(
        "Revisa tu correo para confirmar la cuenta antes de ingresar."
      );
    });
  }

  async function handleForgotPassword() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    if (!form.email) {
      toast.info("Ingresa tu correo para enviar el enlace de recuperación.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${env.siteUrl}/auth/callback`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Enlace de recuperación enviado a tu correo.");
  }

  return (
    <div>
      <div className="flex w-full rounded-full border border-[var(--color-border)] p-1 text-sm sm:w-auto">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`min-h-[44px] flex-1 touch-manipulation rounded-full px-4 py-1.5 transition sm:flex-none ${
            mode === "signin"
              ? "bg-[#F2A359] text-white"
              : "text-[var(--color-muted-foreground)]"
          }`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`min-h-[44px] flex-1 touch-manipulation rounded-full px-4 py-1.5 transition sm:flex-none ${
            mode === "signup"
              ? "bg-[#F2A359] text-white"
              : "text-[var(--color-muted-foreground)]"
          }`}
        >
          Crear cuenta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        {mode === "signup" ? (
          <div>
            <label className="mb-2 block text-sm font-medium">
              Nombre completo
            </label>
            <input
              className="form-input"
              type="text"
              value={form.fullName}
              placeholder="Juan Pérez"
              onChange={(event) => setField("fullName", event.target.value)}
            />
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium">
            Correo electrónico
          </label>
          <input
            className="form-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            value={form.email}
            placeholder="correo@empresa.cl"
            onChange={(event) => setField("email", event.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Contraseña</label>
          <input
            className="form-input"
            type="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            value={form.password}
            placeholder={mode === "signup" ? "Mínimo 8 caracteres" : "••••••••"}
            onChange={(event) => setField("password", event.target.value)}
          />
        </div>

        {mode === "signin" ? (
          <button
            type="button"
            onClick={handleForgotPassword}
            className="inline-flex min-h-[44px] touch-manipulation items-center justify-self-start text-xs font-semibold text-[var(--color-accent)]"
          >
            ¿Olvidaste tu contraseña?
          </button>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="button-primary min-h-[44px] w-full touch-manipulation px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Procesando..."
            : mode === "signin"
              ? "Entrar"
              : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}

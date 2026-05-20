import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { isSupabaseConfigured } from "@/lib/env";
import { adminNavigation, siteConfig } from "@/modules/shared/site";
import {
  getAuthenticatedUser,
  getAuthenticatedUserRoles,
} from "@/modules/auth/server";

function hasAdminRole(roles: string[]) {
  return roles.some((role) =>
    ["super_admin", "catalog_editor", "sales_manager"].includes(role)
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="page-shell py-16">
        <EmptyState
          title="Configura Supabase para habilitar el panel admin"
          description="El panel ya esta estructurado, pero necesita autenticacion y base conectada para operar."
        />
      </div>
    );
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const roles = await getAuthenticatedUserRoles();

  if (!hasAdminRole(roles)) {
    return (
      <div className="page-shell py-16">
        <EmptyState
          title="No tienes permisos para ingresar"
          description="Solicita acceso administrativo para gestionar catalogo, pedidos o cotizaciones."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-page)] lg:h-screen lg:overflow-hidden">
      <div className="mx-auto grid min-h-screen max-w-[112rem] gap-3 p-3 lg:h-screen lg:min-h-0 lg:grid-cols-[220px_1fr]">
        <aside className="panel-card rounded-[1.25rem] p-4 lg:min-h-0 lg:overflow-y-auto">
          <Link href="/" className="block">
            <span className="font-[var(--font-display)] text-xl font-semibold tracking-[-0.04em]">
              SMK <span className="text-[var(--color-accent)]">Vending</span>
            </span>
          </Link>
          <p className="mt-3 text-xs leading-6 text-[var(--color-admin-muted)]">
            Panel para administrar catalogo, pedidos y seguimiento
            comercial.
          </p>

          <nav className="mt-5 grid gap-1">
            {adminNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[0.75rem] px-3 py-2 text-sm font-medium text-[var(--color-admin-link)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-admin-link-hover)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-5 rounded-[1rem] bg-[var(--color-surface-strong)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-admin-muted)]">
              Sesion
            </p>
            <p className="mt-2 break-words text-xs font-semibold text-[var(--color-ink)]">
              {user.email}
            </p>
            <p className="mt-1 text-xs text-[var(--color-admin-muted)]">
              {roles.join(" / ") || "Administrador"}
            </p>
            <SignOutButton className="button-secondary mt-3 w-full justify-center px-3 py-2 text-xs" />
          </div>

          <div className="mt-5 text-xs leading-5 text-[var(--color-admin-muted)]">
            <p>{siteConfig.contact.salesEmail}</p>
            <p className="mt-1">{siteConfig.contact.phone}</p>
          </div>
        </aside>

        <main className="min-w-0 lg:h-full lg:min-h-0 lg:overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

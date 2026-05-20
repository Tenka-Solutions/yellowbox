import { env } from "@/lib/env";
import { getAuthenticatedUserRoles } from "@/modules/auth/server";

export default async function AdminUsersPage() {
  const roles = await getAuthenticatedUserRoles();

  return (
    <div className="flex min-h-screen flex-col gap-6 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <section className="panel-card shrink-0 rounded-[2rem] p-6 sm:p-8">
        <p className="section-kicker">Seguridad</p>
        <h1 className="mt-3 text-4xl font-semibold">Usuarios admin</h1>
        <p className="mt-4 text-sm leading-8 text-[var(--color-muted-foreground)]">
          Esta vista deja visible la estructura de roles y los correos
          autorizados por entorno para operar el panel.
        </p>
      </section>

      <section className="grid gap-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1 xl:grid-cols-2">
        <article className="panel-card rounded-[2rem] p-6">
          <h2 className="text-2xl font-semibold">Roles de la sesion actual</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {roles.length ? (
              roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex rounded-full bg-[var(--color-surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
                >
                  {role}
                </span>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No hay roles cargados desde Supabase para esta cuenta.
              </p>
            )}
          </div>
        </article>

        <article className="panel-card rounded-[2rem] p-6">
          <h2 className="text-2xl font-semibold">Correos autorizados</h2>
          <div className="mt-6 grid gap-3">
            {env.adminAllowedEmails.length ? (
              env.adminAllowedEmails.map((email) => (
                <div
                  key={email}
                  className="rounded-[1.2rem] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-ink)]"
                >
                  {email}
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                ADMIN_ALLOWED_EMAILS no esta definido en el entorno actual.
              </p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

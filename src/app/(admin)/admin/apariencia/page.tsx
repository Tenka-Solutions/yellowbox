const upcomingFeatures = [
  "Colores globales",
  "Fondos y superficies",
  "Tipografías",
  "Botones",
  "Bordes y sombras",
  "Vista previa en vivo",
];

export default function AdminAppearancePage() {
  return (
    <div className="grid h-full min-h-0 gap-6 overflow-y-auto pr-1">
      <section className="panel-card p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="section-kicker">Admin</p>
              <span className="inline-flex rounded-full border border-[color-mix(in_srgb,var(--color-primary)_44%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card)_88%)] px-3 py-1 text-xs font-bold tracking-[0.14em] text-[var(--color-primary)]">
                BETA
              </span>
            </div>
            <h1 className="mt-3 text-4xl font-semibold">Apariencia</h1>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-[var(--color-muted-foreground)]">
              Este módulo está en desarrollo.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-8 text-[var(--color-muted-foreground)]">
              Permitirá personalizar colores, tipografías, bordes y estilos
              visuales de la tienda cuando la normalización visual esté
              completa.
            </p>
          </div>
        </div>
      </section>

      <section className="surface-card p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Próximamente incluirá</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {upcomingFeatures.map((feature) => (
            <div
              key={feature}
              className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 text-sm font-semibold text-[var(--color-card-foreground)]"
            >
              {feature}
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card border-[color-mix(in_srgb,var(--color-warning)_42%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-warning)_12%,var(--color-card)_88%)] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          Nota interna
        </p>
        <p className="mt-3 text-sm leading-7 text-[var(--color-card-foreground)]">
          El módulo será habilitado cuando todos los componentes principales
          usen tokens visuales consistentes.
        </p>
      </section>
    </div>
  );
}

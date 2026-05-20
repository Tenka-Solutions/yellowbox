import { AppearanceSettingsForm } from "@/components/admin/appearance/AppearanceSettingsForm";
import { getAppearanceAdminData } from "@/modules/appearance/appearanceService";

export default async function AdminAppearancePage() {
  const pageData = await getAppearanceAdminData();

  return (
    <div className="grid h-full min-h-0 gap-6 overflow-y-auto pr-1">
      <section className="panel-card p-6 sm:p-8">
        <p className="section-kicker">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold">Apariencia</h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-[var(--color-muted-foreground)]">
          Ajusta el lenguaje visual global de HubCafe desde un panel seguro,
          manteniendo los defaults del sitio como respaldo.
        </p>
      </section>

      <AppearanceSettingsForm
        initialSettings={pageData.settings}
        source={pageData.source}
        warning={pageData.warning}
        updatedAt={pageData.updatedAt}
        canMutate={pageData.canMutate}
      />
    </div>
  );
}

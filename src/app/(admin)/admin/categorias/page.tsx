import Link from "next/link";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { EmptyState } from "@/components/feedback/EmptyState";
import { getAdminCategoriesPageData } from "@/modules/catalog/admin";
import type { AdminCatalogCategory } from "@/modules/catalog/admin";
import {
  deleteCategoryAction,
  setCategoryActiveAction,
} from "@/app/(admin)/admin/categorias/actions";

type SearchParams = Promise<{
  editar?: string;
  nuevo?: string;
  padre?: string;
  estado?: string;
}>;

const pageMessages: Record<string, { tone: "success" | "danger"; text: string }> =
  {
    guardada: {
      tone: "success",
      text: "Categoria guardada correctamente.",
    },
    activada: {
      tone: "success",
      text: "Categoria activada sin modificar productos existentes.",
    },
    desactivada: {
      tone: "success",
      text: "Categoria desactivada sin borrarla fisicamente.",
    },
    eliminada: {
      tone: "success",
      text: "Categoria eliminada definitivamente.",
    },
    categoria_con_productos: {
      tone: "danger",
      text: "No puedes eliminar esta categoria porque tiene productos asociados. Puedes desactivarla.",
    },
    categoria_con_subcategorias: {
      tone: "danger",
      text: "No puedes eliminar esta categoria porque tiene subcategorias. Puedes desactivarla.",
    },
    error: {
      tone: "danger",
      text: "No pudimos completar la accion. Revisa permisos y configuracion de Supabase.",
    },
  };

function buildCategoriesHref(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  return `/admin/categorias${query.size ? `?${query.toString()}` : ""}`;
}

function CategoryStatusPill({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        isActive
          ? "border-[color-mix(in_srgb,var(--color-success)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_18%,var(--color-card)_82%)] text-[var(--color-card-foreground)]"
          : "border-[color-mix(in_srgb,var(--color-muted-foreground)_38%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface-strong)_72%,var(--color-card)_28%)] text-[var(--color-card-foreground)]"
      }`}
    >
      {isActive ? "Activa" : "Inactiva"}
    </span>
  );
}

function CategoryRow({
  category,
  canMutate,
  hasChildren,
  level = 0,
}: {
  category: AdminCatalogCategory;
  canMutate: boolean;
  hasChildren: boolean;
  level?: number;
}) {
  const isParent = !category.parentId;

  return (
    <article
      className={`grid gap-4 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${
        level > 0 ? "ml-4 sm:ml-8" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryStatusPill isActive={category.isActive} />
          <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-muted-foreground)]">
            {isParent ? "Grupo principal" : "Familia comercial"}
          </span>
        </div>

        <h3 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
          {category.name}
        </h3>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          /{category.slug}
          {category.parentName ? ` · Padre: ${category.parentName}` : ""}
        </p>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
          {category.description || "Sin descripcion"}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[var(--color-muted-foreground)]">
          <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-1">
            Productos directos: {category.productCount}
          </span>
          {isParent ? (
            <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-1">
              En familias: {category.descendantProductCount}
            </span>
          ) : null}
          <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-1">
            Orden {category.sortOrder}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 md:justify-end">
        {isParent ? (
          <Link
            href={buildCategoriesHref({ nuevo: "1", padre: category.id })}
            className="button-secondary px-4 py-2 text-xs"
          >
            Crear familia
          </Link>
        ) : null}

        <Link
          href={buildCategoriesHref({ editar: category.id })}
          className="button-secondary px-4 py-2 text-xs"
        >
          Editar
        </Link>

        <form action={setCategoryActiveAction}>
          <input type="hidden" name="categoryId" value={category.id} />
          <input
            type="hidden"
            name="isActive"
            value={category.isActive ? "false" : "true"}
          />
          <button
            type="submit"
            disabled={!canMutate}
            className="button-secondary px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {category.isActive ? "Desactivar" : "Activar"}
          </button>
        </form>

        <form action={deleteCategoryAction}>
          <input type="hidden" name="categoryId" value={category.id} />
          <ConfirmSubmitButton
            disabled={!canMutate}
            className="button-secondary px-4 py-2 text-xs"
            confirmMessage="Eliminar definitivamente esta categoria no se puede deshacer. Si tiene productos o subcategorias, la accion sera bloqueada. Quieres continuar?"
          >
            Eliminar definitivamente
          </ConfirmSubmitButton>
        </form>
      </div>

      {hasChildren || category.productCount > 0 ? (
        <p className="md:col-span-2 text-xs leading-5 text-[var(--color-muted-foreground)]">
          Para eliminar definitivamente, primero debe quedar sin productos
          directos y sin familias. Mientras tanto puedes desactivarla.
        </p>
      ) : null}
    </article>
  );
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const pageData = await getAdminCategoriesPageData();
  const editingCategory = params.editar
    ? pageData.categories.find((category) => category.id === params.editar) ??
      null
    : null;
  const shouldShowForm = Boolean(params.nuevo || editingCategory);
  const message = params.estado ? pageMessages[params.estado] : null;
  const parentCategories = pageData.categories.filter(
    (category) => !category.parentId
  );
  const childCategories = pageData.categories.filter(
    (category) => category.parentId
  );
  const childrenByParent = childCategories.reduce<
    Record<string, AdminCatalogCategory[]>
  >((groups, category) => {
    if (category.parentId) {
      groups[category.parentId] = [...(groups[category.parentId] ?? []), category];
    }

    return groups;
  }, {});
  const orphanChildren = childCategories.filter(
    (category) => !pageData.categories.some((parent) => parent.id === category.parentId)
  );

  return (
    <div className="flex min-h-screen flex-col gap-6 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <section className="panel-card shrink-0 rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-kicker">Catalogo</p>
            <h1 className="mt-3 text-4xl font-semibold">Categorias</h1>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-[var(--color-muted-foreground)]">
              Fuente activa:{" "}
              <strong>
                {pageData.source === "supabase"
                  ? "Supabase"
                  : "Supabase no disponible"}
              </strong>
              . Organiza grupos principales y familias comerciales sin borrar datos
              existentes.
            </p>
          </div>

          <Link
            href={buildCategoriesHref({ nuevo: "1" })}
            className="button-primary px-6 py-3 text-sm"
          >
            Crear categoria
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-[1.25rem] bg-[var(--color-surface-strong)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Total
            </p>
            <p className="mt-2 text-2xl font-semibold">{pageData.totalCategories}</p>
          </div>
          <div className="rounded-[1.25rem] bg-[var(--color-surface-strong)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Grupos principales
            </p>
            <p className="mt-2 text-2xl font-semibold">{parentCategories.length}</p>
          </div>
          <div className="rounded-[1.25rem] bg-[var(--color-surface-strong)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Familias comerciales
            </p>
            <p className="mt-2 text-2xl font-semibold">{childCategories.length}</p>
          </div>
          <div className="rounded-[1.25rem] bg-[var(--color-surface-strong)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Permisos
            </p>
            <p className="mt-2 text-sm font-semibold">
              {pageData.canMutate ? "Edicion habilitada" : "Solo lectura"}
            </p>
          </div>
        </div>
      </section>

      {message ? (
        <div
          className={`shrink-0 rounded-[1.5rem] border p-4 text-sm font-medium ${
            message.tone === "success"
              ? "border-[color-mix(in_srgb,var(--color-success)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_16%,var(--color-card)_84%)] text-[var(--color-card-foreground)]"
              : "border-[color-mix(in_srgb,var(--color-danger)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger)_16%,var(--color-card)_84%)] text-[var(--color-card-foreground)]"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {pageData.warning ? (
        <div className="shrink-0 rounded-[1.5rem] border border-[color-mix(in_srgb,var(--color-warning)_42%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-warning)_18%,var(--color-card)_82%)] p-4 text-sm leading-7 text-[var(--color-card-foreground)]">
          {pageData.warning}
        </div>
      ) : null}

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
        <div className="grid gap-6">
          {shouldShowForm ? (
            <CategoryForm
              key={editingCategory?.id ?? `new-${params.padre ?? "parent"}`}
              categories={pageData.categories}
              category={editingCategory}
              canMutate={pageData.canMutate}
              cancelHref="/admin/categorias"
              defaultParentId={params.padre}
            />
          ) : null}

          <section className="grid gap-4">
            {parentCategories.length > 0 ? (
              parentCategories.map((parent) => (
                <div key={parent.id} className="grid gap-3">
                  <CategoryRow
                    category={parent}
                    canMutate={pageData.canMutate}
                    hasChildren={Boolean(childrenByParent[parent.id]?.length)}
                  />
                  {(childrenByParent[parent.id] ?? []).map((child) => (
                    <CategoryRow
                      key={child.id}
                      category={child}
                      canMutate={pageData.canMutate}
                      hasChildren={Boolean(childrenByParent[child.id]?.length)}
                      level={1}
                    />
                  ))}
                </div>
              ))
            ) : (
              <EmptyState
                title="No hay categorias"
                description="Crea una categoria padre para empezar a organizar el catalogo."
                actionHref="/admin/categorias?nuevo=1"
                actionLabel="Crear categoria"
              />
            )}

            {orphanChildren.length > 0 ? (
              <div className="grid gap-3 rounded-[1.75rem] border border-[color-mix(in_srgb,var(--color-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_8%,var(--color-card)_92%)] p-4">
                <p className="text-sm font-semibold text-[var(--color-card-foreground)]">
                  Familias con grupo principal no encontrado
                </p>
                {orphanChildren.map((child) => (
                  <CategoryRow
                    key={child.id}
                    category={child}
                    canMutate={pageData.canMutate}
                    hasChildren={Boolean(childrenByParent[child.id]?.length)}
                    level={1}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

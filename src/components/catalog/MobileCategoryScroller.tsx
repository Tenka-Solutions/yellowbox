"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { normalizeCatalogFilterText } from "@/modules/catalog/filters";
import type { CatalogCategory } from "@/modules/catalog/types";

const featuredCategoryTargets = [
  { slugs: ["laqtia"], names: ["laqtia"] },
  { slugs: ["mokador"], names: ["mokador"] },
  // TODO: confirmar escritura final Schoppee/Schoee y reemplazar por
  // is_featured/sort_order cuando exista en Supabase.
  {
    slugs: ["schoppe", "schoppee", "schoee"],
    names: ["schoppe", "schoppee", "schoee"],
  },
] as const;

const primaryCategoryTargets = [
  {
    slugs: ["cafe", "cafe-insumos"],
    names: ["cafe", "cafe e insumos"],
  },
  {
    slugs: ["insumos"],
    names: ["insumos"],
  },
  {
    slugs: ["maquinas"],
    names: ["maquinas"],
  },
  {
    slugs: ["vasos-accesorios", "accesorios-vasos"],
    names: ["vasos y accesorios", "accesorios y vasos"],
  },
  {
    slugs: ["capuchinos"],
    names: ["capuchinos"],
  },
  {
    slugs: ["chocolates"],
    names: ["chocolates"],
  },
  {
    slugs: ["leches", "leches-toppings"],
    names: ["leches", "leches toppings", "leches / toppings"],
  },
] as const;

function findCategory(
  categories: CatalogCategory[],
  target: { slugs: readonly string[]; names: readonly string[] }
) {
  return categories.find((category) => {
    const slug = normalizeCatalogFilterText(category.slug);
    const name = normalizeCatalogFilterText(category.name);

    return (
      target.slugs.some((targetSlug) => slug === targetSlug) ||
      target.names.some(
        (targetName) => name === normalizeCatalogFilterText(targetName)
      )
    );
  });
}

function buildMobileCategories(categories: CatalogCategory[]) {
  const selected: CatalogCategory[] = [];
  const selectedSlugs = new Set<string>();

  function addCategory(category: CatalogCategory | undefined) {
    if (!category) {
      return;
    }

    const slug = normalizeCatalogFilterText(category.slug);

    if (selectedSlugs.has(slug)) {
      return;
    }

    selectedSlugs.add(slug);
    selected.push(category);
  }

  // TODO: cuando marcas destacadas esten modeladas en Supabase, reemplazar filtro temporal por is_featured/sort_order.
  featuredCategoryTargets.forEach((target) => {
    addCategory(findCategory(categories, target));
  });

  primaryCategoryTargets.forEach((target) => {
    addCategory(findCategory(categories, target));
  });

  categories
    .filter((category) => !category.parentId)
    .forEach((category) => addCategory(category));

  return selected;
}

export function MobileCategoryScroller({
  categories,
}: {
  categories: CatalogCategory[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const mobileCategories = useMemo(
    () => buildMobileCategories(categories),
    [categories]
  );
  const activeCategory = searchParams.get("categoria") ?? "";

  function navigateToCategory(slug: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    params.delete("filtro");
    params.delete("brand");

    if (slug) {
      params.set("categoria", slug);
    } else {
      params.delete("categoria");
    }

    startTransition(() => {
      router.push(`${pathname}${params.size ? `?${params.toString()}` : ""}`);
    });
  }

  return (
    <nav aria-label="Categorias de tienda" className="-mx-4">
      <div className="overflow-x-auto scroll-smooth px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-2 whitespace-nowrap">
          <button
            type="button"
            disabled={isPending}
            aria-pressed={!activeCategory}
            onClick={() => navigateToCategory(null)}
            className={`min-h-11 rounded-full border px-4 text-sm font-bold transition disabled:cursor-wait disabled:opacity-60 ${
              !activeCategory
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[0_14px_28px_-22px_var(--color-primary)]"
                : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-ink)]"
            }`}
          >
            Todo
          </button>

          {mobileCategories.map((category) => {
            const isActive = activeCategory === category.slug;

            return (
              <button
                key={category.id}
                type="button"
                disabled={isPending}
                aria-pressed={isActive}
                onClick={() => navigateToCategory(category.slug)}
                className={`min-h-11 rounded-full border px-4 text-sm font-bold transition disabled:cursor-wait disabled:opacity-60 ${
                  isActive
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[0_14px_28px_-22px_var(--color-primary)]"
                    : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-ink)] hover:border-[color-mix(in_srgb,var(--color-primary)_58%,var(--color-border)_42%)] hover:text-[var(--color-primary)]"
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

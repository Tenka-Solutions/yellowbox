"use client";

import clsx from "clsx";
import Image from "next/image";
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

const categoryImageFallbacks: Record<string, string> = {
  mokador: "/catalog/categories/mokador.png",
  leches: "/catalog/categories/caja-de-leche.png",
  leche: "/catalog/categories/caja-de-leche.png",
  "leches-toppings": "/catalog/categories/caja-de-leche.png",
  capuchinos: "/catalog/categories/capuchino.png",
  capuchino: "/catalog/categories/capuchino.png",
  chai: "/catalog/categories/chai-masala.png",
  "chai-te-instantaneo": "/catalog/categories/chai-masala.png",
  chocolates: "/catalog/categories/chocolate.png",
  chocolate: "/catalog/categories/chocolate.png",
};

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

function getCategoryImage(category: CatalogCategory) {
  const slug = normalizeCatalogFilterText(category.slug);
  const name = normalizeCatalogFilterText(category.name);
  const imageUrl = category.imageUrl?.trim();

  return imageUrl || categoryImageFallbacks[slug] || categoryImageFallbacks[name];
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
    <nav
      aria-label="Categorias de tienda"
      className="sticky top-16 z-30 -mx-4 mt-4 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-background)_88%,transparent)] py-2 backdrop-blur-xl md:hidden"
    >
      <div className="overflow-x-auto scroll-smooth px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-2.5 whitespace-nowrap">
          <button
            type="button"
            disabled={isPending}
            aria-pressed={!activeCategory}
            onClick={() => navigateToCategory(null)}
            className={clsx(
              "inline-flex min-h-[50px] min-w-[150px] shrink-0 items-center justify-center rounded-full border px-4 py-2.5 text-sm font-extrabold whitespace-nowrap transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:cursor-wait disabled:opacity-60",
              !activeCategory
                ? "border-[color-mix(in_srgb,var(--color-primary)_70%,var(--color-border)_30%)] bg-[linear-gradient(135deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_72%,white_28%))] text-[var(--color-primary-foreground)] shadow-[0_14px_24px_-18px_var(--color-primary)]"
                : "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-card)_74%,var(--color-surface-strong)_26%)] text-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_12px_22px_-20px_rgba(35,45,47,0.34)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border)_60%)] hover:bg-[color-mix(in_srgb,var(--color-card)_92%,var(--color-primary)_8%)]"
            )}
          >
            Todos
          </button>

          {mobileCategories.map((category) => {
            const isActive = activeCategory === category.slug;
            const imageSrc = getCategoryImage(category);
            const isMokador =
              normalizeCatalogFilterText(category.slug) === "mokador" ||
              normalizeCatalogFilterText(category.name) === "mokador";

            return (
              <button
                key={category.id}
                type="button"
                disabled={isPending}
                aria-pressed={isActive}
                onClick={() => navigateToCategory(category.slug)}
                className={clsx(
                  "inline-flex min-h-[50px] min-w-[150px] shrink-0 items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-extrabold whitespace-nowrap transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:cursor-wait disabled:opacity-60",
                  isActive
                    ? "border-[color-mix(in_srgb,var(--color-primary)_70%,var(--color-border)_30%)] bg-[linear-gradient(135deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_72%,white_28%))] text-[var(--color-primary-foreground)] shadow-[0_14px_24px_-18px_var(--color-primary)]"
                    : "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-card)_74%,var(--color-surface-strong)_26%)] text-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_12px_22px_-20px_rgba(35,45,47,0.34)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border)_60%)] hover:bg-[color-mix(in_srgb,var(--color-card)_92%,var(--color-primary)_8%)]"
                )}
              >
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt=""
                    width={isMokador ? 96 : 24}
                    height={isMokador ? 34 : 24}
                    className={clsx(
                      "shrink-0 object-contain",
                      isMokador ? "h-auto w-20" : "h-6 w-6"
                    )}
                  />
                ) : null}
                <span className={clsx(isMokador && imageSrc && "sr-only")}>
                  {category.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

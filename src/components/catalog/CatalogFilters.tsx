"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CatalogCategory } from "@/modules/catalog/types";

function getCategoryLabel(
  category: CatalogCategory,
  categories: CatalogCategory[]
) {
  if (!category.parentId) {
    return category.name;
  }

  const parent = categories.find((entry) => entry.id === category.parentId);
  return parent ? `- ${category.name}` : category.name;
}

export function CatalogFilters({
  categories,
  hideCategorySelectOnMobile = false,
}: {
  categories: CatalogCategory[];
  hideCategorySelectOnMobile?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateParam(name: string, value: string, removeNames: string[] = []) {
    const params = new URLSearchParams(searchParams.toString());

    removeNames.forEach((paramName) => params.delete(paramName));

    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    startTransition(() => {
      router.push(`${pathname}${params.size ? `?${params.toString()}` : ""}`);
    });
  }

  const legacySort = searchParams.get("sort");
  const activeOrder =
    searchParams.get("orden") ?? (legacySort === "name" ? "az" : legacySort) ?? "featured";

  return (
    <div className="surface-card grid gap-4 rounded-[1.8rem] p-4 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
      <input
        defaultValue={searchParams.get("q") ?? ""}
        placeholder="Buscar por producto, marca, SKU o descripcion"
        className="form-input"
        onChange={(event) => updateParam("q", event.target.value)}
      />
      <select
        defaultValue={searchParams.get("categoria") ?? ""}
        className={
          hideCategorySelectOnMobile ? "form-input hidden md:block" : "form-input"
        }
        onChange={(event) => updateParam("categoria", event.target.value)}
      >
        <option value="">Todas las categorías</option>
        {categories.map((category) => (
          <option key={category.id} value={category.slug}>
            {getCategoryLabel(category, categories)}
          </option>
        ))}
      </select>
      <select
        defaultValue={activeOrder}
        className="form-input"
        disabled={isPending}
        onChange={(event) => updateParam("orden", event.target.value, ["sort"])}
      >
        <option value="featured">Relevancia</option>
        <option value="price-asc">Precio menor a mayor</option>
        <option value="price-desc">Precio mayor a menor</option>
        <option value="az">A-Z</option>
        <option value="za">Z-A</option>
      </select>
    </div>
  );
}

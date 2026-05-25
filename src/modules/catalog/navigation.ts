import {
  highlightedCatalogBrands,
  productMatchesBrandFilter,
} from "@/modules/catalog/filters";
import {
  getCatalogCategories,
  getCatalogProducts,
} from "@/modules/catalog/repository";
import type { CategoryNavItem } from "@/modules/catalog/types";

export async function getCategoryBrandNavItems(): Promise<CategoryNavItem[]> {
  const [categories, products] = await Promise.all([
    getCatalogCategories(),
    getCatalogProducts(),
  ]);
  const categoryItems = categories.map(
    (category): CategoryNavItem => ({
      type: "category",
      label: category.name,
      slug: category.slug,
      source: "supabase",
    })
  );
  const brandItems = highlightedCatalogBrands
    .filter((brand) =>
      products.some((product) => productMatchesBrandFilter(product, brand.value))
    )
    .map(
      (brand): CategoryNavItem => ({
        type: "brand",
        label: brand.label,
        brand: brand.value,
        source: "products",
      })
    );

  return [
    { type: "all", label: "Todos", source: "system" },
    ...categoryItems,
    ...brandItems,
  ];
}

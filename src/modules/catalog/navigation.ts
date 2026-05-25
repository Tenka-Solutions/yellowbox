import {
  highlightedCatalogCategorySlugs,
  normalizeCatalogFilterText,
} from "@/modules/catalog/filters";
import {
  getCatalogCategories,
  getCatalogProducts,
} from "@/modules/catalog/repository";
import type {
  CatalogCategory,
  CatalogProduct,
  CategoryNavItem,
} from "@/modules/catalog/types";

const categoryOrder = [
  ...highlightedCatalogCategorySlugs,
  "cafe",
  "maquinas",
  "insumos",
  "cafe-insumos",
  "capuchinos",
  "chocolates",
  "leches",
  "leches-toppings",
  "vasos-accesorios",
] as const;

const highlightedCategorySlugSet = new Set<string>(
  highlightedCatalogCategorySlugs
);

function collectCategoryAndDescendantSlugs(
  categories: CatalogCategory[],
  category: CatalogCategory
) {
  const slugs = new Set([normalizeCatalogFilterText(category.slug)]);
  const pending = [category.id];

  while (pending.length > 0) {
    const parentId = pending.shift();
    const children = categories.filter(
      (candidate) => candidate.parentId === parentId
    );

    children.forEach((child) => {
      const childSlug = normalizeCatalogFilterText(child.slug);
      if (!slugs.has(childSlug)) {
        slugs.add(childSlug);
        pending.push(child.id);
      }
    });
  }

  return slugs;
}

function categoryHasPublicProducts(
  category: CatalogCategory,
  categories: CatalogCategory[],
  products: CatalogProduct[]
) {
  const slugs = collectCategoryAndDescendantSlugs(categories, category);

  return products.some((product) =>
    slugs.has(normalizeCatalogFilterText(product.categorySlug))
  );
}

function toCategoryNavItem(category: CatalogCategory): CategoryNavItem {
  return {
    type: "category",
    label: category.name,
    slug: category.slug,
    source: "supabase",
    isFeatured: highlightedCategorySlugSet.has(
      normalizeCatalogFilterText(category.slug)
    ),
  };
}

export async function getCategoryBrandNavItems(): Promise<CategoryNavItem[]> {
  const [categories, products] = await Promise.all([
    getCatalogCategories(),
    getCatalogProducts(),
  ]);
  const categoryBySlug = new Map(
    categories.map((category) => [
      normalizeCatalogFilterText(category.slug),
      category,
    ])
  );
  const items: CategoryNavItem[] = [];
  const addedSlugs = new Set<string>();

  function addCategory(category: CatalogCategory) {
    const slug = normalizeCatalogFilterText(category.slug);

    if (addedSlugs.has(slug)) {
      return;
    }

    const isHighlighted = highlightedCategorySlugSet.has(slug);
    if (
      isHighlighted &&
      !categoryHasPublicProducts(category, categories, products)
    ) {
      return;
    }

    addedSlugs.add(slug);
    items.push(toCategoryNavItem(category));
  }

  categoryOrder.forEach((slug) => {
    const category = categoryBySlug.get(slug);
    if (category) {
      addCategory(category);
    }
  });

  categories.forEach(addCategory);

  return [
    { type: "all", label: "Todos", source: "system" },
    ...items,
  ];
}

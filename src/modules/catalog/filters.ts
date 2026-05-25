import type { CatalogCategory, CatalogProduct } from "@/modules/catalog/types";

export type CoffeeSupplyFilterValue =
  | "all"
  | "mokador"
  | "schoppe"
  | "laqtia"
  | "cafes"
  | "leches"
  | "capuchinos"
  | "chocolates"
  | "chai";

export type CoffeeSupplyFilter = {
  label: string;
  mark: string;
  value: CoffeeSupplyFilterValue;
  kind: "all" | "brand" | "family";
};

type HighlightedBrandValue = Extract<
  CoffeeSupplyFilterValue,
  "mokador" | "schoppe" | "laqtia"
>;

export const coffeeSupplyFilters = [
  { label: "Todos", mark: "T", value: "all", kind: "all" },
  { label: "Mokador", mark: "M", value: "mokador", kind: "brand" },
  { label: "Schoppe", mark: "S", value: "schoppe", kind: "brand" },
  { label: "Laqtia", mark: "L", value: "laqtia", kind: "brand" },
  { label: "Cafés", mark: "CA", value: "cafes", kind: "family" },
  { label: "Leches", mark: "LE", value: "leches", kind: "family" },
  { label: "Capuchinos", mark: "CP", value: "capuchinos", kind: "family" },
  { label: "Chocolates", mark: "CH", value: "chocolates", kind: "family" },
  { label: "Chai", mark: "AI", value: "chai", kind: "family" },
] as const satisfies readonly CoffeeSupplyFilter[];

const coffeeSupplyRootSlugs = new Set([
  "cafe-insumos",
  "cafe-instantaneo",
  "cafe-grano",
]);

const brandAliases: Record<HighlightedBrandValue, string[]> = {
  mokador: ["mokador"],
  schoppe: ["schoppe", "schope"],
  laqtia: ["laqtia", "lactia"],
};

export const highlightedCatalogBrands = [
  { label: "Mokador", mark: "M", value: "mokador", aliases: brandAliases.mokador },
  { label: "Laqtia", mark: "L", value: "laqtia", aliases: brandAliases.laqtia },
  { label: "Schoppe", mark: "S", value: "schoppe", aliases: brandAliases.schoppe },
] as const satisfies readonly {
  label: string;
  mark: string;
  value: HighlightedBrandValue;
  aliases: readonly string[];
}[];

const familySlugs: Record<
  Extract<
    CoffeeSupplyFilterValue,
    "cafes" | "leches" | "capuchinos" | "chocolates" | "chai"
  >,
  string[]
> = {
  cafes: ["cafe-en-grano", "cafe-grano", "cafe-instantaneo"],
  leches: ["leches-toppings"],
  capuchinos: ["capuchinos", "mokachinos"],
  chocolates: ["chocolates"],
  chai: ["chai-te-instantaneo"],
};

export function normalizeCatalogFilterText(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function getCoffeeSupplyFilter(
  value: string | null | undefined
): CoffeeSupplyFilterValue {
  const normalized = normalizeCatalogFilterText(value);

  return coffeeSupplyFilters.some((filter) => filter.value === normalized)
    ? (normalized as CoffeeSupplyFilterValue)
    : "all";
}

export function getHighlightedBrandFilter(value: string | null | undefined) {
  const normalized = normalizeCatalogFilterText(value);

  return (
    highlightedCatalogBrands.find(
      (brand) =>
        brand.value === normalized ||
        brand.aliases.some(
          (alias) => normalizeCatalogFilterText(alias) === normalized
        )
    )?.value ?? null
  );
}

function findCategoryBySlug(categories: CatalogCategory[], slug: string) {
  const normalizedSlug = normalizeCatalogFilterText(slug);

  return categories.find(
    (category) => normalizeCatalogFilterText(category.slug) === normalizedSlug
  );
}

function collectDescendantSlugs(
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
      const slug = normalizeCatalogFilterText(child.slug);
      if (!slugs.has(slug)) {
        slugs.add(slug);
        pending.push(child.id);
      }
    });
  }

  return slugs;
}

export function isCoffeeSupplyCategory(
  slug: string | null | undefined,
  categories: CatalogCategory[]
) {
  const normalizedSlug = normalizeCatalogFilterText(slug);

  if (coffeeSupplyRootSlugs.has(normalizedSlug)) {
    return true;
  }

  const root = findCategoryBySlug(categories, "cafe-insumos");
  if (!root) {
    return false;
  }

  return collectDescendantSlugs(categories, root).has(normalizedSlug);
}

function productMatchesBrand(product: CatalogProduct, filter: CoffeeSupplyFilterValue) {
  if (filter !== "mokador" && filter !== "schoppe" && filter !== "laqtia") {
    return false;
  }

  return productMatchesBrandFilter(product, filter);
}

export function productMatchesBrandFilter(
  product: CatalogProduct,
  value: string | null | undefined
) {
  const normalizedFilter = normalizeCatalogFilterText(value);

  if (!normalizedFilter) {
    return false;
  }

  const highlightedBrand = getHighlightedBrandFilter(normalizedFilter);
  const aliases = highlightedBrand
    ? brandAliases[highlightedBrand]
    : [normalizedFilter];
  const brand = normalizeCatalogFilterText(product.brand);

  return aliases.some((alias) => normalizeCatalogFilterText(alias) === brand);
}

function productMatchesFamily(
  product: CatalogProduct,
  filter: CoffeeSupplyFilterValue
) {
  if (
    filter !== "cafes" &&
    filter !== "leches" &&
    filter !== "capuchinos" &&
    filter !== "chocolates" &&
    filter !== "chai"
  ) {
    return false;
  }

  const productSlug = normalizeCatalogFilterText(product.categorySlug);
  return familySlugs[filter].some(
    (slug) => normalizeCatalogFilterText(slug) === productSlug
  );
}

export function filterCoffeeSupplyProducts(
  products: CatalogProduct[],
  filterValue: string | null | undefined
) {
  const filter = getCoffeeSupplyFilter(filterValue);

  if (filter === "all") {
    return products;
  }

  return products.filter(
    (product) =>
      productMatchesBrand(product, filter) || productMatchesFamily(product, filter)
  );
}

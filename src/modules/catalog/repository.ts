import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CatalogCategory,
  CatalogFilters,
  CatalogProduct,
} from "@/modules/catalog/types";
import {
  filterCoffeeSupplyProducts,
  productMatchesBrandFilter,
} from "@/modules/catalog/filters";

const publicCategorySlugAliases: Record<string, string> = {
  "cafe-grano": "cafe-en-grano",
  "cafe-instantaneo": "cafe-insumos",
  "accesorios-vasos": "vasos-accesorios",
};

const publicParentCategoryLegacySlugs: Record<string, string[]> = {
  "cafe-insumos": ["cafe-grano", "cafe-instantaneo"],
  "vasos-accesorios": ["accesorios-vasos"],
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function isPublicCategory(category: CatalogCategory) {
  return category.isVisible && (category.isActive ?? true);
}

function hasCategorySlug(categories: CatalogCategory[], slug: string) {
  return categories.some((category) => category.slug === slug);
}

function resolveCategorySlug(slug: string, categories: CatalogCategory[]) {
  const canonicalSlug = publicCategorySlugAliases[slug];

  if (canonicalSlug && hasCategorySlug(categories, canonicalSlug)) {
    return canonicalSlug;
  }

  return slug;
}

function shouldShowCategoryInPublicNavigation(
  category: CatalogCategory,
  categories: CatalogCategory[]
) {
  if (!isPublicCategory(category)) {
    return false;
  }

  const canonicalSlug = publicCategorySlugAliases[category.slug];
  return !(canonicalSlug && hasCategorySlug(categories, canonicalSlug));
}

function getEquivalentCategorySlugs(
  slug: string,
  categories: CatalogCategory[]
) {
  const canonicalSlug = resolveCategorySlug(slug, categories);
  const slugs = new Set([slug, canonicalSlug]);

  Object.entries(publicCategorySlugAliases).forEach(([legacySlug]) => {
    if (resolveCategorySlug(legacySlug, categories) === canonicalSlug) {
      slugs.add(legacySlug);
    }
  });

  publicParentCategoryLegacySlugs[canonicalSlug]?.forEach((legacySlug) => {
    slugs.add(legacySlug);
  });

  return slugs;
}

function collectCategoryAndDescendantIds(
  categories: CatalogCategory[],
  category: CatalogCategory
) {
  const ids = new Set([category.id]);
  const pending = [category.id];

  while (pending.length > 0) {
    const parentId = pending.shift();
    const children = categories.filter(
      (candidate) => candidate.parentId === parentId
    );

    children.forEach((child) => {
      if (!ids.has(child.id)) {
        ids.add(child.id);
        pending.push(child.id);
      }
    });
  }

  return ids;
}

function getProductCategoryId(
  product: CatalogProduct,
  categories: CatalogCategory[]
) {
  return (
    product.categoryId ??
    categories.find((category) => category.slug === product.categorySlug)?.id ??
    null
  );
}

function getCategoryIdsForSlug(
  categories: CatalogCategory[],
  slug: string
) {
  const equivalentSlugs = getEquivalentCategorySlugs(slug, categories);
  const ids = new Set<string>();

  categories
    .filter((category) => equivalentSlugs.has(category.slug))
    .forEach((category) => {
      collectCategoryAndDescendantIds(categories, category).forEach((id) =>
        ids.add(id)
      );
    });

  return ids;
}

function applyFilters(
  products: CatalogProduct[],
  categories: CatalogCategory[],
  filters: CatalogFilters = {}
) {
  const publicCategoryIds = new Set(
    categories.filter(isPublicCategory).map((category) => category.id)
  );
  let result = products.filter(
    (product) =>
      product.publicationStatus === "published" &&
      // The storefront can add products to cart, so zero-price items stay hidden
      // until a quote-only public flow is implemented.
      product.priceClpTaxInc > 0 &&
      publicCategoryIds.has(getProductCategoryId(product, categories) ?? "")
  );

  if (filters.category) {
    const categoryIds = getCategoryIdsForSlug(categories, filters.category);
    result = result.filter((product) =>
      categoryIds.has(getProductCategoryId(product, categories) ?? "")
    );
  }

  if (filters.brand) {
    result = result.filter((product) =>
      productMatchesBrandFilter(product, filters.brand)
    );
  }

  if (filters.coffeeSupplyFilter) {
    result = filterCoffeeSupplyProducts(result, filters.coffeeSupplyFilter);
  }

  if (filters.featuredOnly) {
    result = result.filter((product) => product.isFeatured);
  }

  if (filters.query?.trim()) {
    const normalizedQuery = normalizeText(filters.query);
    result = result.filter((product) =>
      normalizeText(
        [
          product.name,
          product.shortDescription,
          product.longDescription,
          product.sku ?? "",
          product.ean ?? "",
          product.brand ?? "",
          product.highlights.join(" "),
        ].join(" ")
      ).includes(normalizedQuery)
    );
  }

  switch (filters.sort) {
    case "price-asc":
      result.sort((left, right) => left.priceClpTaxInc - right.priceClpTaxInc);
      break;
    case "price-desc":
      result.sort((left, right) => right.priceClpTaxInc - left.priceClpTaxInc);
      break;
    case "name":
    case "az":
      result.sort((left, right) => left.name.localeCompare(right.name, "es"));
      break;
    case "name-desc":
    case "za":
      result.sort((left, right) => right.name.localeCompare(left.name, "es"));
      break;
    default:
      result.sort((left, right) => {
        if (left.isFeatured !== right.isFeatured) {
          return Number(right.isFeatured) - Number(left.isFeatured);
        }

        return left.sortOrder - right.sortOrder;
      });
  }

  return filters.limit ? result.slice(0, filters.limit) : result;
}

const readCatalogFromSupabase = cache(async () => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  try {
    const [categoriesResponse, productsResponse] = await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

    if (categoriesResponse.error || productsResponse.error) {
      return null;
    }

    const categories = (categoriesResponse.data ?? []).map(
      (category): CatalogCategory => ({
        id: category.id,
        parentId: category.parent_id ?? null,
        slug: category.slug,
        name: category.name,
        description: category.description ?? "",
        imageUrl: category.image_url ?? null,
        sortOrder: category.sort_order ?? 0,
        isVisible: category.is_visible ?? category.is_active ?? true,
        isActive: category.is_active ?? category.is_visible ?? true,
        seoTitle: category.seo_title ?? category.name,
        seoDescription:
          category.seo_description ?? category.description ?? category.name,
      })
    );

    const products = (productsResponse.data ?? []).map((product) => {
      const categoryFromId = categories.find(
        (category) => category.id === product.category_id
      );
      const primaryImage =
        product.primary_image_path ?? "/catalog/cutouts/image1.png";
      const galleryImages = Array.isArray(product.gallery_images)
        ? product.gallery_images.filter(Boolean)
        : [];
      const gallery = Array.from(new Set([primaryImage, ...galleryImages]));
      const grossPrice =
        product.gross_price_clp ?? product.price_clp_tax_inc ?? 0;
      const netPrice =
        product.net_price_clp ?? Math.round(grossPrice / 1.19);

      return {
        id: product.id,
        slug: product.slug,
        sku: product.sku ?? null,
        ean: product.ean ?? null,
        categoryId: product.category_id,
        categorySlug:
          product.category_slug ?? categoryFromId?.slug ?? "accesorios-vasos",
        name: product.name,
        shortDescription: product.short_description ?? "",
        longDescription: product.long_description ?? "",
        netPriceClp: netPrice,
        grossPriceClp: grossPrice,
        priceClpTaxInc: grossPrice,
        image: primaryImage,
        gallery,
        publicationStatus: product.publication_status ?? "published",
        availabilityStatus: product.availability_status ?? "available",
        isFeatured: product.is_featured ?? false,
        brand: product.brand ?? null,
        stockQuantity: product.stock_quantity ?? null,
        seoTitle: product.seo_title ?? product.name,
        seoDescription:
          product.seo_description ?? product.short_description ?? product.name,
        sortOrder: product.sort_order ?? 0,
        highlights: Array.isArray(product.highlights) ? product.highlights : [],
      } satisfies CatalogProduct;
    });

    return { categories, products };
  } catch {
    return null;
  }
});

export async function getCatalogCategories() {
  const remoteCatalog = await readCatalogFromSupabase();
  const categories = remoteCatalog?.categories ?? [];

  return categories.filter((category) =>
    shouldShowCategoryInPublicNavigation(category, categories)
  );
}

export async function getCatalogCategoryBySlug(slug: string) {
  const remoteCatalog = await readCatalogFromSupabase();
  const categories = (remoteCatalog?.categories ?? []).filter(isPublicCategory);
  const resolvedSlug = resolveCategorySlug(slug, categories);

  return (
    categories.find((category) => category.slug === resolvedSlug) ??
    categories.find((category) => category.slug === slug) ??
    null
  );
}

export async function getCatalogProducts(filters: CatalogFilters = {}) {
  const remoteCatalog = await readCatalogFromSupabase();
  const categories = remoteCatalog?.categories ?? [];
  const products = remoteCatalog?.products ?? [];

  return applyFilters(products, categories, filters);
}

export async function getFeaturedCatalogProducts(limit = 6) {
  return getCatalogProducts({
    featuredOnly: true,
    limit,
    sort: "featured",
  });
}

export async function getCatalogProductBySlug(slug: string) {
  const products = await getCatalogProducts();
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getCatalogProductsByCategory(category: string) {
  return getCatalogProducts({ category });
}

export async function getAdminCatalogSnapshot() {
  const remoteCatalog = await readCatalogFromSupabase();

  return {
    source: remoteCatalog ? "supabase" : "unavailable",
    categories: remoteCatalog?.categories ?? [],
    products: remoteCatalog?.products ?? [],
  } as const;
}

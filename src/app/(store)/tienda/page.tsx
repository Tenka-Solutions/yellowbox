import { CategoryBrandNav } from "@/components/catalog/CategoryBrandNav";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { MobileProductScroller } from "@/components/catalog/MobileProductScroller";
import { ProductCard } from "@/components/catalog/ProductCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { isCoffeeSupplyCategory } from "@/modules/catalog/filters";
import { getCategoryBrandNavItems } from "@/modules/catalog/navigation";
import {
  getCatalogCategories,
  getCatalogProducts,
} from "@/modules/catalog/repository";

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    brand?: string;
    filtro?: string;
    orden?: "featured" | "price-asc" | "price-desc" | "az" | "za";
    sort?: "featured" | "price-asc" | "price-desc" | "name" | "name-desc";
  }>;
}) {
  const params = await searchParams;
  const [categories, navItems] = await Promise.all([
    getCatalogCategories(),
    getCategoryBrandNavItems(),
  ]);
  const showCoffeeSupplyFilters = Boolean(
    !params.brand &&
      params.categoria &&
      isCoffeeSupplyCategory(params.categoria, categories)
  );
  const products = await getCatalogProducts({
    query: params.q,
    category: params.categoria,
    brand: params.brand,
    coffeeSupplyFilter: showCoffeeSupplyFilters ? params.filtro : undefined,
    sort: params.orden ?? params.sort ?? "featured",
  });

  return (
    <div className="page-shell pt-1">
      <CategoryBrandNav items={navItems} currentParams={params} />
      <div className="mt-4">
        <CatalogFilters categories={categories} hideCategorySelectOnMobile />
      </div>
      <div className="mt-3">
        {products.length ? (
          <>
            <div className="md:hidden">
              <MobileProductScroller products={products} />
            </div>
            <div className="hidden gap-6 md:grid md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title="No encontramos coincidencias"
            description="Ajusta la búsqueda o vuelve al catálogo completo para seguir explorando."
            actionHref="/tienda"
            actionLabel="Limpiar filtros"
          />
        )}
      </div>
    </div>
  );
}

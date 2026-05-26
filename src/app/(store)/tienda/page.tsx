import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { CoffeeSupplyFilterBar } from "@/components/catalog/CoffeeSupplyFilterBar";
import { MobileCategoryScroller } from "@/components/catalog/MobileCategoryScroller";
import { MobileProductScroller } from "@/components/catalog/MobileProductScroller";
import { ProductCard } from "@/components/catalog/ProductCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { isCoffeeSupplyCategory } from "@/modules/catalog/filters";
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
    filtro?: string;
    orden?: "featured" | "price-asc" | "price-desc" | "az" | "za";
    sort?: "featured" | "price-asc" | "price-desc" | "name" | "name-desc";
  }>;
}) {
  const params = await searchParams;
  const categories = await getCatalogCategories();
  const showCoffeeSupplyFilters = Boolean(
    params.categoria && isCoffeeSupplyCategory(params.categoria, categories)
  );
  const products = await getCatalogProducts({
    query: params.q,
    category: params.categoria,
    coffeeSupplyFilter: showCoffeeSupplyFilters ? params.filtro : undefined,
    sort: params.orden ?? params.sort ?? "featured",
  });

  return (
    <div className="page-shell pt-5">
      <MobileCategoryScroller categories={categories} />
      <div className="mt-4">
        <CatalogFilters categories={categories} hideCategorySelectOnMobile />
      </div>
      {showCoffeeSupplyFilters ? (
        <div className="mt-3 hidden md:block">
          <CoffeeSupplyFilterBar />
        </div>
      ) : null}
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

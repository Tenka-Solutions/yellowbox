import Link from "next/link";
import Image from "next/image";
import {
  getHighlightedBrandFilter,
  normalizeCatalogFilterText,
} from "@/modules/catalog/filters";
import type { CategoryNavItem } from "@/modules/catalog/types";

type CategoryBrandNavParams = {
  q?: string;
  categoria?: string;
  brand?: string;
  orden?: string;
  sort?: string;
};

function appendParam(
  params: URLSearchParams,
  name: string,
  value: string | undefined
) {
  if (value?.trim()) {
    params.set(name, value);
  }
}

function buildHref(item: CategoryNavItem, currentParams: CategoryBrandNavParams) {
  const params = new URLSearchParams();

  appendParam(params, "q", currentParams.q);
  appendParam(params, "orden", currentParams.orden);
  appendParam(params, "sort", currentParams.sort);

  if (item.type === "category") {
    params.set("categoria", item.slug);
  }

  if (item.type === "brand") {
    params.set("brand", item.brand);
  }

  return `/tienda${params.size ? `?${params.toString()}` : ""}`;
}

const navImageFallbacks: Record<string, string> = {
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

function getItemImage(item: CategoryNavItem) {
  if (item.type === "all") {
    return null;
  }

  const slugOrBrand =
    item.type === "category"
      ? normalizeCatalogFilterText(item.slug)
      : normalizeCatalogFilterText(item.brand);
  const label = normalizeCatalogFilterText(item.label);

  return (
    item.imageUrl?.trim() ||
    navImageFallbacks[slugOrBrand] ||
    navImageFallbacks[label] ||
    null
  );
}

function getItemMark(item: CategoryNavItem) {
  if (item.type === "all") {
    return "T";
  }

  if (item.type === "brand") {
    return item.label.slice(0, 1).toUpperCase();
  }

  const words = item.label
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean);

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function isItemActive(item: CategoryNavItem, currentParams: CategoryBrandNavParams) {
  const activeBrand =
    getHighlightedBrandFilter(currentParams.brand) ??
    normalizeCatalogFilterText(currentParams.brand);
  const activeCategory = activeBrand ? "" : currentParams.categoria ?? "";

  if (item.type === "all") {
    return !currentParams.categoria && !currentParams.brand;
  }

  if (item.type === "category") {
    return item.slug === activeCategory;
  }

  return normalizeCatalogFilterText(item.brand) === activeBrand;
}

export function CategoryBrandNav({
  items,
  currentParams,
}: {
  items: CategoryNavItem[];
  currentParams: CategoryBrandNavParams;
}) {
  return (
    <nav
      aria-label="Categorias y marcas"
      className="sticky top-[4.75rem] z-30 -mx-2 rounded-[1.65rem] border border-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-border)_86%)] bg-[color-mix(in_srgb,var(--color-card)_88%,transparent)] p-2 shadow-[0_18px_42px_-36px_rgba(35,45,47,0.42)] backdrop-blur-xl sm:mx-0"
    >
      <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-2 p-0.5 sm:gap-3">
          {items.map((item) => {
            const isActive = isItemActive(item, currentParams);
            const isFeaturedItem = item.type !== "all" && item.isFeatured;
            const imageSrc = getItemImage(item);
            const normalizedKey =
              item.type === "category"
                ? normalizeCatalogFilterText(item.slug)
                : item.type === "brand"
                  ? normalizeCatalogFilterText(item.brand)
                  : "";
            const isMokador = normalizedKey === "mokador";
            const key =
              item.type === "category"
                ? `category-${item.slug}`
                : item.type === "brand"
                  ? `brand-${item.brand}`
                  : "all";

            return (
              <Link
                key={key}
                href={buildHref(item, currentParams)}
                aria-current={isActive ? "page" : undefined}
                prefetch={false}
                className={`group inline-flex min-h-12 min-w-[9rem] shrink-0 touch-manipulation items-center justify-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-extrabold transition duration-200 active:scale-[0.98] sm:min-h-14 sm:min-w-[10rem] sm:px-5 ${
                  isActive
                    ? "border-[color-mix(in_srgb,var(--color-primary)_58%,var(--color-border)_42%)] bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-hover)_100%)] text-[var(--color-primary-foreground)] shadow-[0_16px_28px_-22px_var(--color-primary)]"
                    : isFeaturedItem
                      ? "border-[color-mix(in_srgb,var(--color-primary)_44%,var(--color-border)_56%)] bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-card)_88%)] text-[var(--color-primary)] shadow-[0_15px_30px_-24px_var(--color-primary)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-primary)_70%,var(--color-border)_30%)] hover:bg-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-card)_82%)]"
                    : "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-card)_78%,var(--color-surface-strong)_22%)] text-[var(--color-ink)] shadow-[0_12px_26px_-28px_rgba(35,45,47,0.42)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-primary)_58%,var(--color-border)_42%)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card)_92%)] hover:text-[var(--color-primary)]"
                }`}
              >
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt=""
                    width={isMokador ? 96 : 24}
                    height={isMokador ? 34 : 24}
                    className={`shrink-0 object-contain ${
                      isMokador ? "h-auto w-20" : "h-6 w-6"
                    }`}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-[0.66rem] font-black ${
                      isActive
                        ? "border-[color-mix(in_srgb,var(--color-primary-foreground)_46%,transparent)] bg-[color-mix(in_srgb,var(--color-primary-foreground)_18%,transparent)] text-[var(--color-primary-foreground)]"
                        : isFeaturedItem
                          ? "border-[color-mix(in_srgb,var(--color-primary)_36%,var(--color-border)_64%)] bg-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-card)_82%)] text-[var(--color-primary)]"
                        : "border-[color-mix(in_srgb,var(--color-secondary)_32%,var(--color-border)_68%)] bg-[color-mix(in_srgb,var(--color-surface-strong)_72%,var(--color-card)_28%)] text-[var(--color-secondary)] group-hover:border-[color-mix(in_srgb,var(--color-primary)_38%,var(--color-border)_62%)] group-hover:text-[var(--color-primary)]"
                    }`}
                  >
                    {getItemMark(item)}
                  </span>
                )}
                <span
                  className={`min-w-0 truncate ${
                    isMokador && imageSrc ? "sr-only" : ""
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

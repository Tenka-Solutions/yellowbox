"use client";

import Image from "next/image";
import { toast } from "sonner";
import { formatClp } from "@/lib/format/currency";
import { useCartStore } from "@/lib/cart-store";
import type { CatalogProduct } from "@/modules/catalog/types";

interface HeroCarouselProps {
  products: CatalogProduct[];
}

export function HeroCarousel({ products }: HeroCarouselProps) {
  const addItem = useCartStore((store) => store.addItem);

  if (!products.length) return null;

  const carouselProducts = [...products, ...products];

  function handleAdd(product: CatalogProduct) {
    addItem(product);
    toast.success(`${product.name} agregado al carrito`);
  }

  return (
    <div className="mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,black_6%,black_92%,transparent_100%)]">
      <div className="hero-carousel-track flex w-max gap-4 pb-2">
        {carouselProducts.map((product, index) => (
          <article
            key={`${product.id}-${index}`}
            className="w-[220px] shrink-0 rounded-[1.25rem] border border-[var(--color-hero-border)] bg-[var(--color-hero-card)] p-3 sm:w-[240px]"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--color-surface-soft)]">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="240px"
                className="pointer-events-none object-contain p-4"
                draggable={false}
              />
            </div>
            <div className="mt-3 px-1">
              <h3 className="line-clamp-1 text-sm font-semibold text-[var(--color-hero-foreground)]">
                {product.name}
              </h3>
              <p className="mt-1 text-sm font-bold text-[var(--color-price)]">
                {formatClp(product.priceClpTaxInc)}
              </p>
              <button
                type="button"
                onClick={() => handleAdd(product)}
                className="button-gold mt-3 w-full px-4 py-2 text-xs"
              >
                Agregar
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

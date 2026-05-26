"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { formatClp } from "@/lib/format/currency";
import { useCartStore } from "@/lib/cart-store";
import type { CatalogProduct } from "@/modules/catalog/types";

function MobileAddButton({ product }: { product: CatalogProduct }) {
  const [isAdding, setIsAdding] = useState(false);
  const lastInteractionRef = useRef(0);
  const isUnavailable = product.availabilityStatus === "sold_out";

  function handleAdd(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isUnavailable || isAdding) {
      return;
    }

    const now = Date.now();

    if (now - lastInteractionRef.current < 350) {
      return;
    }

    lastInteractionRef.current = now;
    setIsAdding(true);

    try {
      useCartStore.getState().addItem(product);
      toast.success(`${product.name} agregado al carrito`);
    } catch {
      toast.error("No pudimos agregar el producto. Intenta nuevamente.");
    } finally {
      window.setTimeout(() => {
        setIsAdding(false);
      }, 180);
    }
  }

  return (
    <button
      type="button"
      disabled={isUnavailable || isAdding}
      onClick={handleAdd}
      className="mt-3 inline-flex min-h-10 w-full select-none items-center justify-center rounded-full bg-[var(--color-primary)] px-3 text-xs font-bold text-[var(--color-primary-foreground)] transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 [touch-action:manipulation]"
    >
      {isUnavailable ? "Sin stock" : isAdding ? "Agregando..." : "Agregar"}
    </button>
  );
}

export function MobileProductScroller({
  products,
}: {
  products: CatalogProduct[];
}) {
  const scrollerProducts =
    products.length > 4 ? [...products, ...products] : products;

  return (
    <section aria-label="Productos de tienda" className="-mx-4">
      <div className="overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max snap-x snap-mandatory gap-3">
          {scrollerProducts.map((product, index) => (
            <article
              key={`${product.id}-${index}`}
              className="flex w-[156px] min-w-[156px] shrink-0 snap-start flex-col rounded-[var(--radius-medium)] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-[var(--shadow-card)]"
            >
              <Link
                href={`/productos/${product.slug}`}
                className="block overflow-hidden rounded-t-[var(--radius-medium)] border-b border-[var(--color-border)] bg-[var(--color-surface-strong)]"
              >
                <span className="relative block aspect-square">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="156px"
                    className="object-contain p-3"
                  />
                </span>
              </Link>

              <div className="flex flex-1 flex-col p-3">
                {product.brand ? (
                  <p className="line-clamp-1 text-[10px] font-semibold uppercase text-[var(--color-muted-foreground)]">
                    {product.brand}
                  </p>
                ) : null}
                <Link
                  href={`/productos/${product.slug}`}
                  className="mt-1 min-h-10 text-xs font-semibold leading-5 text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                >
                  <span className="line-clamp-2">{product.name}</span>
                </Link>
                <p className="mt-2 text-base font-black text-[var(--color-price)]">
                  {formatClp(product.priceClpTaxInc)}
                </p>
                <MobileAddButton product={product} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

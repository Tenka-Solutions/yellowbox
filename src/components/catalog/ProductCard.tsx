import Image from "next/image";
import Link from "next/link";
import { CatalogProduct } from "@/modules/catalog/types";
import { AvailabilityBadge } from "@/components/catalog/AvailabilityBadge";
import { PriceTag } from "@/components/catalog/PriceTag";
import { AddToCartButton } from "@/components/catalog/AddToCartButton";

export function ProductCard({ product }: { product: CatalogProduct }) {
  return (
    <article className="flex h-full flex-col rounded-[var(--radius-large)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-[var(--color-card-foreground)] shadow-[var(--shadow-card)]">
      <div className="relative overflow-hidden rounded-[var(--radius-medium)] border border-[var(--color-border)] bg-[var(--color-surface-strong)]">
        <div className="absolute left-4 top-4 z-10">
          <AvailabilityBadge status={product.availabilityStatus} />
        </div>
        <div className="relative aspect-[4/3]">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width: 1280px) 360px, (min-width: 768px) 40vw, 100vw"
            className="object-contain p-6"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-2 pt-5">
        <h3 className="text-[length:var(--font-size-section-title)] font-semibold leading-tight text-[var(--color-ink)]">
          {product.name}
        </h3>
        <p className="mt-3 text-[length:var(--font-size-small)] leading-7 text-[var(--color-muted-foreground)]">
          {product.shortDescription}
        </p>

        <div className="mt-4 grid gap-2 text-[length:var(--font-size-small)] text-[var(--color-muted-foreground)]">
          {product.highlights.slice(0, 3).map((highlight) => (
            <div key={highlight} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              <span>{highlight}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto border-t border-[var(--color-border)] pt-5">
          <PriceTag value={product.priceClpTaxInc} />
          <div className="mt-4 grid gap-2">
            <AddToCartButton product={product} />
            <Link
              href={`/productos/${product.slug}`}
              className="button-secondary px-5 py-3 text-sm"
            >
              Ver detalle
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

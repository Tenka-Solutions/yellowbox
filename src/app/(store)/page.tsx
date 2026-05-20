import Image from "next/image";
import Link from "next/link";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { TrustSignals } from "@/components/home/TrustSignals";

import { getFeaturedCatalogProducts } from "@/modules/catalog/repository";

const desktopBanners = [
  {
    src: "/banner_hubcafe_strip.png",
    alt: "Despacho a todo Chile, precios con IVA incluido y asesoría personalizada",
  },
  {
    src: "/banner_hubcafe_strip.png",
    alt: "Despacho a todo Chile, precios con IVA incluido y asesoría personalizada",
  },
  {
    src: "/banner_hubcafe_strip.png",
    alt: "Despacho a todo Chile, precios con IVA incluido y asesoría personalizada",
  },
];

export default async function HomePage() {
  const featuredProducts = await getFeaturedCatalogProducts(8);

  return (
    <div>
      <section className="hidden w-full overflow-x-auto bg-black [scroll-snap-type:x_mandatory] [scrollbar-width:none] [-ms-overflow-style:none] lg:block [&::-webkit-scrollbar]:hidden" aria-label="Beneficios de compra">
        <div className="flex w-max">
          {desktopBanners.map((banner, index) => (
            <Image
              key={`${banner.src}-${index}`}
              src={banner.src}
              alt={banner.alt}
              width={1818}
              height={125}
              priority={index === 0}
              sizes="100vw"
              className="block h-auto w-screen shrink-0 snap-start"
            />
          ))}
        </div>
      </section>
      
      {/* Hero */}
      <section className="bg-(--color-hero) text-(--color-hero-foreground)">
        <div className="page-shell pb-12 pt-8 sm:pb-16 sm:pt-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[0.74rem] font-bold uppercase tracking-[0.24em] text-(--color-primary)">
                Ecommerce oficial
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-(--color-hero-foreground) sm:text-4xl lg:text-5xl">
                Máquinas de café, café e insumos para tu negocio
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-(--color-hero-muted) sm:text-base">
                Precios con IVA incluido · Despacho a todo Chile
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <Link href="/tienda" className="button-gold px-6 py-3 text-sm">
                Comprar productos
              </Link>
              <Link
                href="/cotizar"
                className="inline-flex items-center justify-content rounded-full border border-(--color-hero-border) px-6 py-3 text-sm font-semibold text-(--color-hero-foreground) hover:border-(--color-primary)"
              >
                Solicitar cotización
              </Link>
            </div>
          </div>

          <HeroCarousel products={featuredProducts} />
        </div>
      </section>

      {/* Trust Signals */}
      <TrustSignals />

    </div>
  );
}

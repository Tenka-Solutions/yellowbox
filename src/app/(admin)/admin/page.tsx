import Link from "next/link";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { formatClp } from "@/lib/format/currency";
import { getCatalogCategories } from "@/modules/catalog/repository";
import { listOrdersForAdmin } from "@/modules/orders/service";
import type { PaymentStatus } from "@/modules/orders/service";
import {
  QuoteRequestAdminRow,
  listQuoteRequestsForAdmin,
} from "@/modules/quotes/service";

function getPaymentBadgeStatus(status: PaymentStatus) {
  return status === "cancelled" ? "payment_cancelled" : status;
}

export default async function AdminDashboardPage() {
  const [categories, orders, quotes] = await Promise.all([
    getCatalogCategories(),
    listOrdersForAdmin(),
    listQuoteRequestsForAdmin(),
  ]);

  return (
    <div className="grid gap-6">
      <section className="panel-card rounded-[2rem] p-6 sm:p-8">
        <p className="section-kicker">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold">Panel de gestion</h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-[var(--color-muted-foreground)]">
          Monitorea la operacion del ecommerce, revisa pedidos y manten el
          catalogo listo para publicar.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Categorias publicas", String(categories.length)],
          ["Pedidos recientes", String(orders.length)],
          ["Cotizaciones", String(quotes.length)],
          [
            "Facturacion observada",
            formatClp(
              orders.reduce((total, order) => total + order.totalTaxInc, 0)
            ),
          ],
        ].map(([label, value]) => (
          <article
            key={label}
            className="surface-card rounded-[1.75rem] px-5 py-6"
          >
            <p className="text-sm text-[var(--color-muted-foreground)]">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="panel-card rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">Ultimos pedidos</h2>
            <Link
              href="/admin/pedidos"
              className="text-sm font-semibold text-[var(--color-accent)]"
            >
              Ver todos
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-3 rounded-[1.5rem] border border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">{order.orderNumber}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    {formatClp(order.totalTaxInc)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={getPaymentBadgeStatus(order.paymentStatus)} />
                  <StatusBadge status={order.orderStatus} />
                </div>
              </div>
            ))}
            {!orders.length ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Aun no hay pedidos en la base conectada.
              </p>
            ) : null}
          </div>
        </article>

        <article className="panel-card rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">Cotizaciones nuevas</h2>
            <Link
              href="/admin/cotizaciones"
              className="text-sm font-semibold text-[var(--color-accent)]"
            >
              Ver todas
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {quotes.slice(0, 5).map((quote: QuoteRequestAdminRow) => (
              <div
                key={quote.id}
                className="rounded-[1.5rem] border border-[var(--color-border)] p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{quote.name}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                      {quote.email}
                    </p>
                  </div>
                  <StatusBadge status={quote.status} />
                </div>
              </div>
            ))}
            {!quotes.length ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Aun no hay solicitudes en la base conectada.
              </p>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}

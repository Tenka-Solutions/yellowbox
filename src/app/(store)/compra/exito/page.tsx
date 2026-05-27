import Link from "next/link";
import { ClearCartOnMount } from "@/components/cart/ClearCartOnMount";
import { PaymentReturnDetails } from "@/components/payments/PaymentReturnDetails";
import { getPublicOrderPaymentStatus } from "@/modules/payments/public-status";

function buildPendingHref(orderNumber?: string) {
  if (!orderNumber) {
    return "/compra/pendiente";
  }

  const params = new URLSearchParams({ order: orderNumber });
  return `/compra/pendiente?${params.toString()}`;
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    order?: string;
    reference?: string;
    mode?: string;
    status?: string;
    collection_status?: string;
    payment_id?: string;
    collection_id?: string;
    preference_id?: string;
    external_reference?: string;
    merchant_order_id?: string;
  }>;
}) {
  const params = await searchParams;
  const payment = await getPublicOrderPaymentStatus(params.order);
  const isPaid = payment?.paymentStatus === "paid";
  const isRejected =
    payment?.paymentStatus === "rejected" ||
    payment?.paymentStatus === "cancelled";
  const title = isPaid
    ? "Pago aprobado"
    : isRejected
      ? "El pago no fue aprobado"
      : "Estamos verificando tu pago";
  const description = isPaid
    ? "Recibimos la confirmacion del pago desde el proveedor. Te contactaremos por correo con el seguimiento de la compra y la coordinacion del despacho."
    : isRejected
      ? "El proveedor informo que el pago fue rechazado o cancelado. Tu carrito no se limpia automaticamente para que puedas reintentar."
      : "Aun no tenemos una confirmacion final desde el servidor. Si ya pagaste, espera unos minutos y vuelve a revisar el estado del pedido.";

  return (
    <div className="page-shell flex min-h-[70vh] items-center py-16">
      {isPaid ? <ClearCartOnMount /> : null}
      <div className="panel-card mx-auto max-w-2xl rounded-[2rem] px-8 py-14 text-center">
        <p className="section-kicker">
          {isPaid ? "Compra exitosa" : "Resultado de pago"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
          Orden {payment?.orderNumber ?? params.order ?? "por verificar"}
          {params.reference ? ` - Ref. ${params.reference}` : ""}.
        </p>
        <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
          {description}
        </p>
        <PaymentReturnDetails
          order={payment?.orderNumber ?? params.order}
          reference={params.reference}
          paymentId={params.payment_id ?? params.collection_id}
          preferenceId={params.preference_id}
          merchantOrderId={params.merchant_order_id}
          externalReference={params.external_reference}
          status={params.status ?? params.collection_status}
        />
        {!isPaid ? (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={buildPendingHref(payment?.orderNumber ?? params.order)}
              className="button-primary px-6 py-3"
            >
              Revisar estado
            </Link>
            <Link href="/checkout" className="button-secondary px-6 py-3">
              Volver al checkout
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

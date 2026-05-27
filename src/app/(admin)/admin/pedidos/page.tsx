import Link from "next/link";
import { OrderSubmitButton } from "@/components/admin/OrderSubmitButton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { formatClp } from "@/lib/format/currency";
import {
  formatPaymentProvider,
  isLegacyPaymentProvider,
} from "@/modules/orders/payment-provider";
import {
  ADMIN_ORDER_DELETE_CONFIRMATION,
  ADMIN_ORDER_STATUSES,
  getAdminOrderDeletionEligibility,
  getAdminOrderDetail,
  getAdminOrdersPageData,
  isArchiveableOrderStatus,
} from "@/modules/orders/admin";
import type {
  AdminArchivedFilter,
  AdminOrderDetail,
  AdminOrderListItem,
  AdminOrderStatus,
  AdminOrderStockAlert,
} from "@/modules/orders/admin";
import type { PaymentStatus } from "@/modules/orders/service";
import {
  archiveOrderAction,
  deleteOrderPermanentlyAction,
  unarchiveOrderAction,
  updateOrderAction,
} from "@/app/(admin)/admin/pedidos/actions";

type SearchParams = Promise<{
  q?: string;
  estadoPedido?: string;
  estadoPago?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  archivado?: string;
  detalle?: string;
  estado?: string;
}>;

const pageMessages: Record<string, { tone: "success" | "danger"; text: string }> =
  {
    guardado: {
      tone: "success",
      text: "Pedido actualizado correctamente.",
    },
    archivado: {
      tone: "success",
      text: "Pedido archivado. No aparecera en el listado principal.",
    },
    desarchivado: {
      tone: "success",
      text: "Pedido restaurado al listado principal.",
    },
    eliminado: {
      tone: "success",
      text: "Pedido eliminado definitivamente.",
    },
    confirmacion_invalida: {
      tone: "danger",
      text: "Confirmacion invalida. Debes escribir ELIMINAR.",
    },
    pago_confirmado: {
      tone: "danger",
      text: "No se puede eliminar porque tiene pago confirmado.",
    },
    pedido_procesado: {
      tone: "danger",
      text: "No se puede eliminar porque ya fue procesado.",
    },
    relaciones_criticas: {
      tone: "danger",
      text: "No se puede eliminar porque tiene relaciones criticas. Puedes archivarlo.",
    },
    estado_no_eliminable: {
      tone: "danger",
      text: "Solo se pueden eliminar definitivamente pedidos pendientes o cancelados.",
    },
    error: {
      tone: "danger",
      text: "No pudimos completar la accion. Revisa permisos, estado del pedido o configuracion de Supabase.",
    },
  };

const orderStatusLabels: Record<AdminOrderStatus, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  processing: "En proceso",
  preparing: "En preparacion",
  shipped: "Enviado",
  completed: "Completado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  rejected: "Rechazado",
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: "Pendiente de pago",
  paid: "Pagado",
  rejected: "Rechazado",
  cancelled: "Anulado",
  failed: "Fallido",
  refunded: "Reembolsado",
};

function toOrderStatus(value?: string): AdminOrderStatus | undefined {
  return ADMIN_ORDER_STATUSES.includes(value as AdminOrderStatus)
    ? (value as AdminOrderStatus)
    : undefined;
}

function toArchivedFilter(value?: string): AdminArchivedFilter {
  return ["active", "archived", "all"].includes(value ?? "")
    ? (value as AdminArchivedFilter)
    : "active";
}

function toPaymentStatus(value?: string): PaymentStatus | undefined {
  return [
    "pending",
    "paid",
    "rejected",
    "cancelled",
    "failed",
    "refunded",
  ].includes(value ?? "")
    ? (value as PaymentStatus)
    : undefined;
}

function buildOrdersHref(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  return `/admin/pedidos${query.size ? `?${query.toString()}` : ""}`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getPaymentBadgeStatus(status: PaymentStatus) {
  return status === "cancelled" ? "payment_cancelled" : status;
}

function getStockAlertBadgeStatus(alert: AdminOrderStockAlert) {
  if (alert.tone === "danger") {
    return "stock_failed";
  }

  if (alert.tone === "warning") {
    return "stock_warning";
  }

  if (alert.tone === "success") {
    return "stock_discounted";
  }

  return "stock_skipped";
}

const stockAlertToneClassNames: Record<AdminOrderStockAlert["tone"], string> = {
  success:
    "border-[color-mix(in_srgb,var(--color-success)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-card)_90%)]",
  warning:
    "border-[color-mix(in_srgb,var(--color-warning)_42%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-warning)_14%,var(--color-card)_86%)]",
  danger:
    "border-[color-mix(in_srgb,var(--color-danger)_42%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger)_12%,var(--color-card)_88%)]",
  muted:
    "border-[var(--color-border)] bg-[var(--color-surface-strong)]",
};

function cleanPhone(value: string | null) {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, "");
  return digits || null;
}

function getWhatsAppHref(phone: string | null) {
  const digits = cleanPhone(phone);

  if (!digits) {
    return null;
  }

  const normalized = digits.startsWith("56")
    ? digits
    : digits.length === 9
      ? `56${digits}`
      : digits;

  return `https://wa.me/${normalized}`;
}

function getPhoneHref(phone: string | null) {
  const digits = cleanPhone(phone);
  return digits ? `tel:+${digits}` : null;
}

function getMailHref(order: AdminOrderListItem) {
  const subject = encodeURIComponent(`Pedido ${order.orderNumber}`);
  return `mailto:${order.customerEmail}?subject=${subject}`;
}

function getAddressLine(order: AdminOrderDetail) {
  if (!order.shippingAddress) {
    return "Direccion no registrada";
  }

  const { street, number, apartment } = order.shippingAddress;
  return [street, number, apartment ? `Depto/Of. ${apartment}` : null]
    .filter(Boolean)
    .join(" ");
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[0.85rem] bg-[var(--color-surface-strong)] px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function ContactActions({ order }: { order: AdminOrderListItem }) {
  const whatsappHref = getWhatsAppHref(order.phone);
  const phoneHref = getPhoneHref(order.phone);

  return (
    <div className="flex flex-wrap gap-2">
      <a href={getMailHref(order)} className="button-secondary px-3 py-1.5 text-xs">
        Enviar correo
      </a>
      {whatsappHref ? (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="button-secondary px-3 py-1.5 text-xs"
        >
          Contactar WhatsApp
        </a>
      ) : null}
      {phoneHref ? (
        <a href={phoneHref} className="button-secondary px-3 py-1.5 text-xs">
          Llamar
        </a>
      ) : null}
    </div>
  );
}

function OrderCard({
  order,
  detailHref,
  isSelected,
  canMutate,
  returnTo,
}: {
  order: AdminOrderListItem;
  detailHref: string;
  isSelected: boolean;
  canMutate: boolean;
  returnTo: string;
}) {
  return (
    <article
      className={`grid gap-3 rounded-[1rem] border p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${
        isSelected
          ? "border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card)_92%)]"
          : "border-[var(--color-border)] bg-[var(--color-card)]"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-[var(--color-ink)]">
            {order.orderNumber}
          </h3>
          <StatusBadge status={order.orderStatus} />
          <StatusBadge status={getPaymentBadgeStatus(order.paymentStatus)} />
          {order.stockAlert ? (
            <StatusBadge status={getStockAlertBadgeStatus(order.stockAlert)} />
          ) : null}
          {order.archivedAt ? <StatusBadge status="archived" /> : null}
        </div>
        <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
          {order.customerName}
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {order.customerEmail} · {order.phone ?? "sin telefono"}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          {formatDateTime(order.createdAt)}
          {order.companyName ? ` · ${order.companyName}` : ""}
        </p>
      </div>

      <div className="grid gap-2 md:min-w-40 md:justify-items-end">
        <div className="text-left md:text-right">
          <p className="text-base font-semibold text-[var(--color-price)]">
            {formatClp(order.totalTaxInc)}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Método de pago: {formatPaymentProvider(order.paymentProvider)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <ContactActions order={order} />
          <form action={updateOrderAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="orderStatus" value="preparing" />
            <input type="hidden" name="internalNote" value={order.internalNote ?? ""} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <button
              type="submit"
              disabled={!canMutate || order.orderStatus === "preparing"}
              className="button-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              Marcar en preparacion
            </button>
          </form>
          <form action={updateOrderAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="orderStatus" value="delivered" />
            <input type="hidden" name="internalNote" value={order.internalNote ?? ""} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <button
              type="submit"
              disabled={!canMutate || order.orderStatus === "delivered"}
              className="button-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              Marcar despachado
            </button>
          </form>
          <Link href={detailHref} className="button-primary px-3 py-1.5 text-xs">
            Ver detalle
          </Link>
        </div>
      </div>
    </article>
  );
}

function DetailLine({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-[0.85rem] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <div className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
        {value || "-"}
      </div>
    </div>
  );
}

function StockAlertsPanel({ alerts }: { alerts: AdminOrderStockAlert[] }) {
  if (!alerts.length) {
    return null;
  }

  return (
    <section className="mt-3 rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Stock automatico</h3>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Eventos desde order_events
        </p>
      </div>
      <div className="mt-3 grid gap-2">
        {alerts.map((alert, index) => (
          <article
            key={`${alert.eventType}-${alert.createdAt ?? index}`}
            className={`rounded-[0.85rem] border px-3 py-2.5 ${stockAlertToneClassNames[alert.tone]}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={getStockAlertBadgeStatus(alert)} />
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {formatDateTime(alert.createdAt)}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--color-card-foreground)]">
              {alert.message}
            </p>
            {alert.details.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-[var(--color-muted-foreground)]">
                {alert.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function OrderDetailPanel({
  order,
  canMutate,
  returnTo,
}: {
  order: AdminOrderDetail;
  canMutate: boolean;
  returnTo: string;
}) {
  const canArchive = isArchiveableOrderStatus(order.orderStatus);
  const deleteEligibility = getAdminOrderDeletionEligibility({
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentAttemptStatus: order.paymentAttemptStatus,
    hasConfirmedPaymentAttempt: order.hasConfirmedPaymentAttempt,
  });
  const paymentMethod = formatPaymentProvider(
    order.paymentProvider ?? order.paymentAttemptProvider
  );

  return (
    <section className="panel-card flex h-full min-h-0 flex-col overflow-hidden rounded-[1.25rem]">
      <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-kicker">Detalle del pedido</p>
          <h2 className="mt-1 text-xl font-semibold">{order.orderNumber}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge status={order.orderStatus} />
            <StatusBadge status={getPaymentBadgeStatus(order.paymentStatus)} />
            {order.stockAlert ? (
              <StatusBadge status={getStockAlertBadgeStatus(order.stockAlert)} />
            ) : null}
            {order.archivedAt ? <StatusBadge status="archived" /> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <ContactActions order={order} />
          <Link href="/admin/pedidos" className="button-secondary px-3 py-1.5 text-xs">
            Cerrar detalle
          </Link>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <DetailLine label="Fecha" value={formatDateTime(order.createdAt)} />
          <DetailLine label="Método de pago" value={paymentMethod} />
          <DetailLine label="Referencia pago" value={order.paymentAttemptReference} />
          <DetailLine label="Total" value={formatClp(order.totalTaxInc)} />
        </div>

        {isLegacyPaymentProvider(order.paymentProvider) ? (
          <p className="mt-3 rounded-[0.85rem] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2 text-xs leading-5 text-[var(--color-muted-foreground)]">
            Pedido registrado con flujo anterior. Se conserva para trazabilidad.
          </p>
        ) : null}

        <StockAlertsPanel alerts={order.stockAlerts} />

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid gap-3">
            <section className="rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
              <h3 className="text-base font-semibold">Productos comprados</h3>
              <div className="mt-2 overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                    <th className="py-2 pr-3 font-semibold">Producto</th>
                    <th className="py-2 pr-3 font-semibold">Cant.</th>
                    <th className="py-2 pr-3 font-semibold">Unitario</th>
                    <th className="py-2 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {order.items.map((item) => (
                    <tr key={`${item.productId ?? item.name}-${item.sku ?? ""}`}>
                      <td className="py-2 pr-3">
                        <p className="font-semibold text-[var(--color-ink)]">
                          {item.name}
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          SKU {item.sku ?? "sin SKU"}
                        </p>
                      </td>
                      <td className="py-2 pr-3">{item.quantity}</td>
                      <td className="py-2 pr-3">
                        {formatClp(item.unitPriceTaxInc)}
                      </td>
                      <td className="py-2 font-semibold">
                        {formatClp(item.lineTotalTaxInc)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

            <section className="rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
              <h3 className="text-base font-semibold">Datos del cliente</h3>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
              <DetailLine label="Nombre" value={order.customerName} />
              <DetailLine label="Correo" value={order.customerEmail} />
              <DetailLine label="Telefono" value={order.phone ?? "No registrado"} />
              <DetailLine label="RUT" value={order.rut ?? "No registrado"} />
              <DetailLine
                label="Empresa"
                value={order.companyName ?? order.businessName ?? "No registrada"}
              />
              <DetailLine
                label="Giro"
                value={order.businessActivity ?? "No registrado"}
              />
              <DetailLine label="Direccion" value={getAddressLine(order)} />
              <DetailLine
                label="Comuna / Region"
                value={
                  order.shippingAddress
                    ? `${order.shippingAddress.comuna}, ${order.shippingAddress.region}`
                    : "No registrada"
                }
              />
              <DetailLine
                label="Referencias"
                value={order.shippingAddress?.references ?? "Sin referencias"}
              />
              <DetailLine
                label="Observaciones"
                value={order.shippingAddress?.deliveryNotes ?? "Sin observaciones"}
              />
            </div>
          </section>
        </div>

          <aside className="grid content-start gap-3">
            <section className="rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
              <h3 className="text-base font-semibold">Estado y nota interna</h3>
              <form action={updateOrderAction} className="mt-3 grid gap-3">
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="returnTo" value={returnTo} />

              <label className="grid gap-2 text-sm font-semibold">
                Estado del pedido
                <select
                  name="orderStatus"
                  defaultValue={order.orderStatus}
                  className="form-input form-input-compact"
                  disabled={!canMutate}
                >
                  {ADMIN_ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {orderStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                Nota interna
                <textarea
                  name="internalNote"
                  defaultValue={order.internalNote ?? ""}
                  className="form-input form-input-compact min-h-24"
                  placeholder="Nota visible solo en administracion."
                  disabled={!canMutate}
                />
              </label>

              <OrderSubmitButton
                disabled={!canMutate}
                className="button-primary px-4 py-2 text-sm"
                confirmWhenField="orderStatus"
                confirmWhenValue="cancelled"
                confirmMessage="Vas a marcar este pedido como cancelado. ¿Quieres continuar?"
              >
                Guardar cambios
              </OrderSubmitButton>
            </form>
          </section>

            <section className="rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
              <h3 className="text-base font-semibold">Totales</h3>
              <div className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-[var(--color-muted-foreground)]">Subtotal</span>
                <strong>{formatClp(order.subtotalTaxInc)}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[var(--color-muted-foreground)]">IVA</span>
                <strong>{formatClp(order.taxAmount)}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[var(--color-muted-foreground)]">Despacho</span>
                <strong>
                  {order.shippingAmount > 0
                    ? formatClp(order.shippingAmount)
                    : order.shippingLabel}
                </strong>
              </div>
              <div className="flex justify-between gap-4 border-t border-[var(--color-border)] pt-3 text-base">
                <span>Total</span>
                <strong className="text-[var(--color-price)]">
                  {formatClp(order.totalTaxInc)}
                </strong>
              </div>
            </div>
          </section>

            <section className="rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
              <h3 className="text-base font-semibold">Archivado visual</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--color-muted-foreground)]">
              Archivar limpia el panel sin borrar el pedido ni sus productos.
            </p>

            {order.archivedAt ? (
              <form action={unarchiveOrderAction} className="mt-4">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <OrderSubmitButton
                  disabled={!canMutate}
                  className="button-secondary px-4 py-2 text-sm"
                  confirmMessage="Este pedido volvera al listado principal. ¿Quieres desarchivarlo?"
                >
                  Desarchivar pedido
                </OrderSubmitButton>
              </form>
            ) : (
              <form action={archiveOrderAction} className="mt-4">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <OrderSubmitButton
                  disabled={!canMutate || !canArchive}
                  className="button-secondary px-4 py-2 text-sm"
                  confirmMessage="El pedido se ocultara del listado principal, pero no se borrara. ¿Quieres archivarlo?"
                >
                  Archivar pedido
                </OrderSubmitButton>
                {!canArchive ? (
                  <p className="mt-3 text-xs leading-5 text-[var(--color-muted-foreground)]">
                    Solo se archivan pedidos pendientes, cancelados o rechazados.
                  </p>
                ) : null}
              </form>
            )}
          </section>

            <section className="rounded-[1rem] border border-[color-mix(in_srgb,var(--color-danger)_38%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger)_8%,var(--color-card)_92%)] p-3">
              <h3 className="text-base font-semibold">Zona peligrosa</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--color-muted-foreground)]">
              La accion recomendada es archivar. La eliminacion definitiva
              borra el pedido y sus registros operativos asociados.
            </p>
              <p className="mt-2 rounded-[0.85rem] border border-[var(--color-border)] bg-[var(--color-card)] p-2 text-xs leading-5 text-[var(--color-card-foreground)]">
              {deleteEligibility.message}
            </p>

            {deleteEligibility.canDelete ? (
              <form action={deleteOrderPermanentlyAction} className="mt-4 grid gap-3">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="returnTo" value={returnTo} />

                <label className="grid gap-2 text-sm font-semibold">
                  Escribe {ADMIN_ORDER_DELETE_CONFIRMATION} para confirmar
                  <input
                    name="confirmation"
                    className="form-input form-input-compact"
                    placeholder={ADMIN_ORDER_DELETE_CONFIRMATION}
                    autoComplete="off"
                    disabled={!canMutate}
                    required
                  />
                </label>

                <OrderSubmitButton
                  disabled={!canMutate}
                  className="button-secondary border-[color-mix(in_srgb,var(--color-danger)_54%,var(--color-border))] px-4 py-2 text-sm text-[var(--color-danger)] hover:bg-[color-mix(in_srgb,var(--color-danger)_12%,var(--color-card)_88%)]"
                  confirmMessage="Esta accion eliminara definitivamente el pedido y no se puede deshacer. Quieres continuar?"
                >
                  Eliminar definitivamente
                </OrderSubmitButton>
              </form>
            ) : (
              <div className="mt-4">
                <button
                  type="button"
                  disabled
                  className="button-secondary w-full cursor-not-allowed border-[color-mix(in_srgb,var(--color-danger)_32%,var(--color-border))] px-4 py-2 text-sm opacity-60"
                >
                  Eliminar definitivamente
                </button>
              </div>
            )}
          </section>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const archivedFilter = toArchivedFilter(params.archivado);
  const filters = {
    query: params.q,
    orderStatus: toOrderStatus(params.estadoPedido),
    paymentStatus: toPaymentStatus(params.estadoPago),
    dateFrom: params.fechaDesde,
    dateTo: params.fechaHasta,
    archived: archivedFilter,
  };
  const pageData = await getAdminOrdersPageData(filters);
  const detailOrder = params.detalle
    ? await getAdminOrderDetail(params.detalle)
    : null;
  const message = params.estado ? pageMessages[params.estado] : null;
  const baseParams = {
    q: params.q,
    estadoPedido: params.estadoPedido,
    estadoPago: params.estadoPago,
    fechaDesde: params.fechaDesde,
    fechaHasta: params.fechaHasta,
    archivado: params.archivado,
  };
  const returnTo = buildOrdersHref({
    ...baseParams,
    detalle: params.detalle,
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <section className="panel-card rounded-[1.25rem] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-kicker">Operacion</p>
            <h1 className="mt-1 text-2xl font-semibold">Pedidos</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-muted-foreground)]">
              Seguimiento comercial de pedidos, contacto con clientes, notas
              internas y archivado visual sin borrar registros.
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <SummaryCard label="Cargados" value={pageData.totalOrders} />
          <SummaryCard label="Vista actual" value={pageData.orders.length} />
          <SummaryCard label="Activos" value={pageData.visibleOrders} />
          <SummaryCard label="Archivados" value={pageData.archivedOrders} />
        </div>
      </section>

      {message ? (
        <div
          className={`rounded-[1rem] border px-4 py-3 text-sm font-medium ${
            message.tone === "success"
              ? "border-[color-mix(in_srgb,var(--color-success)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_16%,var(--color-card)_84%)] text-[var(--color-card-foreground)]"
              : "border-[color-mix(in_srgb,var(--color-danger)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger)_16%,var(--color-card)_84%)] text-[var(--color-card-foreground)]"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {pageData.warning ? (
        <div className="rounded-[1rem] border border-[color-mix(in_srgb,var(--color-warning)_42%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-warning)_18%,var(--color-card)_82%)] px-4 py-3 text-sm leading-6 text-[var(--color-card-foreground)]">
          {pageData.warning}
        </div>
      ) : null}

      <section className="panel-card rounded-[1.25rem] p-3">
        <form className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_160px_160px_150px_150px_165px_auto_auto] xl:items-end">
          <label className="grid gap-2 text-sm font-semibold">
            Buscar pedido o cliente
            <input
              name="q"
              defaultValue={params.q ?? ""}
              className="form-input form-input-compact"
              placeholder="SMK-..., nombre, correo o telefono"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Estado gestion
            <select
              name="estadoPedido"
              defaultValue={params.estadoPedido ?? ""}
              className="form-input form-input-compact"
            >
              <option value="">Todos</option>
              {ADMIN_ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {orderStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Estado pago
            <select
              name="estadoPago"
              defaultValue={params.estadoPago ?? ""}
              className="form-input form-input-compact"
            >
              <option value="">Todos</option>
              {Object.entries(paymentStatusLabels).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Desde
            <input
              name="fechaDesde"
              type="date"
              defaultValue={params.fechaDesde ?? ""}
              className="form-input form-input-compact"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Hasta
            <input
              name="fechaHasta"
              type="date"
              defaultValue={params.fechaHasta ?? ""}
              className="form-input form-input-compact"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Archivado
            <select
              name="archivado"
              defaultValue={archivedFilter}
              className="form-input form-input-compact"
            >
              <option value="active">No archivados</option>
              <option value="archived">Archivados</option>
              <option value="all">Todos</option>
            </select>
          </label>

          <button type="submit" className="button-primary px-5 py-2.5 text-sm">
            Filtrar
          </button>

          <Link href="/admin/pedidos" className="button-secondary px-5 py-2.5 text-sm">
            Limpiar
          </Link>
        </form>
      </section>

      <section
        className={`grid min-h-0 flex-1 gap-3 ${
          detailOrder || params.detalle
            ? "xl:grid-cols-[minmax(360px,0.82fr)_minmax(480px,1.18fr)]"
            : ""
        }`}
      >
        <div className="min-h-0 overflow-y-auto pr-1">
          <div className="grid gap-2">
            {pageData.orders.length > 0 ? (
              pageData.orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  detailHref={buildOrdersHref({
                    ...baseParams,
                    detalle: order.id,
                  })}
                  isSelected={params.detalle === order.id}
                  canMutate={pageData.canMutate}
                  returnTo={buildOrdersHref(baseParams)}
                />
              ))
            ) : (
              <EmptyState
                title="No encontramos pedidos"
                description="Ajusta los filtros o revisa pedidos archivados si quieres recuperar ordenes ocultas del listado principal."
              />
            )}
          </div>
        </div>

        {detailOrder ? (
          <div className="min-h-0">
            <OrderDetailPanel
              order={detailOrder}
              canMutate={pageData.canMutate}
              returnTo={returnTo}
            />
          </div>
        ) : params.detalle ? (
          <div className="min-h-0">
            <div className="rounded-[1rem] border border-[color-mix(in_srgb,var(--color-warning)_42%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-warning)_18%,var(--color-card)_82%)] px-4 py-3 text-sm leading-6 text-[var(--color-card-foreground)]">
              No encontramos el pedido seleccionado. Puede haber sido filtrado o no
              estar disponible.
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

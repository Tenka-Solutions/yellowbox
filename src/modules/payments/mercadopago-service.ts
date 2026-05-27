import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getOrderDetailById,
  updateOrderStatuses,
  type OrderStatus,
  type PaymentStatus as OrderPaymentStatus,
} from "@/modules/orders/service";
import { sendOrderPaidEmails } from "@/modules/orders/notifications";
import type { PaymentStatus as DomainPaymentStatus } from "@/modules/payments/domain/payment";
import { createSupabasePaymentRepository } from "@/modules/payments/infra/supabase-payment-repository";
import {
  getMercadoPagoCertificationExternalReference,
  getMercadoPagoPayment,
  type MercadoPagoPayment,
} from "@/modules/payments/providers/mercadopago";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

interface MercadoPagoStatusMapping {
  domainStatus: DomainPaymentStatus | null;
  orderPaymentStatus: OrderPaymentStatus | null;
  orderStatus: OrderStatus | null;
  eventType: string;
}

interface OrderRowForPayment {
  id: string;
  order_number: string;
  payment_status: OrderPaymentStatus;
  order_status: OrderStatus;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function stringValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function mapMercadoPagoStatus(
  status: string | null | undefined
): MercadoPagoStatusMapping {
  switch ((status ?? "").toLowerCase()) {
    case "approved":
      return {
        domainStatus: "paid",
        orderPaymentStatus: "paid",
        orderStatus: "paid",
        eventType: "mercadopago_payment_approved",
      };
    case "pending":
    case "in_process":
    case "authorized":
    case "in_mediation":
      return {
        domainStatus: "pending",
        orderPaymentStatus: "pending",
        orderStatus: "pending",
        eventType: "mercadopago_payment_pending",
      };
    case "cancelled":
      return {
        domainStatus: "failed",
        orderPaymentStatus: "cancelled",
        orderStatus: "cancelled",
        eventType: "mercadopago_payment_cancelled",
      };
    case "refunded":
      return {
        domainStatus: null,
        orderPaymentStatus: null,
        orderStatus: null,
        eventType: "mercadopago_payment_refunded",
      };
    case "rejected":
    case "charged_back":
      return {
        domainStatus: "failed",
        orderPaymentStatus: "rejected",
        orderStatus: "rejected",
        eventType: "mercadopago_payment_rejected",
      };
    default:
      return {
        domainStatus: "pending",
        orderPaymentStatus: "pending",
        orderStatus: "pending",
        eventType: "mercadopago_payment_status_unknown",
      };
  }
}

function summarizePayment(payment: MercadoPagoPayment) {
  return {
    id: payment.id ?? null,
    status: payment.status ?? null,
    status_detail: payment.status_detail ?? null,
    external_reference: payment.external_reference ?? null,
    metadata: payment.metadata ?? null,
    order: payment.order ?? null,
    payment_method_id: payment.payment_method_id ?? null,
    payment_type_id: payment.payment_type_id ?? null,
    transaction_amount: payment.transaction_amount ?? null,
    transaction_amount_refunded: payment.transaction_amount_refunded ?? null,
    installments: payment.installments ?? null,
    live_mode: payment.live_mode ?? null,
    date_approved: payment.date_approved ?? null,
    date_last_updated: payment.date_last_updated ?? null,
  };
}

async function getOrderRow(
  client: AdminClient,
  orderId: string | null,
  orderNumber: string | null
): Promise<OrderRowForPayment | null> {
  if (orderId) {
    const { data, error } = await client
      .from("orders")
      .select("id, order_number, payment_status, order_status")
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return data as OrderRowForPayment;
    }
  }

  if (!orderNumber) {
    return null;
  }

  const { data, error } = await client
    .from("orders")
    .select("id, order_number, payment_status, order_status")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? (data as OrderRowForPayment) : null;
}

async function findMercadoPagoAttempt(
  client: AdminClient,
  paymentId: string,
  orderId: string | null
) {
  const { data: byPaymentId, error: paymentError } = await client
    .from("payment_attempts")
    .select("*")
    .eq("provider", "mercadopago")
    .eq("provider_transaction_id", paymentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paymentError) {
    throw new Error(paymentError.message);
  }

  if (byPaymentId) {
    return byPaymentId;
  }

  if (!orderId) {
    return null;
  }

  const { data, error } = await client
    .from("payment_attempts")
    .select("*")
    .eq("provider", "mercadopago")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

async function findLatestLocalPaymentId(client: AdminClient, orderId: string) {
  const { data, error } = await client
    .from("payments")
    .select("id")
    .eq("order_id", orderId)
    .eq("provider", "mercadopago")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return stringValue(data?.id);
}

async function updateLocalPaymentStatus({
  client,
  localPaymentId,
  orderId,
  providerPaymentId,
  status,
}: {
  client: AdminClient;
  localPaymentId: string | null;
  orderId: string | null;
  providerPaymentId: string;
  status: DomainPaymentStatus | null;
}) {
  if (!status) {
    return;
  }

  const paymentId =
    localPaymentId ?? (orderId ? await findLatestLocalPaymentId(client, orderId) : null);

  if (!paymentId) {
    return;
  }

  const repository = createSupabasePaymentRepository(client);
  await repository.updateStatus(paymentId, status, providerPaymentId);
}

async function upsertPaymentAttempt({
  client,
  orderId,
  paymentId,
  status,
  payload,
}: {
  client: AdminClient;
  orderId: string | null;
  paymentId: string;
  status: OrderPaymentStatus | null;
  payload: Record<string, unknown>;
}) {
  if (!orderId) {
    return null;
  }

  const current = await findMercadoPagoAttempt(client, paymentId, orderId);
  const patch: Record<string, unknown> = {
    provider_transaction_id: paymentId,
    response_payload: payload,
  };

  if (status) {
    patch.status = status;
    patch.confirmed_at =
      status === "pending" ? null : new Date().toISOString();
  }

  if (current?.id) {
    const { error } = await client
      .from("payment_attempts")
      .update(patch)
      .eq("id", current.id);

    if (error) {
      throw new Error(error.message);
    }

    return stringValue(current.id);
  }

  const { data, error } = await client
    .from("payment_attempts")
    .insert({
      order_id: orderId,
      provider: "mercadopago",
      reference: `MP-${paymentId}`,
      provider_transaction_id: paymentId,
      status: status ?? "pending",
      request_payload: {
        source: "mercadopago_webhook",
      },
      response_payload: payload,
      confirmed_at:
        status && status !== "pending" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await client
    .from("orders")
    .update({ latest_payment_attempt_id: data.id })
    .eq("id", orderId);

  return stringValue(data.id);
}

async function recordOrderEvent({
  client,
  orderId,
  eventType,
  payload,
}: {
  client: AdminClient;
  orderId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
}) {
  if (!orderId) {
    return;
  }

  await client.from("order_events").insert({
    order_id: orderId,
    event_type: eventType,
    payload,
  });
}

export async function recordMercadoPagoCheckoutAttempt({
  orderId,
  orderNumber,
  paymentId,
  providerReference,
  redirectUrl,
}: {
  orderId: string;
  orderNumber: string;
  paymentId: string;
  providerReference: string | null;
  redirectUrl: string;
}) {
  const client = createSupabaseAdminClient();

  if (!client) {
    return;
  }

  const reference = providerReference ?? paymentId;
  const { data, error } = await client
    .from("payment_attempts")
    .insert({
      order_id: orderId,
      provider: "mercadopago",
      reference,
      status: "pending",
      request_payload: {
        localPaymentId: paymentId,
        preferenceId: providerReference,
        externalReference: getMercadoPagoCertificationExternalReference(),
        certification: true,
      },
      response_payload: {
        redirectUrl,
        providerReference,
      },
      redirect_url: redirectUrl,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "No se pudo registrar payment_attempt.");
  }

  await client
    .from("orders")
    .update({
      latest_payment_attempt_id: data.id,
      payment_provider: "mercadopago",
    })
    .eq("id", orderId);

  await recordOrderEvent({
    client,
    orderId,
    eventType: "mercadopago_checkout_created",
    payload: {
      paymentId,
      preferenceId: providerReference,
      orderNumber,
      certification: true,
    },
  });
}

export async function processMercadoPagoPaymentNotification(
  paymentId: string
) {
  const providerPayment = await getMercadoPagoPayment(paymentId);
  const statusMapping = mapMercadoPagoStatus(providerPayment.status);
  const metadata = asRecord(providerPayment.metadata) ?? {};
  const localPaymentId = stringValue(metadata.local_payment_id);
  const metadataOrderId = stringValue(metadata.order_id);
  const metadataOrderNumber = stringValue(metadata.order_number);
  const paymentSummary = summarizePayment(providerPayment);
  const client = createSupabaseAdminClient();

  if (!client) {
    return {
      ok: true,
      skipped: "supabase-unconfigured",
      providerStatus: providerPayment.status ?? null,
      paymentId,
    };
  }

  const orderRow = await getOrderRow(
    client,
    metadataOrderId,
    metadataOrderNumber
  );
  const orderId = orderRow?.id ?? metadataOrderId;
  const responsePayload = {
    mercadopago: paymentSummary,
    receivedAt: new Date().toISOString(),
  };
  const attemptId = await upsertPaymentAttempt({
    client,
    orderId: orderId ?? null,
    paymentId,
    status: statusMapping.orderPaymentStatus,
    payload: responsePayload,
  });

  await updateLocalPaymentStatus({
    client,
    localPaymentId,
    orderId: orderId ?? null,
    providerPaymentId: paymentId,
    status: statusMapping.domainStatus,
  });

  let orderStatusUpdated = false;
  const shouldNotDowngradePaidOrder =
    orderRow?.payment_status === "paid" &&
    statusMapping.orderPaymentStatus !== "paid";

  if (
    orderRow &&
    statusMapping.orderPaymentStatus &&
    statusMapping.orderStatus &&
    !shouldNotDowngradePaidOrder
  ) {
    orderStatusUpdated = await updateOrderStatuses({
      orderId: orderRow.id,
      orderStatus: statusMapping.orderStatus,
      paymentStatus: statusMapping.orderPaymentStatus,
      note: `Mercado Pago payment ${paymentId}: ${providerPayment.status ?? "unknown"}`,
    });

    if (
      statusMapping.orderPaymentStatus === "paid" &&
      orderRow.payment_status !== "paid"
    ) {
      const order = await getOrderDetailById(orderRow.id);

      if (order) {
        await sendOrderPaidEmails({
          order,
          reference: paymentId,
        });
      }
    }
  }

  await recordOrderEvent({
    client,
    orderId: orderRow?.id ?? null,
    eventType: statusMapping.eventType,
    payload: {
      paymentId,
      attemptId,
      orderStatusUpdated,
      skippedStatusUpdate: shouldNotDowngradePaidOrder,
      externalReference: providerPayment.external_reference ?? null,
      certificationExternalReference:
        getMercadoPagoCertificationExternalReference(),
      mercadopago: paymentSummary,
    },
  });

  return {
    ok: true,
    providerStatus: providerPayment.status ?? null,
    orderNumber: orderRow?.order_number ?? metadataOrderNumber,
    orderStatusUpdated,
    paymentId,
  };
}

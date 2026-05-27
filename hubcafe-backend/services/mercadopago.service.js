const { MercadoPagoConfig, Payment, Preference } = require("mercadopago");
const ordersRepository = require("../repositories/orders.repository");
const paymentsRepository = require("../repositories/payments.repository");
const { applyPaymentStatusToOrder, getFrontendSiteUrl } = require("./payments.service");

const GATEWAY = "mercadopago";
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_INTEGRATOR_ID = "dev_24c65fb163bf11ea96500242ac130004";

function makePublicError(message, publicMessage, statusCode = 503) {
  const error = new Error(message);
  error.publicMessage = publicMessage;
  error.statusCode = statusCode;
  return error;
}

function isMercadoPagoConfigured() {
  return Boolean(
    process.env.MERCADOPAGO_ACCESS_TOKEN &&
      process.env.MERCADOPAGO_SUCCESS_URL &&
      process.env.MERCADOPAGO_FAILURE_URL &&
      process.env.MERCADOPAGO_PENDING_URL &&
      process.env.MERCADOPAGO_WEBHOOK_URL
  );
}

function getIntegratorId() {
  return process.env.MERCADOPAGO_INTEGRATOR_ID || DEFAULT_INTEGRATOR_ID;
}

function assertPublicUrl(envName, value) {
  if (!value) {
    throw makePublicError(
      `${envName} no esta configurada.`,
      "Mercado Pago no esta configurado correctamente."
    );
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw makePublicError(
      `${envName} no es una URL valida.`,
      "Mercado Pago no esta configurado correctamente."
    );
  }

  const hostname = url.hostname.toLowerCase();
  const isLocalhost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local");

  if (isLocalhost) {
    throw makePublicError(
      `${envName} apunta a localhost.`,
      "Mercado Pago requiere URLs publicas; configura las URLs productivas antes de iniciar el pago."
    );
  }

  return url.toString();
}

function getClient() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw makePublicError(
      "MERCADOPAGO_ACCESS_TOKEN no esta configurado.",
      "Mercado Pago no esta configurado correctamente."
    );
  }

  return new MercadoPagoConfig({
    accessToken,
    options: {
      timeout: DEFAULT_TIMEOUT_MS,
      integratorId: getIntegratorId(),
    },
  });
}

function getRequestOptions(idempotencyKey) {
  return {
    timeout: DEFAULT_TIMEOUT_MS,
    integratorId: getIntegratorId(),
    idempotencyKey,
  };
}

function appendReturnParams(url, params) {
  const nextUrl = new URL(url);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      nextUrl.searchParams.set(key, String(value));
    }
  });

  return nextUrl.toString();
}

function buildBackUrls(order) {
  const commonParams = {
    order: order.order_number,
    provider: GATEWAY,
  };

  return {
    success: appendReturnParams(
      assertPublicUrl("MERCADOPAGO_SUCCESS_URL", process.env.MERCADOPAGO_SUCCESS_URL),
      commonParams
    ),
    failure: appendReturnParams(
      assertPublicUrl("MERCADOPAGO_FAILURE_URL", process.env.MERCADOPAGO_FAILURE_URL),
      commonParams
    ),
    pending: appendReturnParams(
      assertPublicUrl("MERCADOPAGO_PENDING_URL", process.env.MERCADOPAGO_PENDING_URL),
      commonParams
    ),
  };
}

function getNotificationUrl() {
  return assertPublicUrl("MERCADOPAGO_WEBHOOK_URL", process.env.MERCADOPAGO_WEBHOOK_URL);
}

function toNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function getItemDescription(item) {
  const snapshot = item.product_snapshot || {};
  return (
    snapshot.short_description ||
    snapshot.long_description ||
    item.name_snapshot ||
    "Producto HubCafe"
  );
}

function getItemPictureUrl(item) {
  const snapshot = item.product_snapshot || {};
  const imageUrl =
    snapshot.primary_image_url || snapshot.picture_url || snapshot.image_url || null;

  if (!imageUrl) {
    return undefined;
  }

  try {
    return new URL(String(imageUrl)).toString();
  } catch {
    return undefined;
  }
}

function buildPreferenceItems(order) {
  const items = order.items || [];

  if (!items.length) {
    throw makePublicError(
      `Pedido ${order.order_number} sin items.`,
      "El pedido no tiene productos validos para pagar.",
      400
    );
  }

  return items.map((item, index) => ({
    id: String(item.sku_snapshot || item.product_id || `item-${index + 1}`),
    title: String(item.name_snapshot || `Producto ${index + 1}`),
    description: String(getItemDescription(item)),
    picture_url: getItemPictureUrl(item),
    quantity: Math.max(1, Math.round(toNumber(item.quantity))),
    currency_id: "CLP",
    unit_price: Math.round(toNumber(item.unit_price_tax_inc)),
  }));
}

function buildPayer(order) {
  const fullName = String(order.customer_name || "").trim();
  const [name, ...surnameParts] = fullName.split(/\s+/).filter(Boolean);
  const payer = {
    email: order.customer_email || undefined,
    name: name || undefined,
    surname: surnameParts.length ? surnameParts.join(" ") : undefined,
  };
  const digits = String(order.phone || "").replace(/\D/g, "");

  if (digits) {
    payer.phone = {
      area_code: digits.startsWith("56") ? "56" : undefined,
      number: digits.startsWith("56") ? digits.slice(2) : digits,
    };
  }

  return payer;
}

function summarizePayment(payment) {
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

function mapMercadoPagoStatusToInternalStatus(status) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return "paid";
    case "pending":
    case "in_process":
    case "authorized":
    case "in_mediation":
      return "pending";
    case "refunded":
      return "refunded";
    case "cancelled":
    case "charged_back":
    case "rejected":
      return "failed";
    default:
      return "pending";
  }
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function stringValue(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function getQueryValue(query, key) {
  const value = query && query[key];
  return Array.isArray(value) ? stringValue(value[0]) : stringValue(value);
}

function extractPaymentId(payload = {}, query = {}) {
  const data = asRecord(payload.data);
  const resource = stringValue(payload.resource) || getQueryValue(query, "resource");
  const candidates = [
    data.id,
    payload.id,
    getQueryValue(query, "data.id"),
    getQueryValue(query, "id"),
    getQueryValue(query, "payment_id"),
  ];

  for (const candidate of candidates) {
    const normalized = stringValue(candidate);
    if (normalized) return normalized;
  }

  if (resource) {
    const match = resource.match(/\/payments\/(\d+)(?:\D|$)/i) || resource.match(/(\d+)$/);
    if (match) return match[1];
  }

  return null;
}

function getNotificationTopic(payload = {}, query = {}) {
  return String(
    payload.type ||
      payload.topic ||
      payload.action ||
      getQueryValue(query, "type") ||
      getQueryValue(query, "topic") ||
      ""
  ).toLowerCase();
}

function isPaymentNotification(payload, query) {
  const topic = getNotificationTopic(payload, query);
  return !topic || topic === "payment" || topic.startsWith("payment.");
}

async function createMercadoPagoPreference(order) {
  if (!order || !order.id || !order.order_number) {
    throw makePublicError("Pedido invalido para Mercado Pago.", "Pedido invalido.", 400);
  }

  const attempt = await paymentsRepository.createPaymentAttempt({
    order,
    provider: GATEWAY,
    reference: `MP-PREF-${order.order_number}-${Date.now()}`,
    requestPayload: {
      amount: order.total_tax_inc,
      externalReference: order.order_number,
      gateway: GATEWAY,
    },
  });

  const body = {
    items: buildPreferenceItems(order),
    payer: buildPayer(order),
    external_reference: order.order_number,
    notification_url: getNotificationUrl(),
    back_urls: buildBackUrls(order),
    auto_return: "approved",
    metadata: {
      order_id: order.id,
      order_number: order.order_number,
      gateway: GATEWAY,
    },
    payment_methods: {
      installments: 6,
      excluded_payment_methods: [{ id: "visa" }],
    },
  };

  try {
    const preference = await new Preference(getClient()).create({
      body,
      requestOptions: getRequestOptions(`mp-pref-${attempt.id}`),
    });
    const initPoint = preference.init_point || preference.sandbox_init_point;

    if (!initPoint) {
      throw makePublicError(
        "Mercado Pago no retorno init_point.",
        "Mercado Pago no entrego una URL de pago."
      );
    }

    const updatedAttempt = await paymentsRepository.updatePaymentAttempt(attempt.id, {
      provider_transaction_id: preference.id || null,
      redirect_url: initPoint,
      request_payload: {
        ...(attempt.request_payload || {}),
        preference: body,
      },
      response_payload: {
        preferenceId: preference.id || null,
        initPoint,
        sandboxInitPoint: preference.sandbox_init_point || null,
      },
    });

    await ordersRepository.addOrderEvent(order.id, "mercadopago_preference_created", {
      paymentAttemptId: attempt.id,
      preferenceId: preference.id || null,
      orderNumber: order.order_number,
    });

    return {
      ok: true,
      gateway: GATEWAY,
      order_number: order.order_number,
      init_point: initPoint,
      preference_id: preference.id || null,
      payment_attempt_id: updatedAttempt.id,
    };
  } catch (error) {
    await paymentsRepository
      .updatePaymentAttempt(attempt.id, {
        status: "failed",
        response_payload: {
          error: error instanceof Error ? error.message : String(error),
        },
      })
      .catch(() => {});

    await ordersRepository
      .addOrderEvent(order.id, "mercadopago_preference_failed", {
        paymentAttemptId: attempt.id,
        message: error instanceof Error ? error.message : String(error),
      })
      .catch(() => {});

    throw error;
  }
}

async function getMercadoPagoPayment(paymentId) {
  return new Payment(getClient()).get({
    id: paymentId,
    requestOptions: getRequestOptions(),
  });
}

async function findOrderForPayment(payment) {
  const metadata = asRecord(payment.metadata);
  const orderId = stringValue(metadata.order_id);
  const orderNumber =
    stringValue(payment.external_reference) || stringValue(metadata.order_number);

  if (orderId) {
    const order = await ordersRepository.getOrderDetail(orderId);
    if (order) return order;
  }

  if (orderNumber) {
    return ordersRepository.getOrderDetail(orderNumber);
  }

  return null;
}

async function upsertMercadoPagoAttempt({ order, paymentId, paymentStatus, payment }) {
  const responsePayload = {
    mercadopago: summarizePayment(payment),
    receivedAt: new Date().toISOString(),
  };
  let attempt = await paymentsRepository.findAttemptByProviderTransactionId({
    provider: GATEWAY,
    providerTransactionId: paymentId,
  });

  if (!attempt && order) {
    attempt = await paymentsRepository.findLatestAttemptByOrderAndProvider({
      orderId: order.id,
      provider: GATEWAY,
    });
  }

  if (attempt) {
    return paymentsRepository.updatePaymentAttempt(attempt.id, {
      status: paymentStatus,
      provider_transaction_id: paymentId,
      response_payload: {
        ...(attempt.response_payload || {}),
        ...responsePayload,
      },
      confirmed_at:
        paymentStatus === "pending" ? attempt.confirmed_at : new Date().toISOString(),
    });
  }

  return paymentsRepository.createPaymentAttempt({
    order,
    provider: GATEWAY,
    reference: `MP-PAY-${paymentId}`,
    status: paymentStatus,
    providerTransactionId: paymentId,
    requestPayload: {
      source: "mercadopago_webhook",
      externalReference: payment.external_reference || null,
    },
    responsePayload,
  });
}

async function processMercadoPagoWebhook(payload = {}, query = {}, _headers = {}) {
  if (!isPaymentNotification(payload, query)) {
    return {
      ok: true,
      ignored: true,
      reason: "non_payment_notification",
    };
  }

  const paymentId = extractPaymentId(payload, query);

  if (!paymentId) {
    return {
      ok: true,
      ignored: true,
      reason: "missing_payment_id",
    };
  }

  const providerPayment = await getMercadoPagoPayment(paymentId);
  const paymentStatus = mapMercadoPagoStatusToInternalStatus(providerPayment.status);
  const order = await findOrderForPayment(providerPayment);

  if (!order) {
    return {
      ok: true,
      found: false,
      paymentId,
      providerStatus: providerPayment.status || null,
      reason: "order_not_found",
    };
  }

  const attempt = await upsertMercadoPagoAttempt({
    order,
    paymentId,
    paymentStatus,
    payment: providerPayment,
  });
  const result = await applyPaymentStatusToOrder({
    order,
    paymentStatus,
    paymentAttemptId: attempt.id,
    gateway: GATEWAY,
    eventType: "mercadopago_payment_status_updated",
    eventPayload: {
      paymentId,
      providerStatus: providerPayment.status || null,
      statusDetail: providerPayment.status_detail || null,
      externalReference: providerPayment.external_reference || null,
      mercadopago: summarizePayment(providerPayment),
    },
  });

  return {
    ok: true,
    found: true,
    paymentId,
    providerStatus: providerPayment.status || null,
    paymentStatus,
    orderNumber: result.order.order_number,
    skippedStatusUpdate: result.skippedStatusUpdate,
  };
}

function buildMercadoPagoReturnUrl(query = {}) {
  const rawStatus = getQueryValue(query, "status") || getQueryValue(query, "collection_status");
  const paymentId = getQueryValue(query, "payment_id") || getQueryValue(query, "collection_id");
  const externalReference = getQueryValue(query, "external_reference");
  const preferenceId = getQueryValue(query, "preference_id");
  const merchantOrderId = getQueryValue(query, "merchant_order_id");
  const normalizedStatus = String(rawStatus || "").toLowerCase();
  let path = "/compra/pendiente";

  if (normalizedStatus === "approved") {
    path = "/compra/exito";
  } else if (["rejected", "cancelled", "refunded", "charged_back"].includes(normalizedStatus)) {
    path = "/compra/rechazada";
  }

  const url = new URL(path, `${getFrontendSiteUrl()}/`);
  url.searchParams.set("provider", GATEWAY);

  if (externalReference) url.searchParams.set("order", externalReference);
  if (rawStatus) url.searchParams.set("status", rawStatus);
  if (paymentId) url.searchParams.set("payment_id", paymentId);
  if (preferenceId) url.searchParams.set("preference_id", preferenceId);
  if (merchantOrderId) url.searchParams.set("merchant_order_id", merchantOrderId);
  if (externalReference) url.searchParams.set("external_reference", externalReference);

  return url.toString();
}

module.exports = {
  buildMercadoPagoReturnUrl,
  createMercadoPagoPreference,
  isMercadoPagoConfigured,
  mapMercadoPagoStatusToInternalStatus,
  processMercadoPagoWebhook,
};

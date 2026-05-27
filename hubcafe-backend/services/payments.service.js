const { getFlowPaymentStatus } = require("../lib/flow-client");
const { mapFlowStatusToPaymentStatus } = require("../lib/status-mapper");
const ordersRepository = require("../repositories/orders.repository");
const paymentsRepository = require("../repositories/payments.repository");
const { discountStockFromSupabase } = require("./stock.service");
const { sendPaidOrderEmail } = require("./mail.service");

function getFlowToken(req) {
  return String((req.body && req.body.token) || (req.query && req.query.token) || "");
}

function paymentSummaryFromFlow(flowStatus, token) {
  return {
    provider: "flow",
    token,
    status: flowStatus.status,
    commerceOrder: flowStatus.commerceOrder || flowStatus.commerce_order || "",
    flowOrder: flowStatus.flowOrder || "",
    requestDate: flowStatus.requestDate || "",
    paymentData: flowStatus.paymentData || null,
  };
}

function getFrontendSiteUrl() {
  return (process.env.FRONTEND_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://hubcafe.cl").replace(
    /\/$/,
    ""
  );
}

function getNextOrderStatusFromPayment(paymentStatus, currentOrderStatus) {
  if (paymentStatus === "paid" && ["pending", "rejected", "cancelled"].includes(currentOrderStatus)) {
    return "paid";
  }

  if (paymentStatus === "failed" || paymentStatus === "rejected") {
    return "rejected";
  }

  if (paymentStatus === "cancelled" || paymentStatus === "refunded") {
    return "cancelled";
  }

  return null;
}

async function processPaidOrderOnce(order) {
  try {
    await discountStockFromSupabase(order);
  } catch (error) {
    await ordersRepository.addOrderEvent(order.id, "stock_discount_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    await sendPaidOrderEmail(order);
  } catch (error) {
    await ordersRepository.addOrderEvent(order.id, "paid_order_email_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function applyPaymentStatusToOrder({
  order,
  paymentStatus,
  paymentAttemptId,
  gateway,
  eventType,
  eventPayload = {},
}) {
  const shouldPreservePaidOrder =
    order.payment_status === "paid" &&
    ["pending", "rejected", "cancelled"].includes(paymentStatus);
  let updatedOrder = order;

  if (!shouldPreservePaidOrder) {
    const nextOrderStatus = getNextOrderStatusFromPayment(
      paymentStatus,
      order.order_status
    );

    updatedOrder = await ordersRepository.updateOrderPaymentStatus(
      order.id,
      paymentStatus,
      nextOrderStatus
    );
  }

  await ordersRepository.addOrderEvent(order.id, eventType, {
    paymentAttemptId,
    paymentStatus,
    gateway,
    skippedStatusUpdate: shouldPreservePaidOrder,
    ...eventPayload,
  });

  const detailedOrder = await ordersRepository.getOrderDetail(updatedOrder.id);

  if (paymentStatus === "paid") {
    await processPaidOrderOnce(detailedOrder);
  }

  return {
    order: detailedOrder,
    skippedStatusUpdate: shouldPreservePaidOrder,
  };
}

async function processFlowToken(token) {
  const flowStatus = await getFlowPaymentStatus(token);
  const commerceOrder = flowStatus.commerceOrder || flowStatus.commerce_order || "";
  const paymentStatus = mapFlowStatusToPaymentStatus(flowStatus.status);
  const attempt = await paymentsRepository.findFlowAttempt({
    token,
    commerceOrder,
    reference: commerceOrder,
  });

  if (!attempt) {
    return {
      ok: true,
      found: false,
      order: null,
      paymentStatus,
      flowStatus,
    };
  }

  const order = await ordersRepository.getOrderDetail(attempt.order_id);
  if (!order) {
    return {
      ok: true,
      found: false,
      order: null,
      paymentStatus,
      flowStatus,
    };
  }

  const responsePayload = {
    ...(attempt.response_payload || {}),
    token,
    flowStatus: paymentSummaryFromFlow(flowStatus, token),
  };

  await paymentsRepository.updatePaymentAttempt(attempt.id, {
    status: paymentStatus,
    provider_transaction_id: flowStatus.flowOrder
      ? String(flowStatus.flowOrder)
      : attempt.provider_transaction_id,
    response_payload: responsePayload,
    confirmed_at: paymentStatus === "pending" ? attempt.confirmed_at : new Date().toISOString(),
  });

  const result = await applyPaymentStatusToOrder({
    order,
    paymentStatus,
    paymentAttemptId: attempt.id,
    gateway: "flow",
    eventType: "flow_payment_status_updated",
    eventPayload: {
      flowStatus: flowStatus.status,
      commerceOrder,
    },
  });

  return {
    ok: true,
    found: true,
    order: result.order,
    paymentStatus,
    flowStatus,
  };
}

function buildFlowReturnUrl(result) {
  const hasVerifiedOrder = Boolean(result.found && result.order && result.order.order_number);
  let path = "/compra/pendiente";
  let returnStatus = "pending";

  if (hasVerifiedOrder && result.paymentStatus === "paid") {
    path = "/compra/exito";
    returnStatus = "success";
  } else if (
    hasVerifiedOrder &&
    ["failed", "rejected", "refunded"].includes(result.paymentStatus)
  ) {
    path = "/compra/rechazada";
    returnStatus = "failed";
  } else if (hasVerifiedOrder && result.paymentStatus === "cancelled") {
    path = "/compra/rechazada";
    returnStatus = "cancelled";
  } else if (!hasVerifiedOrder) {
    returnStatus = "unverified";
  }

  const url = new URL(path, `${getFrontendSiteUrl()}/`);
  url.searchParams.set("status", returnStatus);
  if (result.order && result.order.order_number) {
    url.searchParams.set("order", result.order.order_number);
  }
  if (result.reason || !hasVerifiedOrder) {
    url.searchParams.set("reason", result.reason || "unverified");
  }
  return url.toString();
}

module.exports = {
  applyPaymentStatusToOrder,
  buildFlowReturnUrl,
  getFlowToken,
  getFrontendSiteUrl,
  processFlowToken,
  processPaidOrderOnce,
};

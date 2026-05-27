const express = require("express");
const {
  buildFlowReturnUrl,
  getFlowToken,
  processFlowToken,
} = require("../services/payments.service");
const {
  buildMercadoPagoReturnUrl,
  createMercadoPagoPreference,
  processMercadoPagoWebhook,
} = require("../services/mercadopago.service");
const ordersService = require("../services/orders.service");

const router = express.Router();

async function handleFlowWebhook(req, res, next) {
  try {
    const token = getFlowToken(req);

    if (!token) {
      res.status(400).json({ ok: false, error: "token requerido" });
      return;
    }

    const result = await processFlowToken(token);
    res.status(200).json({
      ok: true,
      found: result.found,
      paymentStatus: result.paymentStatus,
      order: result.order
        ? {
            id: result.order.id,
            order_number: result.order.order_number,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
}

router.post("/payments/flow/webhook", handleFlowWebhook);
router.post("/payments/flow/confirm", handleFlowWebhook);

router.post("/payments/mercadopago/preference", async (req, res, next) => {
  try {
    const orderNumber = String(
      (req.body && (req.body.order_number || req.body.orderNumber)) || ""
    ).trim();
    const orderId = String(
      (req.body && (req.body.order_id || req.body.orderId)) || ""
    ).trim();
    const order = await ordersService.getOrder(orderId || orderNumber);

    if (!order) {
      res.status(404).json({ ok: false, error: "Pedido no encontrado" });
      return;
    }

    if (order.payment_status !== "pending") {
      res.status(409).json({
        ok: false,
        error: "El pedido no esta pendiente de pago.",
      });
      return;
    }

    const result = await createMercadoPagoPreference(order);
    res.json({
      ...result,
      order_id: order.id,
      paymentUrl: result.init_point,
      redirectUrl: result.init_point,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/payments/mercadopago/webhook", async (req, res) => {
  try {
    const result = await processMercadoPagoWebhook(
      req.body || {},
      req.query || {},
      req.headers || {}
    );

    res.status(200).json(result);
  } catch (error) {
    console.error(
      "[hubcafe-backend:mercadopago-webhook]",
      error instanceof Error ? error.message : String(error)
    );
    res.status(200).json({
      ok: false,
      error: "webhook_processing_failed",
    });
  }
});

router.get("/payments/status", async (req, res, next) => {
  try {
    const orderNumber = String(req.query.order || req.query.orderNumber || "").trim();

    if (!orderNumber) {
      res.status(400).json({ ok: false, error: "order requerido" });
      return;
    }

    if (!/^SMK-[A-Z0-9-]{6,64}$/i.test(orderNumber)) {
      res.status(400).json({ ok: false, error: "order invalido" });
      return;
    }

    const order = await ordersService.getOrder(orderNumber);

    if (!order) {
      res.status(404).json({ ok: false, found: false });
      return;
    }

    res.json({
      ok: true,
      found: true,
      order: {
        order_number: order.order_number,
        order_status: order.order_status,
        payment_status: order.payment_status,
        payment_provider: order.payment_provider,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/payments/mercadopago/return", (req, res) => {
  res.redirect(buildMercadoPagoReturnUrl(req.query || {}));
});

router.get("/payments/flow/return", async (req, res) => {
  try {
    const token = getFlowToken(req);

    if (!token) {
      res.redirect(
        buildFlowReturnUrl({
          found: false,
          order: null,
          paymentStatus: "pending",
          reason: "missing_token",
        })
      );
      return;
    }

    const result = await processFlowToken(token);
    res.redirect(buildFlowReturnUrl(result));
  } catch {
    res.redirect(
      buildFlowReturnUrl({
        found: false,
        order: null,
        paymentStatus: "pending",
        reason: "flow_validation_error",
      })
    );
  }
});

module.exports = router;

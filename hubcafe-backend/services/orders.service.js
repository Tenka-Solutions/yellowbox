const { validateOrderPayload } = require("../lib/validators");
const { createFlowPayment, isFlowConfigured } = require("../lib/flow-client");
const productsRepository = require("../repositories/products.repository");
const ordersRepository = require("../repositories/orders.repository");
const paymentsRepository = require("../repositories/payments.repository");

function extractTaxAmount(totalTaxInc) {
  return Math.round(Number(totalTaxInc || 0) - Number(totalTaxInc || 0) / 1.19);
}

function getProductPrice(product) {
  return Number(product.gross_price_clp ?? product.price_clp_tax_inc ?? 0);
}

function assertProductCanSell(product, quantity) {
  if (!product) {
    throw new Error("Uno o mas productos del carrito no existen en Supabase.");
  }

  if (product.publication_status !== "published") {
    throw new Error(`El producto ${product.name} no esta publicado.`);
  }

  if (["sold_out", "draft", "hidden"].includes(String(product.availability_status))) {
    throw new Error(`El producto ${product.name} no esta disponible.`);
  }

  if (product.stock_quantity !== null && product.stock_quantity !== undefined) {
    const stock = Number(product.stock_quantity);
    if (stock < quantity) {
      throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${stock}.`);
    }
  }

  if (getProductPrice(product) <= 0) {
    throw new Error(`El producto ${product.name} no tiene precio valido.`);
  }
}

async function createOrder(payload) {
  const input = validateOrderPayload(payload);
  const paymentMethod = input.paymentMethod;
  const productMatches = await productsRepository.findProductsForCart(input.cart);
  const items = productMatches.map(({ cartItem, product }) => {
    assertProductCanSell(product, cartItem.quantity);
    const unitPriceTaxInc = getProductPrice(product);

    return {
      product,
      quantity: cartItem.quantity,
      unitPriceTaxInc,
      lineTotalTaxInc: unitPriceTaxInc * cartItem.quantity,
    };
  });
  const subtotalTaxInc = items.reduce((total, item) => total + item.lineTotalTaxInc, 0);
  const totals = {
    subtotalTaxInc,
    taxAmount: extractTaxAmount(subtotalTaxInc),
    totalTaxInc: subtotalTaxInc,
  };
  let order = await ordersRepository.createOrder({
    customer: input.customer,
    items,
    shipping: input.shipping,
    totals,
    paymentProvider: paymentMethod,
  });
  let paymentUrl = null;
  let token = null;
  let warning;

  if (paymentMethod === "mercadopago") {
    await ordersRepository.addOrderEvent(order.id, "mercadopago_checkout_selected", {
      source: "hubcafe-backend",
    });

    order = await ordersRepository.getOrderDetail(order.id);
    return {
      order,
      paymentUrl,
      token,
      provider: "mercadopago",
      nextStep: "create_mercadopago_preference",
    };
  }

  const attempt = await paymentsRepository.createPaymentAttempt({
    order,
    provider: "flow",
    reference: order.order_number,
    requestPayload: {
      amount: order.total_tax_inc,
      customerEmail: order.customer_email,
    },
  });

  if (isFlowConfigured()) {
    const flowPayment = await createFlowPayment(order);
    paymentUrl = flowPayment.paymentUrl;
    token = flowPayment.token;

    await paymentsRepository.updatePaymentAttempt(attempt.id, {
      provider_transaction_id: flowPayment.flowOrder || null,
      redirect_url: paymentUrl,
      response_payload: {
        token,
        flowOrder: flowPayment.flowOrder,
        paymentUrl,
        raw: flowPayment.raw,
      },
    });

    await ordersRepository.addOrderEvent(order.id, "flow_payment_created", {
      paymentAttemptId: attempt.id,
      token,
      flowOrder: flowPayment.flowOrder,
    });
  } else {
    warning = "Flow no configurado";
    await ordersRepository.addOrderEvent(order.id, "flow_not_configured", {
      paymentAttemptId: attempt.id,
    });
  }

  order = await ordersRepository.getOrderDetail(order.id);
  return { order, paymentUrl, token, warning };
}

function listOrders(filters) {
  return ordersRepository.listOrders(filters);
}

function getOrder(id) {
  return ordersRepository.getOrderDetail(id);
}

function updateOrderStatus(id, orderStatus) {
  return ordersRepository.updateOrderStatus(id, orderStatus, {
    source: "hubcafe-admin-api",
  });
}

module.exports = {
  createOrder,
  getOrder,
  listOrders,
  updateOrderStatus,
};

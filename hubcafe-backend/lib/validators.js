function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeCustomer(payload) {
  const input = payload.customer || payload.cliente || payload;
  const name = String(input.name || input.nombre || input.fullName || "").trim();
  const email = normalizeEmail(input.email || input.correo);
  const phone = String(input.phone || input.telefono || "").trim();
  const message = String(input.message || input.mensaje || payload.message || "").trim();

  if (!name) throw new Error("El nombre del cliente es requerido.");
  if (!validateEmail(email)) throw new Error("El correo del cliente es invalido.");
  if (!phone) throw new Error("El telefono del cliente es requerido.");

  return {
    name,
    email,
    phone,
    message,
    rut: input.rut ? String(input.rut).trim() : null,
    companyName: input.companyName || input.empresa || input.company || null,
    businessName: input.businessName || input.razonSocial || null,
    businessActivity: input.businessActivity || input.giro || null,
  };
}

function normalizeCart(payload) {
  const input = payload.cart || payload.carrito || payload.items || payload.productos;

  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("El carrito es requerido.");
  }

  return input.map((item, index) => {
    const id = String(item.id || item.productId || item.product_id || "").trim();
    const sku = String(item.sku || item.codigo || item.code || "").trim();
    const name = String(item.name || item.nombre || item.title || "").trim();
    const quantity = Math.round(Number(item.quantity || item.cantidad || 0));

    if (!id && !sku) {
      throw new Error(`El producto ${index + 1} requiere id o sku.`);
    }
    if (!quantity || quantity <= 0) {
      throw new Error(`La cantidad de ${name || id || sku} es invalida.`);
    }

    return { id, sku, name, quantity };
  });
}

function normalizeShipping(payload) {
  const input = payload.shipping || payload.despacho || null;
  if (!input) return null;

  const region = String(input.region || "").trim();
  const comuna = String(input.comuna || input.city || "").trim();
  const street = String(input.street || input.calle || input.address || "").trim();
  const number = String(input.number || input.numero || "").trim();

  if (!region || !comuna || !street || !number) {
    return null;
  }

  return {
    region,
    comuna,
    street,
    number,
    apartment: input.apartment || input.departamento || null,
    references: input.references || input.referencias || null,
    deliveryNotes: input.deliveryNotes || input.delivery_notes || input.notes || null,
  };
}

function normalizePaymentMethod(payload) {
  const rawMethod = String(
    (payload && (payload.method || payload.paymentMethod || payload.payment_method || payload.gateway)) ||
      ""
  )
    .trim()
    .toLowerCase();

  if (!rawMethod) {
    return "flow";
  }

  if (rawMethod === "mercado_pago" || rawMethod === "mp") {
    return "mercadopago";
  }

  if (rawMethod === "flow" || rawMethod === "mercadopago") {
    return rawMethod;
  }

  throw new Error("Medio de pago no soportado.");
}

function validateOrderPayload(payload) {
  return {
    customer: normalizeCustomer(payload || {}),
    cart: normalizeCart(payload || {}),
    shipping: normalizeShipping(payload || {}),
    paymentMethod: normalizePaymentMethod(payload || {}),
  };
}

function validateQuotePayload(payload) {
  const customer = normalizeCustomer(payload || {});
  const cart = normalizeCart(payload || {});

  return {
    customer,
    cart,
    message: customer.message || String((payload && payload.message) || "").trim(),
  };
}

module.exports = {
  normalizeCustomer,
  normalizePaymentMethod,
  normalizeCart,
  normalizeShipping,
  validateOrderPayload,
  validateQuotePayload,
};

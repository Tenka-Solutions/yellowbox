const { randomUUID } = require("node:crypto");
const { requireSupabaseClient } = require("../lib/supabase-client");

function buildOrderNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const fragment = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `SMK-${stamp}-${fragment}`;
}

async function createOrder({ customer, items, shipping, totals, paymentProvider = "flow" }) {
  const supabase = requireSupabaseClient();
  const orderNumber = buildOrderNumber();
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_email: customer.email,
      customer_name: customer.name,
      phone: customer.phone,
      rut: customer.rut,
      company_name: customer.companyName,
      business_name: customer.businessName,
      business_activity: customer.businessActivity,
      subtotal_tax_inc: totals.subtotalTaxInc,
      tax_amount: totals.taxAmount,
      shipping_label: shipping ? "Direccion informada" : "Por confirmar",
      shipping_amount: 0,
      total_tax_inc: totals.totalTaxInc,
      order_status: "pending",
      payment_status: "pending",
      payment_provider: paymentProvider,
    })
    .select("*")
    .single();

  if (error) throw error;

  const { error: itemsError } = await supabase.from("order_items").insert(
    items.map((item) => ({
      order_id: order.id,
      product_id: item.product.id,
      product_snapshot: item.product,
      sku_snapshot: item.product.sku || null,
      name_snapshot: item.product.name,
      quantity: item.quantity,
      unit_price_tax_inc: item.unitPriceTaxInc,
      line_total_tax_inc: item.lineTotalTaxInc,
    }))
  );

  if (itemsError) throw itemsError;

  if (shipping) {
    const { error: shippingError } = await supabase
      .from("order_shipping_addresses")
      .insert({
        order_id: order.id,
        region: shipping.region,
        comuna: shipping.comuna,
        street: shipping.street,
        number: shipping.number,
        apartment: shipping.apartment,
        references: shipping.references,
        delivery_notes: shipping.deliveryNotes,
      });

    if (shippingError) throw shippingError;
  }

  await addOrderEvent(order.id, "order_created", {
    source: "hubcafe-backend",
    itemCount: items.length,
    paymentProvider,
  });

  return getOrderByIdOrNumber(order.id);
}

async function addOrderEvent(orderId, eventType, payload) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("order_events")
    .insert({
      order_id: orderId,
      event_type: eventType,
      payload: payload || {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function hasOrderEvent(orderId, eventType) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("order_events")
    .select("id")
    .eq("order_id", orderId)
    .eq("event_type", eventType)
    .limit(1);

  if (error) throw error;
  return (data || []).length > 0;
}

async function listOrders(filters = {}) {
  const supabase = requireSupabaseClient();
  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  if (filters.payment_status) query = query.eq("payment_status", filters.payment_status);
  if (filters.order_status) query = query.eq("order_status", filters.order_status);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00.000Z`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) throw error;

  const q = String(filters.q || "").trim().toLowerCase();
  if (!q) return data || [];

  return (data || []).filter((order) =>
    [
      order.id,
      order.order_number,
      order.customer_name,
      order.customer_email,
      order.phone,
      order.company_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}

async function getOrderByIdOrNumber(idOrNumber) {
  const supabase = requireSupabaseClient();
  const { data: byId, error: idError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", idOrNumber)
    .maybeSingle();

  if (idError && idError.code !== "22P02") throw idError;
  if (byId) return byId;

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", idOrNumber)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getOrderDetail(idOrNumber) {
  const order = await getOrderByIdOrNumber(idOrNumber);
  if (!order) return null;

  const supabase = requireSupabaseClient();
  const [items, attempts, events, shipping] = await Promise.all([
    supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("payment_attempts")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("order_events")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("order_shipping_addresses")
      .select("*")
      .eq("order_id", order.id)
      .maybeSingle(),
  ]);

  [items, attempts, events, shipping].forEach((response) => {
    if (response.error) throw response.error;
  });

  return {
    ...order,
    items: items.data || [],
    payment_attempts: attempts.data || [],
    order_events: events.data || [],
    shipping_address: shipping.data || null,
  };
}

async function updateOrderStatus(idOrNumber, orderStatus, meta = {}) {
  const order = await getOrderByIdOrNumber(idOrNumber);
  if (!order) return null;

  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ order_status: orderStatus })
    .eq("id", order.id)
    .select("*")
    .single();

  if (error) throw error;
  await addOrderEvent(order.id, "admin_order_status_updated", {
    previousStatus: order.order_status,
    orderStatus,
    ...meta,
  });
  return data;
}

async function updateOrderPaymentStatus(orderId, paymentStatus, orderStatus) {
  const supabase = requireSupabaseClient();
  const patch = { payment_status: paymentStatus };
  if (orderStatus) patch.order_status = orderStatus;

  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  addOrderEvent,
  createOrder,
  getOrderByIdOrNumber,
  getOrderDetail,
  hasOrderEvent,
  listOrders,
  updateOrderPaymentStatus,
  updateOrderStatus,
};

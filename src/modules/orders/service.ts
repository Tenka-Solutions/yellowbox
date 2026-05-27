import { randomUUID } from "node:crypto";
import { extractTaxAmount } from "@/lib/format/currency";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getCatalogProducts } from "@/modules/catalog/repository";
import {
  CheckoutCustomerInput,
  CheckoutShippingInput,
} from "@/modules/checkout/schema";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "rejected"
  | "cancelled"
  | "failed"
  | "refunded";
export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "rejected"
  | "cancelled"
  | "preparing"
  | "shipped"
  | "completed"
  | "delivered";

interface OrderRow {
  id: string;
  order_number: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal_tax_inc: number | null;
  total_tax_inc: number | null;
  created_at: string | null;
  updated_at: string | null;
  customer_name: string;
  customer_email: string;
  phone: string | null;
  rut: string | null;
  company_name: string | null;
  business_name: string | null;
  business_activity: string | null;
  tax_amount: number | null;
  shipping_amount: number | null;
  shipping_label: string | null;
  payment_provider: string | null;
  archived_at?: string | null;
  archived_by?: string | null;
  internal_note?: string | null;
}

interface OrderAddressRow {
  region: string;
  comuna: string;
  street: string;
  number: string;
  apartment: string | null;
  references: string | null;
  delivery_notes: string | null;
}

interface OrderItemRow {
  product_id: string | null;
  sku_snapshot: string | null;
  name_snapshot: string | null;
  quantity: number | null;
  unit_price_tax_inc: number | null;
  line_total_tax_inc: number | null;
}

interface PaymentAttemptRow {
  provider: string | null;
  reference: string | null;
  status: PaymentStatus | null;
  provider_transaction_id: string | null;
}

export interface CreateOrderDraftInput {
  customer: CheckoutCustomerInput;
  shipping: CheckoutShippingInput;
  items: Array<{ id: string; quantity: number }>;
  userId?: string | null;
}

export interface OrderSnapshot {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  subtotalTaxInc: number;
  taxAmount: number;
  totalTaxInc: number;
  shippingLabel: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPriceTaxInc: number;
    lineTotalTaxInc: number;
  }>;
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  totalTaxInc: number;
  createdAt: string | null;
  updatedAt: string | null;
  customerName: string;
  customerEmail: string;
  phone: string | null;
  companyName: string | null;
  rut: string | null;
  paymentProvider: string | null;
  archivedAt: string | null;
  archivedBy: string | null;
  internalNote: string | null;
}

export interface OrderDetail extends OrderListItem {
  businessName: string | null;
  businessActivity: string | null;
  subtotalTaxInc: number;
  taxAmount: number;
  shippingAmount: number;
  shippingLabel: string;
  paymentAttemptProvider: string | null;
  reference: string | null;
  paymentAttemptStatus: PaymentStatus | null;
  paymentTransactionId: string | null;
  items: Array<{
    productId: string | null;
    sku: string | null;
    name: string;
    quantity: number;
    unitPriceTaxInc: number;
    lineTotalTaxInc: number;
  }>;
  shippingAddress: {
    region: string;
    comuna: string;
    street: string;
    number: string;
    apartment: string | null;
    references: string | null;
    deliveryNotes: string | null;
  } | null;
}

export function buildOrderNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const fragment = randomUUID().slice(0, 8).toUpperCase();
  return `SMK-${stamp}-${fragment}`;
}

function toOrderListItem(order: OrderRow): OrderListItem {
  return {
    id: order.id,
    orderNumber: order.order_number,
    orderStatus: order.order_status,
    paymentStatus: order.payment_status,
    totalTaxInc: order.total_tax_inc ?? 0,
    createdAt: order.created_at ?? null,
    updatedAt: order.updated_at ?? null,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    phone: order.phone ?? null,
    companyName: order.company_name ?? null,
    rut: order.rut ?? null,
    paymentProvider: order.payment_provider ?? null,
    archivedAt: order.archived_at ?? null,
    archivedBy: order.archived_by ?? null,
    internalNote: order.internal_note ?? null,
  };
}

function mapOrderDetail(
  order: OrderRow,
  address: OrderAddressRow | null,
  itemRows: OrderItemRow[],
  paymentAttempt: PaymentAttemptRow | null
): OrderDetail {
  return {
    ...toOrderListItem(order),
    businessName: order.business_name ?? null,
    businessActivity: order.business_activity ?? null,
    subtotalTaxInc: order.subtotal_tax_inc ?? 0,
    taxAmount: order.tax_amount ?? 0,
    shippingAmount: order.shipping_amount ?? 0,
    shippingLabel: order.shipping_label ?? "Por confirmar",
    paymentAttemptProvider: paymentAttempt?.provider ?? null,
    reference: paymentAttempt?.reference ?? null,
    paymentAttemptStatus: paymentAttempt?.status ?? null,
    paymentTransactionId: paymentAttempt?.provider_transaction_id ?? null,
    items: itemRows.map((item) => ({
      productId: item.product_id ?? null,
      sku: item.sku_snapshot ?? null,
      name: item.name_snapshot ?? "Producto",
      quantity: item.quantity ?? 0,
      unitPriceTaxInc: item.unit_price_tax_inc ?? 0,
      lineTotalTaxInc: item.line_total_tax_inc ?? 0,
    })),
    shippingAddress: address
      ? {
          region: address.region,
          comuna: address.comuna,
          street: address.street,
          number: address.number,
          apartment: address.apartment ?? null,
          references: address.references ?? null,
          deliveryNotes: address.delivery_notes ?? null,
        }
      : null,
  };
}

export async function createOrderDraft(input: CreateOrderDraftInput) {
  const products = await getCatalogProducts();
  const enrichedItems = input.items.map((item) => {
    const product = products.find((entry) => entry.id === item.id);

    if (!product) {
      throw new Error("Uno o mas productos del carrito ya no estan disponibles.");
    }

    if (["sold_out", "draft", "hidden"].includes(product.availabilityStatus)) {
      throw new Error(
        `El producto ${product.name} no esta disponible para compra directa.`
      );
    }

    return {
      product,
      quantity: item.quantity,
      lineTotalTaxInc: product.priceClpTaxInc * item.quantity,
    };
  });

  const subtotalTaxInc = enrichedItems.reduce(
    (total, item) => total + item.lineTotalTaxInc,
    0
  );
  const orderNumber = buildOrderNumber();
  const taxAmount = extractTaxAmount(subtotalTaxInc);
  const adminClient = createSupabaseAdminClient();

  const orderSnapshot: OrderSnapshot = {
    id: randomUUID(),
    orderNumber,
    customerName: input.customer.fullName,
    customerEmail: input.customer.email,
    paymentStatus: "pending",
    orderStatus: "pending",
    subtotalTaxInc,
    taxAmount,
    totalTaxInc: subtotalTaxInc,
    shippingLabel: "Por confirmar",
    items: enrichedItems.map(({ product, quantity, lineTotalTaxInc }) => ({
      productId: product.id,
      name: product.name,
      quantity,
      unitPriceTaxInc: product.priceClpTaxInc,
      lineTotalTaxInc,
    })),
  };

  if (!adminClient) {
    return {
      ...orderSnapshot,
      source: "mock" as const,
    };
  }

  const { data: orderRow, error: orderError } = await adminClient
    .from("orders")
    .insert({
      order_number: orderSnapshot.orderNumber,
      user_id: input.userId ?? null,
      customer_email: input.customer.email,
      customer_name: input.customer.fullName,
      phone: input.customer.phone,
      rut: input.customer.rut ?? null,
      company_name: input.customer.companyName ?? null,
      business_name: input.customer.businessName ?? null,
      business_activity: input.customer.businessActivity ?? null,
      subtotal_tax_inc: orderSnapshot.subtotalTaxInc,
      tax_amount: orderSnapshot.taxAmount,
      total_tax_inc: orderSnapshot.totalTaxInc,
      shipping_label: "Por confirmar",
      payment_provider: env.paymentsMode === "getnet" ? "getnet" : "mock",
      order_status: "pending",
      payment_status: "pending",
    })
    .select("id")
    .single();

  if (orderError || !orderRow) {
    return {
      ...orderSnapshot,
      source: "mock" as const,
    };
  }

  await adminClient.from("order_shipping_addresses").insert({
    order_id: orderRow.id,
    region: input.shipping.region,
    comuna: input.shipping.comuna,
    street: input.shipping.street,
    number: input.shipping.number,
    apartment: input.shipping.apartment ?? null,
    references: input.shipping.references ?? null,
    delivery_notes: input.shipping.deliveryNotes ?? null,
  });

  await adminClient.from("order_items").insert(
    enrichedItems.map(({ product, quantity, lineTotalTaxInc }) => ({
      order_id: orderRow.id,
      product_id: product.id,
      product_snapshot: product,
      sku_snapshot: product.sku,
      name_snapshot: product.name,
      quantity,
      unit_price_tax_inc: product.priceClpTaxInc,
      line_total_tax_inc: lineTotalTaxInc,
    }))
  );

  await adminClient.from("order_events").insert({
    order_id: orderRow.id,
    event_type: "order_created",
    payload: {
      source: "checkout",
      itemCount: orderSnapshot.items.length,
    },
  });

  return {
    ...orderSnapshot,
    id: orderRow.id,
    source: "supabase" as const,
  };
}

export async function listOrdersForUser(userId: string) {
  const adminClient = createSupabaseAdminClient();

  if (!adminClient) {
    return [];
  }

  const { data } = await adminClient
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []).map(toOrderListItem);
}

export async function listOrdersForAdmin() {
  const adminClient = createSupabaseAdminClient();

  if (!adminClient) {
    return [];
  }

  const { data } = await adminClient
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map(toOrderListItem);
}

export async function getOrderDetailById(orderId: string) {
  const adminClient = createSupabaseAdminClient();

  if (!adminClient) {
    return null;
  }

  const [
    { data: orderData },
    { data: addressData },
    { data: itemsData },
    { data: attemptData },
  ] = await Promise.all([
    adminClient.from("orders").select("*").eq("id", orderId).maybeSingle(),
    adminClient
      .from("order_shipping_addresses")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle(),
    adminClient
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    adminClient
      .from("payment_attempts")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const order = orderData as OrderRow | null;
  const address = addressData as OrderAddressRow | null;
  const items = (itemsData ?? []) as OrderItemRow[];
  const attempt = attemptData as PaymentAttemptRow | null;

  if (!order) {
    return null;
  }

  return mapOrderDetail(order, address, items, attempt);
}

export async function getOrderByOrderNumberForUser(
  userId: string,
  orderNumber: string
) {
  const adminClient = createSupabaseAdminClient();

  if (!adminClient) {
    return null;
  }

  const { data: order } = await adminClient
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (!order) {
    return null;
  }

  return getOrderDetailById(order.id);
}

export async function updateOrderStatuses({
  orderId,
  orderStatus,
  paymentStatus,
  note,
}: {
  orderId: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  note?: string;
}) {
  const adminClient = createSupabaseAdminClient();

  if (!adminClient) {
    return false;
  }

  await adminClient
    .from("orders")
    .update({
      order_status: orderStatus,
      payment_status: paymentStatus,
    })
    .eq("id", orderId);

  await adminClient.from("order_events").insert({
    order_id: orderId,
    event_type: "status_updated",
    payload: {
      orderStatus,
      paymentStatus,
      note: note ?? null,
    },
  });

  return true;
}

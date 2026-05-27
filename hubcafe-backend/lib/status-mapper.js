const PAYMENT_STATUS_TO_SUPABASE = {
  PENDIENTE_PAGO: "pending",
  PAGADO: "paid",
  RECHAZADO: "rejected",
  ANULADO: "cancelled",
  FALLIDO: "failed",
  REEMBOLSADO: "refunded",
};

const ORDER_STATUS_TO_SUPABASE = {
  NUEVO: "pending",
  EN_PREPARACION: "preparing",
  LISTO_PARA_DESPACHO: "processing",
  DESPACHADO: "shipped",
  ENTREGADO: "delivered",
  CANCELADO: "cancelled",
};

const ALLOWED_PUBLIC_ORDER_STATUSES = Object.keys(ORDER_STATUS_TO_SUPABASE);
const ALLOWED_SUPABASE_ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "preparing",
  "shipped",
  "completed",
  "delivered",
  "cancelled",
  "rejected",
];

function mapPaymentStatusToSupabase(status) {
  return PAYMENT_STATUS_TO_SUPABASE[status] || status || "pending";
}

function mapOrderStatusToSupabase(status) {
  return ORDER_STATUS_TO_SUPABASE[status] || status || "pending";
}

function mapFlowStatusToPaymentStatus(status) {
  const numericStatus = Number(status);
  if (numericStatus === 2) return "paid";
  if (numericStatus === 3) return "rejected";
  if (numericStatus === 4) return "cancelled";
  return "pending";
}

function isValidOrderStatus(status) {
  return ALLOWED_SUPABASE_ORDER_STATUSES.includes(status);
}

module.exports = {
  ALLOWED_PUBLIC_ORDER_STATUSES,
  ALLOWED_SUPABASE_ORDER_STATUSES,
  mapFlowStatusToPaymentStatus,
  mapOrderStatusToSupabase,
  mapPaymentStatusToSupabase,
  isValidOrderStatus,
};

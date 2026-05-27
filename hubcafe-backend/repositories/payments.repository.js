const { requireSupabaseClient } = require("../lib/supabase-client");

function buildDefaultReference(provider, order) {
  if (provider === "flow") {
    return order.order_number;
  }

  return `${provider.toUpperCase()}-${order.order_number}-${Date.now()}`;
}

async function createPaymentAttempt({
  order,
  provider = "flow",
  reference,
  status = "pending",
  requestPayload = {},
  responsePayload = {},
  redirectUrl = null,
  providerTransactionId = null,
}) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("payment_attempts")
    .insert({
      order_id: order.id,
      provider,
      reference: reference || buildDefaultReference(provider, order),
      status,
      provider_transaction_id: providerTransactionId,
      request_payload: {
        ...requestPayload,
        orderNumber: order.order_number,
        commerceOrder: order.order_number,
      },
      response_payload: responsePayload,
      redirect_url: redirectUrl,
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabase
    .from("orders")
    .update({
      latest_payment_attempt_id: data.id,
      payment_provider: provider,
    })
    .eq("id", order.id);

  return data;
}

async function updatePaymentAttempt(id, patch) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("payment_attempts")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function findFlowAttempt({ token, commerceOrder, reference }) {
  const supabase = requireSupabaseClient();

  if (reference || commerceOrder) {
    const { data, error } = await supabase
      .from("payment_attempts")
      .select("*")
      .eq("provider", "flow")
      .eq("reference", reference || commerceOrder)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (token) {
    const { data, error } = await supabase
      .from("payment_attempts")
      .select("*")
      .eq("provider", "flow")
      .contains("response_payload", { token })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  return null;
}

async function findAttemptByProviderTransactionId({ provider, providerTransactionId }) {
  if (!providerTransactionId) return null;

  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("payment_attempts")
    .select("*")
    .eq("provider", provider)
    .eq("provider_transaction_id", String(providerTransactionId))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function findLatestAttemptByOrderAndProvider({ orderId, provider }) {
  if (!orderId || !provider) return null;

  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("payment_attempts")
    .select("*")
    .eq("order_id", orderId)
    .eq("provider", provider)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function findAttemptByReference({ provider, reference }) {
  if (!reference) return null;

  const supabase = requireSupabaseClient();
  let query = supabase
    .from("payment_attempts")
    .select("*")
    .eq("reference", reference)
    .order("created_at", { ascending: false })
    .limit(1);

  if (provider) {
    query = query.eq("provider", provider);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return data || null;
}

module.exports = {
  createPaymentAttempt,
  findAttemptByProviderTransactionId,
  findAttemptByReference,
  findFlowAttempt,
  findLatestAttemptByOrderAndProvider,
  updatePaymentAttempt,
};

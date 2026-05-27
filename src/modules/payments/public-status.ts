export type PublicPaymentStatus =
  | "pending"
  | "paid"
  | "rejected"
  | "cancelled"
  | "failed"
  | "refunded";

export interface PublicOrderPaymentStatus {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: PublicPaymentStatus;
}

interface BackendPaymentStatusResponse {
  ok?: boolean;
  found?: boolean;
  order?: {
    order_number?: string;
    order_status?: string;
    payment_status?: PublicPaymentStatus;
    payment_provider?: string | null;
  };
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

export async function getPublicOrderPaymentStatus(
  orderNumber?: string
): Promise<PublicOrderPaymentStatus | null> {
  if (!apiBaseUrl || !orderNumber) {
    return null;
  }

  try {
    const url = new URL(`${apiBaseUrl}/payments/status`);
    url.searchParams.set("order", orderNumber);

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as BackendPaymentStatusResponse;
    const order = payload.order;

    if (!payload.ok || !order?.order_number || !order.payment_status) {
      return null;
    }

    return {
      orderNumber: order.order_number,
      orderStatus: order.order_status ?? "pending",
      paymentStatus: order.payment_status,
    };
  } catch {
    return null;
  }
}

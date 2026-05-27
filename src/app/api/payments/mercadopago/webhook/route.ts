import { NextRequest, NextResponse } from "next/server";
import { processMercadoPagoPaymentNotification } from "@/modules/payments/mercadopago-service";

export const runtime = "nodejs";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function stringValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

async function parseBody(request: NextRequest) {
  const rawBody = await request.text();

  if (!rawBody.trim()) {
    return {};
  }

  try {
    return (JSON.parse(rawBody) as unknown) ?? {};
  } catch {
    return Object.fromEntries(new URLSearchParams(rawBody).entries());
  }
}

function getPaymentIdFromResource(resource: string | null) {
  if (!resource) {
    return null;
  }

  const match = resource.match(/\/payments\/([^/?#]+)/i);
  return match?.[1] ?? null;
}

function getPaymentId(
  body: Record<string, unknown>,
  searchParams: URLSearchParams
) {
  const data = asRecord(body.data);

  return (
    stringValue(data?.id) ??
    stringValue(body.id) ??
    searchParams.get("data.id") ??
    searchParams.get("id") ??
    getPaymentIdFromResource(
      stringValue(body.resource) ?? searchParams.get("resource")
    )
  );
}

function getTopic(
  body: Record<string, unknown>,
  searchParams: URLSearchParams
) {
  return (
    stringValue(body.type) ??
    stringValue(body.topic) ??
    searchParams.get("type") ??
    searchParams.get("topic")
  );
}

export async function POST(request: NextRequest) {
  const parsedBody = await parseBody(request);
  const body = asRecord(parsedBody) ?? {};
  const topic = getTopic(body, request.nextUrl.searchParams);

  if (topic && topic !== "payment") {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "unsupported-topic",
    });
  }

  const paymentId = getPaymentId(body, request.nextUrl.searchParams);

  if (!paymentId) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "missing-payment-id",
    });
  }

  try {
    const result = await processMercadoPagoPaymentNotification(paymentId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      paymentId,
      error:
        error instanceof Error
          ? error.message
          : "No fue posible procesar el webhook de Mercado Pago.",
    });
  }
}

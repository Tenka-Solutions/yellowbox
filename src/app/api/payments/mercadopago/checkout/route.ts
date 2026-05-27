import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/modules/auth/server";
import { checkoutPayloadSchema } from "@/modules/checkout/schema";
import { createOrderDraft } from "@/modules/orders/service";
import { buildPaymentDeps } from "@/modules/payments/factory";
import { recordMercadoPagoCheckoutAttempt } from "@/modules/payments/mercadopago-service";
import {
  MercadoPagoConfigurationError,
  assertMercadoPagoCheckoutReady,
} from "@/modules/payments/providers/mercadopago";
import {
  OrderNotFoundError,
  UnsupportedProviderError,
  createPayment,
} from "@/modules/payments/use-cases/create-payment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertMercadoPagoCheckoutReady();

    const payload = await request.json();
    const parsed = checkoutPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "No fue posible validar el checkout.",
        },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser();
    const order = await createOrderDraft({
      customer: parsed.data.customer,
      shipping: parsed.data.shipping,
      items: parsed.data.items,
      userId: user?.id ?? null,
    });

    if (order.source !== "supabase") {
      return NextResponse.json(
        { error: "Supabase no configurado" },
        { status: 500 }
      );
    }

    const deps = buildPaymentDeps();
    const result = await createPayment(deps, {
      orderId: order.id,
      method: "mercadopago",
      returnUrl: "/compra/exito",
    });

    await recordMercadoPagoCheckoutAttempt({
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentId: result.paymentId,
      providerReference: result.payment.providerReference,
      redirectUrl: result.redirectUrl,
    });

    return NextResponse.json({
      orderNumber: order.orderNumber,
      redirectUrl: result.redirectUrl,
      paymentId: result.paymentId,
      providerReference: result.payment.providerReference,
      provider: result.payment.provider,
    });
  } catch (error) {
    if (error instanceof MercadoPagoConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof OrderNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof UnsupportedProviderError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No pudimos iniciar Mercado Pago.",
      },
      { status: 500 }
    );
  }
}

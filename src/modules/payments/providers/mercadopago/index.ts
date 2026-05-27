import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { env } from "@/lib/env";
import type {
  PaymentProviderGateway,
  ProviderCheckoutInput,
  ProviderCheckoutResult,
} from "@/modules/payments/providers/types";

type MercadoPagoPreferenceBody = Parameters<Preference["create"]>[0]["body"];
export type MercadoPagoPayment = Awaited<ReturnType<Payment["get"]>>;

const CERTIFICATION_ITEM = {
  id: "1001",
  title: "Terminal móvil SMK",
  description: "Dispositivo de tienda móvil de comercio electrónico",
  quantity: 1,
  currency_id: "CLP",
  unit_price: 5000,
};

export class MercadoPagoConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MercadoPagoConfigurationError";
  }
}

function createMercadoPagoConfig() {
  if (!env.mercadoPagoAccessToken) {
    throw new MercadoPagoConfigurationError(
      "MERCADOPAGO_ACCESS_TOKEN no esta configurado."
    );
  }

  return new MercadoPagoConfig({
    accessToken: env.mercadoPagoAccessToken,
    options: {
      timeout: 10000,
      integratorId: env.mercadoPagoIntegratorId || undefined,
    },
  });
}

function assertPublicSiteUrl() {
  let siteUrl: URL;

  try {
    siteUrl = new URL(env.siteUrl);
  } catch {
    throw new MercadoPagoConfigurationError(
      "NEXT_PUBLIC_SITE_URL debe ser una URL absoluta publica para Mercado Pago."
    );
  }

  const hostname = siteUrl.hostname.toLowerCase();
  const isLocalhost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost");

  if (isLocalhost) {
    throw new MercadoPagoConfigurationError(
      "Mercado Pago requiere una URL publica para back_urls y notification_url. Configura NEXT_PUBLIC_SITE_URL con un dominio publico o un tunel HTTPS."
    );
  }
}

export function assertMercadoPagoCheckoutReady() {
  if (!env.mercadoPagoAccessToken) {
    throw new MercadoPagoConfigurationError(
      "MERCADOPAGO_ACCESS_TOKEN no esta configurado."
    );
  }

  if (!env.mercadoPagoIntegratorId) {
    throw new MercadoPagoConfigurationError(
      "MERCADOPAGO_INTEGRATOR_ID no esta configurado."
    );
  }

  if (!env.mercadoPagoCertificationExternalReferenceEmail) {
    throw new MercadoPagoConfigurationError(
      "MERCADOPAGO_CERTIFICATION_EXTERNAL_REFERENCE_EMAIL no esta configurado."
    );
  }

  assertPublicSiteUrl();
}

function buildAbsoluteUrl(path: string, searchParams?: Record<string, string>) {
  const url = new URL(path, env.siteUrl);

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

function buildReturnUrl(path: string, orderNumber: string) {
  return buildAbsoluteUrl(path, {
    order: orderNumber,
    provider: "mercadopago",
  });
}

function buildPayer(input: ProviderCheckoutInput) {
  if (!input.customerEmail) {
    return undefined;
  }

  return {
    email: input.customerEmail,
  };
}

export function getMercadoPagoCertificationExternalReference() {
  // Certification requires the email as external_reference. In production,
  // change this helper to return a stable order reference such as orderId or orderNumber.
  return env.mercadoPagoCertificationExternalReferenceEmail;
}

export async function getMercadoPagoPayment(paymentId: string) {
  const payment = new Payment(createMercadoPagoConfig());

  return payment.get({
    id: paymentId,
    requestOptions: {
      integratorId: env.mercadoPagoIntegratorId || undefined,
    },
  });
}

export const mercadoPagoPaymentProvider: PaymentProviderGateway = {
  name: "mercadopago",

  async createCheckout(
    input: ProviderCheckoutInput
  ): Promise<ProviderCheckoutResult> {
    assertMercadoPagoCheckoutReady();

    const preference = new Preference(createMercadoPagoConfig());
    const body: MercadoPagoPreferenceBody = {
      items: [
        {
          ...CERTIFICATION_ITEM,
          picture_url: buildAbsoluteUrl("/catalog/cutouts/107.png"),
        },
      ],
      payer: buildPayer(input),
      back_urls: {
        success: buildReturnUrl("/compra/exito", input.orderNumber),
        failure: buildReturnUrl("/compra/rechazada", input.orderNumber),
        pending: buildReturnUrl("/compra/pendiente", input.orderNumber),
      },
      auto_return: "approved",
      notification_url: buildAbsoluteUrl(
        "/api/payments/mercadopago/webhook",
        {
          source_news: "webhooks",
        }
      ),
      external_reference: getMercadoPagoCertificationExternalReference(),
      metadata: {
        order_id: input.orderId,
        order_number: input.orderNumber,
        local_payment_id: input.paymentId,
        provider: "mercadopago",
        certification: true,
      },
      payment_methods: {
        installments: 6,
        excluded_payment_methods: [{ id: "visa" }],
      },
      statement_descriptor: "SMK VENDING",
    };

    const createdPreference = await preference.create({
      body,
      requestOptions: {
        idempotencyKey: input.paymentId,
        integratorId: env.mercadoPagoIntegratorId || undefined,
      },
    });
    const redirectUrl =
      createdPreference.init_point ?? createdPreference.sandbox_init_point;

    if (!redirectUrl) {
      throw new Error("Mercado Pago no devolvio init_point para Checkout Pro.");
    }

    return {
      provider: "mercadopago",
      redirectUrl,
      providerReference: createdPreference.id ?? null,
    };
  },
};

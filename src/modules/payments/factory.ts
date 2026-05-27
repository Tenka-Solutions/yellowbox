import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isFlowConfigured, isMercadoPagoConfigured } from "@/lib/env";
import type { PaymentProvider } from "@/modules/payments/domain/payment";
import type { CreatePaymentDeps } from "@/modules/payments/use-cases/create-payment";
import { mockPaymentProvider } from "@/modules/payments/providers/mock";
import { flowPaymentProvider } from "@/modules/payments/providers/flow";
import { mercadoPagoPaymentProvider } from "@/modules/payments/providers/mercadopago";
import { createSupabasePaymentRepository } from "@/modules/payments/infra/supabase-payment-repository";
import { createSupabaseOrderLookup } from "@/modules/payments/infra/supabase-order-lookup";
import { createMemoryPaymentRepository } from "@/modules/payments/infra/memory-payment-repository";
import { createMemoryOrderLookup } from "@/modules/payments/infra/memory-order-lookup";

export function buildPaymentDeps(): CreatePaymentDeps {
  const adminClient = createSupabaseAdminClient();

  const providers: Partial<
    Record<PaymentProvider, CreatePaymentDeps["providers"][PaymentProvider]>
  > = {
    mock: mockPaymentProvider,
  };

  if (isFlowConfigured()) {
    providers.flow = flowPaymentProvider;
  }

  if (isMercadoPagoConfigured()) {
    providers.mercadopago = mercadoPagoPaymentProvider;
  }

  if (adminClient) {
    return {
      paymentRepository: createSupabasePaymentRepository(adminClient),
      orderLookup: createSupabaseOrderLookup(adminClient),
      providers,
    };
  }

  return {
    paymentRepository: createMemoryPaymentRepository(),
    orderLookup: createMemoryOrderLookup(),
    providers,
  };
}

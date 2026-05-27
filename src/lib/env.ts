function asBoolean(value: string | undefined, fallback = false) {
  if (!value) {
    return fallback;
  }

  return value === "true" || value === "1";
}

export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "SMK Vending",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  paymentsMode: process.env.PAYMENTS_MODE ?? "mock",
  getnetCommerceId: process.env.GETNET_COMMERCE_ID ?? "",
  getnetApiKey: process.env.GETNET_API_KEY ?? "",
  getnetApiUrl: process.env.GETNET_API_URL ?? "",
  getnetReturnUrl:
    process.env.GETNET_RETURN_URL ??
    "http://localhost:3000/api/payments/getnet/return",
  getnetWebhookUrl:
    process.env.GETNET_WEBHOOK_URL ??
    "http://localhost:3000/api/payments/getnet/webhook",
  flowApiKey: process.env.FLOW_API_KEY ?? "",
  flowSecretKey: process.env.FLOW_SECRET_KEY ?? "",
  flowApiUrl:
    process.env.FLOW_BASE_URL ??
    process.env.FLOW_API_URL ??
    "https://www.flow.cl/api",
  flowReturnUrl:
    process.env.FLOW_RETURN_URL ??
    "http://localhost:3000/api/payments/flow/return",
  flowConfirmUrl:
    process.env.FLOW_CONFIRMATION_URL ??
    process.env.FLOW_CONFIRM_URL ??
    "http://localhost:3000/api/payments/flow/webhook",
  mercadoPagoAccessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? "",
  mercadoPagoPublicKey: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? "",
  mercadoPagoIntegratorId: process.env.MERCADOPAGO_INTEGRATOR_ID ?? "",
  mercadoPagoCertificationExternalReferenceEmail:
    process.env.MERCADOPAGO_CERTIFICATION_EXTERNAL_REFERENCE_EMAIL ?? "",
  mercadoPagoWebhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "",
  adminPanelUrl:
    process.env.ADMIN_PANEL_URL ?? "http://localhost:3000/admin/pedidos",
  quoteToEmail: process.env.QUOTE_TO_EMAIL ?? "soporte@smkvending.cl",
  quoteFromEmail:
    process.env.QUOTE_FROM_EMAIL ??
    process.env.RESEND_FROM ??
    "no-reply@smkvending.cl",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: asBoolean(process.env.SMTP_SECURE),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  emailMode: process.env.EMAIL_MODE ?? "log",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFrom: process.env.RESEND_FROM ?? "no-reply@smkvending.cl",
  adminAllowedEmails:
    process.env.ADMIN_ALLOWED_EMAILS?.split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean) ?? [],
  isVercel: asBoolean(process.env.VERCEL),
};

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function isSupabaseAdminConfigured() {
  return Boolean(
    isSupabaseConfigured() && env.supabaseServiceRoleKey
  );
}

export function isResendConfigured() {
  return env.emailMode === "resend" && Boolean(env.resendApiKey);
}

export function isSmtpConfigured() {
  return (
    env.emailMode === "smtp" &&
    Boolean(env.smtpHost && env.smtpUser && env.smtpPass)
  );
}

export function isGetnetConfigured() {
  return (
    env.paymentsMode === "getnet" &&
    Boolean(env.getnetApiUrl && env.getnetApiKey && env.getnetCommerceId)
  );
}

export function isFlowConfigured() {
  return Boolean(env.flowApiKey && env.flowSecretKey && env.flowApiUrl);
}

export function isMercadoPagoConfigured() {
  return Boolean(env.mercadoPagoAccessToken);
}

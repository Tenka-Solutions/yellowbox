const REQUIRED_GROUPS = [
  {
    name: "Supabase",
    keys: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  },
  {
    name: "Flow",
    keys: ["FLOW_API_KEY", "FLOW_SECRET_KEY", "FLOW_CONFIRMATION_URL", "FLOW_RETURN_URL"],
  },
  {
    name: "Mercado Pago",
    keys: [
      "MERCADOPAGO_ACCESS_TOKEN",
      "MERCADOPAGO_INTEGRATOR_ID",
      "MERCADOPAGO_SUCCESS_URL",
      "MERCADOPAGO_FAILURE_URL",
      "MERCADOPAGO_PENDING_URL",
      "MERCADOPAGO_WEBHOOK_URL",
    ],
  },
  {
    name: "Frontend",
    keys: ["FRONTEND_SITE_URL"],
  },
  {
    name: "SMTP",
    keys: ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "QUOTE_TO_EMAIL"],
  },
  {
    name: "Admin API",
    keys: ["ADMIN_API_KEY"],
  },
];

function getMissingEnvKeys() {
  return REQUIRED_GROUPS.flatMap((group) =>
    group.keys
      .filter((key) => !process.env[key])
      .map((key) => ({ group: group.name, key }))
  );
}

function warnMissingEnv() {
  const missing = getMissingEnvKeys();

  if (missing.length === 0) {
    return;
  }

  const byGroup = missing.reduce((groups, item) => {
    groups[item.group] = groups[item.group] || [];
    groups[item.group].push(item.key);
    return groups;
  }, {});

  Object.entries(byGroup).forEach(([group, keys]) => {
    console.warn(`[hubcafe-backend:env] ${group} incompleto: ${keys.join(", ")}`);
  });
}

module.exports = {
  getMissingEnvKeys,
  warnMissingEnv,
};

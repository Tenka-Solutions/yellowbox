const express = require("express");
const { isSupabaseConfigured } = require("../lib/supabase-client");
const { isFlowConfigured } = require("../lib/flow-client");
const { isMercadoPagoConfigured } = require("../services/mercadopago.service");
const { isSmtpConfigured } = require("../lib/mailer");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "hubcafe-backend",
    supabaseConfigured: isSupabaseConfigured(),
    smtpConfigured: isSmtpConfigured(),
    flowConfigured: isFlowConfigured(),
    mercadoPagoConfigured: isMercadoPagoConfigured(),
  });
});

module.exports = router;

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const healthRoutes = require("./routes/health.routes");
const ordersRoutes = require("./routes/orders.routes");
const paymentsRoutes = require("./routes/payments.routes");
const productsRoutes = require("./routes/products.routes");
const quotesRoutes = require("./routes/quotes.routes");
const { warnMissingEnv } = require("./lib/env-check");

const app = express();
const PORT = Number(process.env.PORT || 3002);
const BASE_PATH = "/hubcafe-api";

function buildCorsOrigin() {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://hubcafe.cl";

  if (allowedOrigin === "*" || allowedOrigin === "true") {
    return true;
  }

  const allowed = allowedOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return (origin, callback) => {
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origen no permitido por CORS"));
  };
}

function mountRoutes(prefix) {
  app.use(prefix, healthRoutes);
  app.use(prefix, ordersRoutes);
  app.use(prefix, paymentsRoutes);
  app.use(prefix, productsRoutes);
  app.use(prefix, quotesRoutes);
}

app.disable("x-powered-by");
app.use(cors({ origin: buildCorsOrigin() }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

mountRoutes("");
mountRoutes(BASE_PATH);

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Ruta no encontrada", path: req.path });
});

app.use((error, _req, res, _next) => {
  const message = error instanceof Error ? error.message : "Error interno";
  const statusCode = Number(error.statusCode || error.status || 500);
  const publicMessage =
    error.publicMessage ||
    (process.env.NODE_ENV === "production"
      ? "Error interno del servidor"
      : message);

  console.error("[hubcafe-backend:error]", message);
  res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
    ok: false,
    error: publicMessage,
  });
});

warnMissingEnv();

app.listen(PORT, () => {
  console.log(`Hub Cafe backend escuchando en puerto ${PORT}`);
});

const express = require("express");
const productsRepository = require("../repositories/products.repository");
const { requireAdminApiKey } = require("../middleware/admin-api-key");

const router = express.Router();

router.get("/products", requireAdminApiKey, async (req, res, next) => {
  try {
    const products = await productsRepository.listProducts({
      q: req.query.q,
    });

    res.json({ ok: true, products });
  } catch (error) {
    next(error);
  }
});

router.patch("/products/:id/stock", requireAdminApiKey, async (req, res, next) => {
  try {
    const rawStock =
      req.body && (req.body.stock_quantity ?? req.body.stockQuantity ?? req.body.stock);
    const nextStock = Math.round(Number(rawStock));

    if (!Number.isFinite(nextStock) || nextStock < 0) {
      res.status(400).json({ ok: false, error: "stock_quantity invalido" });
      return;
    }

    const product = await productsRepository.updateProductStock(
      req.params.id,
      nextStock
    );

    if (!product) {
      res.status(404).json({ ok: false, error: "Producto no encontrado" });
      return;
    }

    res.json({ ok: true, product });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

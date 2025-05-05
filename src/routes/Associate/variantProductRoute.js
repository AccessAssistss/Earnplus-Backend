const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const {
  createVariantProduct,
  getAllVariantProductsByProduct,
  getVariantProductDetail,
} = require("../../controllers/Associate/variantProductController");

const router = express.Router();

router.post("/createVariantProduct", validateToken, createVariantProduct);
router.get(
  "/getAllVariantProductsByProduct/:productId",
  validateToken,
  getAllVariantProductsByProduct
);
router.get(
  "/getVariantProductDetail/:productId",
  validateToken,
  getVariantProductDetail
);

module.exports = router;

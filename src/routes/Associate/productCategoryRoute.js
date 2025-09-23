const express = require("express");
const {
  createProductCategory,
  updateProductCategory,
  getAllProductCategories,
  softDeleteProductCategory,
  createProductPurpose,
  updateProductPurpose,
  getProductPurposes,
  softDeleteProductPurpose,
} = require("../../controllers/Associate/productCategoryController");

const router = express.Router();

// ###############---------------Product Category Routes---------------###############
router.post("/createProductCategory", createProductCategory);
router.put("/updateProductCategory/:procuctCategoryId", updateProductCategory);
router.get("/getAllProductCategories", getAllProductCategories);
router.patch(
  "/softDeleteProductCategory/:procuctCategoryId",
  softDeleteProductCategory
);

// ###############---------------Product Purpose Routes---------------###############
router.post("/createProductPurpose", createProductPurpose);
router.put("/updateProductPurpose/:productPurposeId", updateProductPurpose);
router.get(
  "/getProductPurposes",
  getProductPurposes
);
router.patch(
  "/softDeleteProductPurpose/:productPurposeId",
  softDeleteProductPurpose
);

module.exports = router;

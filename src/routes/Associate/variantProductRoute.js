const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const {
  createVariantProduct,
  getAllVariantProductsByProduct,
  getVariantProductDetail,
  submitVariantProductUpdateRequest,
  approveVariantProductUpdateRequest,
  rejectVariantProductUpdateRequest,
  assignVariantProductToEmployer,
  getVariantProductVersions,
  getVariantProductVersionById,
  getAssignedVariantProducts,
  createVariantProductParameter,
  createVariantProductOtherCharges,
  createVariantProductRepayment,
} = require("../../controllers/Associate/variantProductController");

const router = express.Router();

router.post("/createVariantProduct", validateToken, createVariantProduct);
router.post("/createVariantProductParameter", validateToken, createVariantProductParameter);
router.post("/createVariantProductOtherCharges", validateToken, createVariantProductOtherCharges);
router.post("/createVariantProductRepayment", validateToken, createVariantProductRepayment);
router.post(
  "/submitVariantProductUpdateRequest",
  validateToken,
  submitVariantProductUpdateRequest
);
router.patch(
  "/approveVariantProductUpdateRequest/:requestId",
  validateToken,
  approveVariantProductUpdateRequest
);
router.patch(
  "/rejectVariantProductUpdateRequest/:requestId",
  validateToken,
  rejectVariantProductUpdateRequest
);
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
router.patch(
  "/assignVariantProductToEmployer",
  validateToken,
  assignVariantProductToEmployer
);
router.get(
  "/getAssignedVariantProducts/:employerId",
  validateToken,
  getAssignedVariantProducts
);
router.get(
  "/getVariantProductVersions/:variantProductId",
  validateToken,
  getVariantProductVersions
);
router.get(
  "/getVariantProductVersionById/:versionId",
  validateToken,
  getVariantProductVersionById
);

module.exports = router;

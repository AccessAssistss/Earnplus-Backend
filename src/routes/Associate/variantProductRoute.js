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
  createVariantProductDeleteRequest,
  getAssignedEmployers,
  handleVariantProductDeleteRequest,
  getAllVariantProductUpdateRequests,
  getVariantProductDeleteRequests,
  getVariantProductUpdateRequestDetail,
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
router.get(
  "/getAllVariantProductUpdateRequests",
  validateToken,
  getAllVariantProductUpdateRequests
);
router.get(
  "/getVariantProductUpdateRequestDetail",
  validateToken,
  getVariantProductUpdateRequestDetail
);
router.patch(
  "/rejectVariantProductUpdateRequest",
  validateToken,
  rejectVariantProductUpdateRequest
);
router.post(
  "/createVariantProductDeleteRequest",
  validateToken,
  createVariantProductDeleteRequest
);
router.patch(
  "/handleVariantProductDeleteRequest",
  validateToken,
  handleVariantProductDeleteRequest
);
router.get(
  "/getVariantProductDeleteRequests",
  validateToken,
  getVariantProductDeleteRequests
);
router.get(
  "/getAllVariantProductsByProduct/:productId",
  validateToken,
  getAllVariantProductsByProduct
);
router.get(
  "/getVariantProductDetail/:variantProductId",
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
  "/getAssignedEmployers/:variantId",
  validateToken,
  getAssignedEmployers
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

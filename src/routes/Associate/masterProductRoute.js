const express = require("express");
const {
  createMasterProduct,
  getAllMasterProducts,
  getMasterProductDetails,
  submitMasterProductUpdateRequest,
  approveMasterProductUpdateRequest,
  rejectMasterProductUpdateRequest,
  getMasterProductVersions,
  getMasterProductVersionById,
} = require("../../controllers/Associate/masterProductController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.post("/createMasterProduct", validateToken, createMasterProduct);
router.post("/submitMasterProductUpdateRequest", validateToken, submitMasterProductUpdateRequest);
router.patch("/approveMasterProductUpdateRequest/:requestId", validateToken, approveMasterProductUpdateRequest);
router.patch("/rejectMasterProductUpdateRequest/:requestId", validateToken, rejectMasterProductUpdateRequest);
router.get("/getAllMasterProducts", validateToken, getAllMasterProducts);
router.get("/getMasterProductDetails/:productId", validateToken, getMasterProductDetails);
router.get(
  "/getMasterProductVersions/:masterProductId",
  validateToken,
  getMasterProductVersions
);
router.get(
  "/getMasterProductVersionById/:versionId",
  validateToken,
  getMasterProductVersionById
);

module.exports = router;

const express = require("express");
const {
  createMasterProduct,
  getAllMasterProducts,
  getMasterProductDetails,
  submitMasterProductUpdateRequest,
  approveMasterProductUpdateRequest,
  rejectMasterProductUpdateRequest,
} = require("../../controllers/Associate/masterProductController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.post("/createMasterProduct", validateToken, createMasterProduct);
router.post("/submitMasterProductUpdateRequest", validateToken, submitMasterProductUpdateRequest);
router.patch("/approveMasterProductUpdateRequest/:updateRequestId", validateToken, approveMasterProductUpdateRequest);
router.patch("/rejectMasterProductUpdateRequest/:updateRequestId", validateToken, rejectMasterProductUpdateRequest);
router.get("/getAllMasterProducts", validateToken, getAllMasterProducts);
router.get("/getMasterProductDetails/:productId", validateToken, getMasterProductDetails);

module.exports = router;

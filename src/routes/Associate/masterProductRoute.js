const express = require("express");
const {
  createMasterProduct,
  createFinancialTerms,
  createEligibilityCriteria,
  createCreditBureauConfig,
  createFinancialStatements,
  createBehavioralData,
  createRiskScoring,
  createCollateral,
  getAllMasterProducts,
  getMasterProductDetails,
  submitMasterProductUpdateRequest,
  approveMasterProductUpdateRequest,
  rejectMasterProductUpdateRequest,
  getMasterProductVersions,
  getMasterProductVersionById,
  createMasterProductDeleteRequest,
  approveMasterProductDeleteRequest,
  rejectMasterProductDeleteRequest,
  getAllMasterProductUpdateRequests,
  createMasterProductOtherCharges,
  createMasterProductRepayment,
} = require("../../controllers/Associate/masterProductController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.post("/createMasterProduct", validateToken, createMasterProduct);
router.post("/createFinancialTerms", validateToken, createFinancialTerms);
router.post("/createEligibilityCriteria", validateToken, createEligibilityCriteria);
router.post("/createCreditBureauConfig", validateToken, createCreditBureauConfig);
router.post("/createFinancialStatements", validateToken, createFinancialStatements);
router.post("/createBehavioralData", validateToken, createBehavioralData);
router.post("/createRiskScoring", validateToken, createRiskScoring);
router.post("/createCollateral", validateToken, createCollateral);
router.post("/createMasterProductOtherCharges", validateToken, createMasterProductOtherCharges);
router.post("/createMasterProductRepayment", validateToken, createMasterProductRepayment);
router.post("/submitMasterProductUpdateRequest", validateToken, submitMasterProductUpdateRequest);
router.get("/getAllMasterProductUpdateRequests", validateToken, getAllMasterProductUpdateRequests);
router.patch("/approveMasterProductUpdateRequest/:requestId", validateToken, approveMasterProductUpdateRequest);
router.patch("/rejectMasterProductUpdateRequest/:requestId", validateToken, rejectMasterProductUpdateRequest);
router.post("/createMasterProductDeleteRequest", validateToken, createMasterProductDeleteRequest);
router.patch("/approveMasterProductDeleteRequest", validateToken, approveMasterProductDeleteRequest);
router.patch("/rejectMasterProductDeleteRequest", validateToken, rejectMasterProductDeleteRequest);
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

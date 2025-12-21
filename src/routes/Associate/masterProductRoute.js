const express = require("express");
const {
  createMasterProduct,
  createFinancialTerms,
  createEligibilityCriteria,
  createCreditBureauConfig,
  getAllMasterProducts,
  getMasterProductDetails,
  getMasterProductVersions,
  getMasterProductVersionById,
  createMasterProductOtherCharges,
  createMasterProductFields,
  createProductCreditAssignmentRule,
} = require("../../controllers/Associate/masterProductController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.post("/createMasterProduct", validateToken, createMasterProduct);
router.post("/createFinancialTerms", validateToken, createFinancialTerms);
router.post("/createEligibilityCriteria", validateToken, createEligibilityCriteria);
router.post("/createCreditBureauConfig", validateToken, createCreditBureauConfig);
router.post("/createMasterProductOtherCharges", validateToken, createMasterProductOtherCharges);
router.post("/createMasterProductFields", validateToken, createMasterProductFields);
router.post("/createProductCreditAssignmentRule", validateToken, createProductCreditAssignmentRule);
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

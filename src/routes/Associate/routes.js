const express = require("express");

const router = express.Router();

router.use("/auth", require("./authRoute"));
router.use("/location", require("./countryStateDistrictRoute"));
router.use("/industry", require("./industryTypeRoute"));
router.use("/contract", require("./contractTypeRoute"));
router.use("/associateSubAdmin", require("./associateSubAdminRoute"));
router.use("/roleModule", require("./roleModuleRoute"));
router.use("/productCategory", require("./productCategoryRoute"));
router.use("/segment", require("./segmentRoute"));
router.use("/loan", require("./loanTypeRoute"));
router.use("/partner", require("./partnerRoute"));
router.use("/disbursement", require("./disbursementModeRoute"));
router.use("/repayment", require("./repaymentRoute"));
router.use("/employment", require("./employmentTypeRoute"));
router.use("/document", require("./documentRoute"));
router.use("/scoreVariable", require("./scoreVariableRoute"));
router.use("/externalScore", require("./externalScoreRoute"));
router.use("/ownership", require("./ownershipDocumentRoute"));
router.use("/masterProduct", require("./masterProductRoute"));
router.use("/variantProduct", require("./variantProductRoute"));
router.use("/contractCombination", require("./contractCombinationRoute"));
router.use("/productAllocation", require("./productAllocationRoute"));
router.use("/CategorySubCategory", require("./queryCategorySubCategoryRoute"));
router.use("/query", require("./queryRoute"));
router.use("/field", require("./fieldRoute"));
router.use("/dropdown", require("./dropdownRoute"));
router.use("/subField", require("./subFieldRoute"));

module.exports = router;

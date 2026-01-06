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
router.use("/masterProduct", require("./masterProductRoute"));
router.use("/variantProduct", require("./variantProductRoute"));
router.use("/contractCombination", require("./contractCombinationRoute"));
router.use("/productAllocation", require("./productAllocationRoute"));
router.use("/assignmentRule", require("./assignmentRulesRoute"));
router.use("/quizCategory", require("./quizCategoryRoute"));
router.use("/quizQna", require("./quizQnaRoute"));
router.use("/deliveryChannel", require("./deliveryChannelRoute"));
router.use("/masterProductUpdateRequest", require("./masterProductUpdateRequestRoute"));
router.use("/masterProductDeleteRequest", require("./masterProductDeleteRequestRoute"));
router.use("/variantProductUpdateRequest", require("./variantProductUpdateRequestRoute"));
router.use("/variantProductDeleteRequest", require("./variantProductDeleteRequestRoute"));
router.use("/agreement", require("./agreementTemplateRoute"));

module.exports = router;

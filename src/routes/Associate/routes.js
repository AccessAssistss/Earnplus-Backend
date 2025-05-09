const express = require("express");

const router = express.Router();

router.use("/auth", require("./authRoute"));
router.use("/location", require("./countryStateDistrictRoute"));
router.use("/industry", require("./industryTypeRoute"));
router.use("/contract", require("./contractTypeRoute"));
router.use("/associateSubAdmin", require("./associateSubAdminRoute"));
router.use("/roleModule", require("./roleModuleRoute"));
router.use("/productCategory", require("./productCategoryRoute"));
router.use("/commonUseCase", require("./commonUseCaseRoute"));
router.use("/customerType", require("./customerTypeRoute"));
router.use("/masterProduct", require("./masterProductRoute"));
router.use("/variantProduct", require("./variantProductRoute"));
router.use("/contractCombination", require("./contractCombinationRoute"));

module.exports = router;

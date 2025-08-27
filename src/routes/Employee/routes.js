const express = require("express");

const router = express.Router();

router.use("/auth", require("./authRoute"));
router.use("/payroll", require("./payrollRoute"));
router.use("/kyc", require("./kycRoute"));
// router.use("/loan", require("./loanRoute"));
router.use("/faq", require("./faqRoute"));
router.use("/masterProduct", require("./masterProductRoute"));

module.exports = router;

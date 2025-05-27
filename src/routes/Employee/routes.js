const express = require("express");

const router = express.Router();

router.use("/auth", require("./authRoute"));
router.use("/payroll", require("./payrollRoute"));
router.use("/kyc", require("./kycRoute"));

module.exports = router;

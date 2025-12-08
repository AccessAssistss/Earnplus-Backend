const express = require("express");

const router = express.Router();

router.use("/loanApproval", require("./loanApprovalFlowRoute"));

module.exports = router;
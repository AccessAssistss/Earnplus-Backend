const express = require("express");

const router = express.Router();

router.use("/loanApproval", require("./loanApprovalFlowRoute"));
router.use("/vkyc", require("./vkycRoute"));
router.use("/credit", require("./creditRoute"));
router.use("/aggregator", require("./accountAggregatorRoute"));

module.exports = router;
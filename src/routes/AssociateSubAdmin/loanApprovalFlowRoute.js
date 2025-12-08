const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { processLoanApproval } = require("../../controllers/AssociateSubAdmin/loanApprovalFlowController");

const router = express.Router();

router.post("/processLoanApproval/:loanApplicationId", validateToken, processLoanApproval);

module.exports = router;

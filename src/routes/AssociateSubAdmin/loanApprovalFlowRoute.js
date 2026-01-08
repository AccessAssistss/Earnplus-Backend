const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { processLoanApproval, approveLoan, addLoanBankDetails } = require("../../controllers/AssociateSubAdmin/loanApprovalFlowController");

const router = express.Router();

router.post("/processLoanApproval/:loanApplicationId", validateToken, processLoanApproval);
router.post("/approveLoan/:loanApplicationId", validateToken, approveLoan);
router.post("/addLoanBankDetails/:loanApplicationId", validateToken, addLoanBankDetails);

module.exports = router;

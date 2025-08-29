const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { applyLoan, getLoansByCustomer, getLoansByAssociateSubadmin } = require("../../controllers/Employee/loanController");

const router = express.Router();

router.post("/applyLoan/:masterProductId", validateToken, applyLoan);
router.get("/getLoansByCustomer", validateToken, getLoansByCustomer);
router.get("/getLoansByAssociateSubadmin", validateToken, getLoansByAssociateSubadmin);

module.exports = router;

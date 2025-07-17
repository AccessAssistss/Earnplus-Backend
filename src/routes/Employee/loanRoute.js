const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { applyLoan, getAllLoans, approveCustomerDocuments, approveCoapplicantDocuments, approveGuarantorDocuments, approveLoanToCreditManager, getCoApplicantsByLoan, getLoanDetails } = require("../../controllers/Employee/loanController");

const router = express.Router();

router.post("/applyLoan", validateToken, applyLoan);
router.patch("/approveCustomerDocuments", validateToken, approveCustomerDocuments);
router.patch("/approveCoapplicantDocuments", validateToken, approveCoapplicantDocuments);
router.patch("/approveGuarantorDocuments", validateToken, approveGuarantorDocuments);
router.patch("/approveLoanToCreditManager", validateToken, approveLoanToCreditManager);
router.get("/getAllLoans", validateToken, getAllLoans);
router.get("/getLoanDetails/:loanId", validateToken, getLoanDetails);
router.get("/getCoApplicantsByLoan/:loanId", validateToken, getCoApplicantsByLoan);

module.exports = router;

const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { 
  applyLoan, 
  getMyPendingLoans, 
  uploadDocs, 
  processLoanApproval, 
  getLoanLogs, 
  getLoansDeatilsByCustomer, 
  getLoanHistoryByCustomer,
  getLoansByCustomer
} = require("../../controllers/Employee/loanController");
const multerErrorHandler = require("../../../middleware/multerErrorHandler");
const createUploadMiddleware = require("../../../middleware/upload");
const { LOAN_FILE_FIELDS } = require("../../../utils/fileFieldMapper");

const router = express.Router();

const uploadEmployerFiles = createUploadMiddleware("loan", LOAN_FILE_FIELDS);

router.post("/uploadDocs", validateToken, uploadEmployerFiles, multerErrorHandler, uploadDocs);
router.post("/applyLoan/:masterProductId", validateToken, applyLoan);
router.post("/processLoanApproval/:loanApplicationId", validateToken, processLoanApproval);
router.get("/getMyPendingLoans", validateToken, getMyPendingLoans);
router.get("/getLoansByCustomer", validateToken, getLoansByCustomer);
router.get("/getLoansDeatilsByCustomer/:loanApplicationId", validateToken, getLoansDeatilsByCustomer);
router.get("/getLoanHistoryByCustomer", validateToken, getLoanHistoryByCustomer);
router.get("/getLoanLogs/:loanApplicationId", validateToken, getLoanLogs);

module.exports = router;

const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const {
  applyLoan,
  getMyPendingLoans,
  uploadDocs,
  getLoanLogs,
  getLoansDeatilsByCustomer,
  getLoanHistoryByCustomer,
  getLoansByCustomer,
  uploadAdditionalLoanDoc
} = require("../../controllers/Employee/loanController");
const multerErrorHandler = require("../../../middleware/multerErrorHandler");
const createUploadMiddleware = require("../../../middleware/upload");
const { LOAN_FILE_FIELDS, ADDITIONAL_DOC } = require("../../../utils/fileFieldMapper");

const router = express.Router();

const uploadLoanDocFiles = createUploadMiddleware("loan", LOAN_FILE_FIELDS);
const uploadLoanAdditionalFiles = createUploadMiddleware("loan", ADDITIONAL_DOC);

router.post("/uploadDocs", validateToken, uploadLoanDocFiles, multerErrorHandler, uploadDocs);
router.post("/applyLoan/:masterProductId", validateToken, applyLoan);
router.get("/getMyPendingLoans", validateToken, getMyPendingLoans);
router.get("/getLoansByCustomer", validateToken, getLoansByCustomer);
router.get("/getLoansDeatilsByCustomer/:loanApplicationId", validateToken, getLoansDeatilsByCustomer);
router.get("/getLoanHistoryByCustomer", validateToken, getLoanHistoryByCustomer);
router.get("/getLoanLogs/:loanApplicationId", validateToken, getLoanLogs);
router.post("/uploadAdditionalLoanDoc", validateToken, uploadLoanAdditionalFiles, multerErrorHandler, uploadAdditionalLoanDoc);

module.exports = router;

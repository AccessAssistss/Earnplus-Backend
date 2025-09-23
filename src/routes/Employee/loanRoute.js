const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { applyLoan, getLoansByCustomer, getLoansByAssociateSubadmin, uploadDocs, assignLoanToCreditManager, approveLoanStep, rejectLoanByOpsManager, getLoanLogs, getLoansDeatilsByCustomer, getLoanHistoryByCustomer, assignToSeniorOps, approveBySeniorOps, approveByFinance, approveByOpsManager } = require("../../controllers/Employee/loanController");
const multerErrorHandler = require("../../../middleware/multerErrorHandler");
const createUploadMiddleware = require("../../../middleware/upload");
const { LOAN_FILE_FIELDS } = require("../../../utils/fileFieldMapper")

const router = express.Router();

const uploadEmployerFiles = createUploadMiddleware("loan", LOAN_FILE_FIELDS);

router.post(
    "/uploadDocs", validateToken, uploadEmployerFiles, multerErrorHandler, uploadDocs
);
router.post("/applyLoan/:masterProductId", validateToken, applyLoan);
router.post("/rejectLoanByOpsManager/:loanApplicationId", validateToken, rejectLoanByOpsManager);
router.post("/approveByOpsManager/:loanApplicationId", validateToken, approveByOpsManager);
router.post("/approveLoanStep/:loanApplicationId", validateToken, approveLoanStep);
router.post("/assignToSeniorOps/:loanApplicationId", validateToken, assignToSeniorOps);
router.post("/approveBySeniorOps/:loanApplicationId", validateToken, approveBySeniorOps);
router.post("/approveByFinance/:loanApplicationId", validateToken, approveByFinance);
router.get("/getLoansByCustomer", validateToken, getLoansByCustomer);
router.get("/getLoansDeatilsByCustomer/:loanApplicationId", validateToken, getLoansDeatilsByCustomer);
router.get("/getLoanHistoryByCustomer", validateToken, getLoanHistoryByCustomer);
router.get("/getLoansByAssociateSubadmin", validateToken, getLoansByAssociateSubadmin);
router.get("/getLoanLogs/:loanApplicationId", validateToken, getLoanLogs);

module.exports = router;

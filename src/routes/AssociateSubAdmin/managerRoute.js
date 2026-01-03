const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { getAppliedLoans, getVKYCPendingLoans, getManagerLoanHistory, getManagerDashboardStats, getLoanDetails, askAdditionalDocs } = require("../../controllers/AssociateSubAdmin/managerController");

const router = express.Router();

router.get("/getAppliedLoans", validateToken, getAppliedLoans);
router.get("/getVKYCPendingLoans", validateToken, getVKYCPendingLoans);
router.get("/getManagerLoanHistory", validateToken, getManagerLoanHistory);
router.get("/getManagerDashboardStats", validateToken, getManagerDashboardStats);
router.get("/getLoanDetails/:loanApplicationId", validateToken, getLoanDetails);
router.post("/askAdditionalDocs", validateToken, askAdditionalDocs);

module.exports = router;

const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { fetchCreditReportCustomer } = require("../../controllers/AssociateSubAdmin/creditController");

const router = express.Router();

router.post("/fetchCreditReportCustomer/:loanApplicationId", validateToken, fetchCreditReportCustomer);

module.exports = router;

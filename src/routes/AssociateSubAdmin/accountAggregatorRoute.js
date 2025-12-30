const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { createAARedirection, webhookHandler, getConsentData, fetchPeriodicData } = require("../../controllers/AssociateSubAdmin/accountAggregatorController");

const router = express.Router();

router.post("/createAARedirection/:loanApplicationId", validateToken, createAARedirection);
router.post("/getConsentData/:loanApplicationId", validateToken, getConsentData);
router.post("/fetchPeriodicData/:loanApplicationId", validateToken, fetchPeriodicData);
router.post("/webhook", webhookHandler);

module.exports = router;

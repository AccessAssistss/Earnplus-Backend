const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { createVKYCLinkForCustomer, getVKYCDataPointDetails, digitapWebhookHandler } = require("../../controllers/AssociateSubAdmin/vkycController.js");

const router = express.Router();

router.post("/createVKYCLinkForCustomer/:loanApplicationId", validateToken, createVKYCLinkForCustomer);
router.get("/getVKYCDataPointDetails/:loanApplicationId", validateToken, getVKYCDataPointDetails);
router.get("/getVKYCDataPointDetails/:loanApplicationId", validateToken, getVKYCDataPointDetails);
router.post("/webhook", digitapWebhookHandler);

module.exports = router;

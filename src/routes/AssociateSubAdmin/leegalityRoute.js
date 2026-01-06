const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { sendEsignDocumentToCustomer, leegalityWebhookHandler } = require("../../controllers/AssociateSubAdmin/leegalityController");
const { esignUpload } = require("../../../middleware/fileUpload");

const router = express.Router();

router.post("/sendEsignDocumentToCustomer/:loanApplicationId", validateToken, esignUpload.single("agreementPdf"), sendEsignDocumentToCustomer);
router.post("/webhook", leegalityWebhookHandler);

module.exports = router;
